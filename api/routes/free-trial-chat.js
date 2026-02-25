
/**
 * Free Trial Chat Routes
 * Handles chat operations for temporary/free trial users (no authentication required)
 */

import express from 'express';
import { db } from '../shared/db.js';
import { enqueueMessage } from '../shared/queue.js';
import { insertMessage, getRecentMessages } from '../shared/user.js';
import { hashUserId } from '../shared/hashUtils.js';
import { validationError, serverError, successResponse } from '../utils/responses.js';
import { logErrorFromCatch } from '../shared/errorLogger.js';
import { getLocalDateForTimezone } from '../shared/timezoneHelper.js';
import { generatePsychicOpening } from '../shared/opening.js';
import { guardName, getSeekerName } from '../shared/nameGuard.js';
import { freeTrialLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * POST /free-trial-chat/send
 * Send a chat message as a temp user (no authentication required)
 * 
 * Body: { tempUserId, message }
 * NOTE: No rate limiter for development
 */
router.post('/send', async (req, res) => {
  try {
    const { tempUserId, message } = req.body;

    // Validate input
    if (!tempUserId || !message) {
      return validationError(res, 'Missing required fields: tempUserId, message');
    }

    // Verify this is actually a temp user (either temp_ prefix or Firebase anonymous UID)
    // Firebase anonymous UIDs are alphanumeric strings without temp_ prefix
    const isValidTempUser = tempUserId.startsWith('temp_') || /^[a-zA-Z0-9]{20,}$/.test(tempUserId);
    if (!isValidTempUser) {
      return validationError(res, 'Invalid temp user ID');
    }

    // Verify free trial session exists and is not completed
    const userIdHash = hashUserId(tempUserId);
    const sessionCheck = await db.query(
      `SELECT id, is_completed FROM free_trial_sessions 
       WHERE user_id_hash = $1`,
      [userIdHash]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Free trial session not found. Please refresh the page.',
        code: 'SESSION_NOT_FOUND'
      });
    }

    if (sessionCheck.rows[0].is_completed) {
      return res.status(403).json({ 
        success: false, 
        error: 'Free trial already completed. Please sign up to continue.',
        code: 'TRIAL_COMPLETED'
      });
    }
    
    // Import synchronous processor
    const { processChatMessageSync } = await import('../services/chat/processor.js');
    
    // Process message synchronously
    const response = await processChatMessageSync(tempUserId, message);
    
    if (!response.success) {
      return serverError(res, response.error || 'Failed to process message');
    }
    
    return successResponse(res, {
      success: true,
      id: response.id,
      role: response.role,
      content: response.contentFull,
      contentBrief: response.contentBrief,
      responseType: response.responseType,
      createdAt: response.createdAt
    });
    
  } catch (err) {
    await logErrorFromCatch(err, 'free-trial-chat', 'Error sending message');
    return serverError(res, 'Failed to send message');
  }
});

/**
 * GET /free-trial-chat/history/:tempUserId
 * Get chat history for a temp user (no authentication required)
 * NOTE: No rate limiter for development
 */
router.get('/history/:tempUserId', async (req, res) => {
  try {
    const { tempUserId } = req.params;

    // Validate input
    if (!tempUserId) {
      return validationError(res, 'Missing tempUserId');
    }

    // Verify free trial session exists
    // Note: tempUserId is the Firebase UID for anonymous users, not prefixed with 'temp_'
    const userIdHash = hashUserId(tempUserId);
    const sessionCheck = await db.query(
      `SELECT id FROM free_trial_sessions WHERE user_id_hash = $1`,
      [userIdHash]
    );

    if (sessionCheck.rows.length === 0) {
      return validationError(res, 'Free trial session not found');
    }

    // Fetch messages from database - only user/assistant chat messages (exclude astrology)
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    const query = `SELECT 
      id, 
      role, 
      language_code,
      pgp_sym_decrypt(content_full_encrypted, $2)::text as content_full,
      pgp_sym_decrypt(content_brief_encrypted, $2)::text as brief_full
    FROM messages 
    WHERE user_id_hash = $1 
    AND role IN ('user', 'assistant')
    ORDER BY created_at ASC`;

    const { rows } = await db.query(query, [userIdHash, ENCRYPTION_KEY]);

    // Transform: format for frontend
    const transformedRows = rows.map(msg => {
      let fullContent = msg.content_full;
      let briefContent = msg.brief_full;

      // Parse JSON if valid
      try {
        if (fullContent && fullContent !== '{}' && fullContent !== null) {
          fullContent = JSON.parse(fullContent);
        }
      } catch (e) {
        // Keep as string if not JSON
      }
      try {
        if (briefContent && briefContent !== '{}') briefContent = JSON.parse(briefContent);
      } catch (e) {
        // Keep as string if not JSON
      }

      return {
        id: msg.id,
        role: msg.role,
        language_code: msg.language_code,
        content: fullContent || briefContent,
        brief_content: briefContent
      };
    });

    return successResponse(res, transformedRows);
  } catch (err) {
    await logErrorFromCatch(err, 'free-trial-chat', 'Error retrieving history');
    return serverError(res, 'Failed to retrieve message history');
  }
});

/**
 * GET /free-trial-chat/opening/:tempUserId
 * Generate opening message for temp user (no authentication required)
 * NOTE: No rate limiter for development
 */
router.get('/opening/:tempUserId', async (req, res) => {
  try {
    const { tempUserId } = req.params;
    // language and timezone query params sent by the client
    const { language: langParam, timezone: timezoneParam } = req.query;

    // Validate input
    if (!tempUserId) {
      return validationError(res, 'Missing tempUserId');
    }

    // Verify free trial session exists
    // Note: tempUserId is the Firebase UID for anonymous users, not prefixed with 'temp_'
    const userIdHash = hashUserId(tempUserId);
    const sessionCheck = await db.query(
      `SELECT id FROM free_trial_sessions WHERE user_id_hash = $1`,
      [userIdHash]
    );

    if (sessionCheck.rows.length === 0) {
      return validationError(res, 'Free trial session not found');
    }

    // Get user's local timezone date
    const { rows: tzRows } = await db.query(
      `SELECT timezone FROM user_preferences WHERE user_id_hash = $1`,
      [userIdHash]
    );
    // Prefer the client-sent timezone (browser local) because new temp users may have
    // UTC stored as default in user_preferences, which would produce wrong time-of-day
    // greetings.  Fall back to DB value, then UTC.
    const userTimezone = timezoneParam
      || (tzRows.length > 0 && tzRows[0].timezone)
      || 'UTC';
    const todayLocalDate = getLocalDateForTimezone(userTimezone);

    // Check if opening already exists for today
    const { rows: existingOpenings } = await db.query(
      `SELECT id, created_at FROM messages 
       WHERE user_id_hash = $1 
       AND role = 'assistant' 
       AND created_at_local_date = $2
       ORDER BY created_at ASC 
       LIMIT 1`,
      [userIdHash, todayLocalDate]
    );

    // If opening already exists, don't create a new one
    if (existingOpenings.length > 0) {
      return res.status(204).send(); // No content
    }

    // Fetch user's language preference.
    // Fall back to the ?language= query param sent by the mobile app so the
    // oracle greets in the correct language even before user_preferences is
    // fully propagated (e.g. race condition on the very first request).
    const { rows: prefRows } = await db.query(
      `SELECT language, oracle_language FROM user_preferences WHERE user_id_hash = $1`,
      [userIdHash]
    );
    const dbLanguage     = prefRows.length > 0 ? prefRows[0].language     : null;
    const dbOracleLang   = prefRows.length > 0 ? prefRows[0].oracle_language : null;
    const userLanguage   = dbLanguage   || langParam || 'en-US';
    const oracleLanguage = dbOracleLang || langParam || 'en-US';

    // Get recent messages
    const recentMessages = await getRecentMessages(tempUserId);

    // Get user's name (with temp user protection)
    let rawClientName = null;
    try {
      const { rows: personalInfoRows } = await db.query(
        "SELECT pgp_sym_decrypt(first_name_encrypted, $1) as first_name, pgp_sym_decrypt(familiar_name_encrypted, $1) as familiar_name FROM user_personal_info WHERE user_id = $2",
        [process.env.ENCRYPTION_KEY, tempUserId]
      );
      if (personalInfoRows.length > 0 && personalInfoRows[0]) {
        rawClientName = personalInfoRows[0].familiar_name || personalInfoRows[0].first_name;
      }
    } catch (err) {
      await logErrorFromCatch(err, 'free-trial-chat-opening', 'Error fetching user name');
      rawClientName = null;
    }

    // Apply name protection — for temp users, use the language-specific "Seeker" name
    // so the oracle addresses them in their preferred language (e.g., "Buscador" for Spanish)
    const baseName = guardName(rawClientName, true); // returns 'Seeker' for temp users
    const clientName = baseName === 'Seeker' ? getSeekerName(oracleLanguage) : baseName;

    // Generate opening with error handling
    let opening = '';
    try {
      opening = await generatePsychicOpening({
        clientName: clientName,
        recentMessages: recentMessages,
        oracleLanguage: oracleLanguage,
        userTimezone: userTimezone
      });
    } catch (openingErr) {
      await logErrorFromCatch(openingErr, 'free-trial-chat-opening', 'AI generation failed, using fallback');
      opening = ''; // Will use fallback below
    }

    // Fallback if AI generation fails or returns empty
    if (!opening || opening.trim() === '') {
      const localizedName = getSeekerName(oracleLanguage);
      opening = `Hi ${localizedName}, thank you for being here today. Before we begin, is there an area of your life you're hoping to get clarity on?`;
    }

    // Store opening as proper content object
    let openingContent = { text: opening };

    await insertMessage(tempUserId, 'assistant', openingContent, null, userTimezone);

    return successResponse(res, {
      role: 'assistant',
      content: opening
    });
  } catch (err) {
    await logErrorFromCatch(err, 'free-trial-chat', 'Error generating opening');
    return serverError(res, 'Failed to generate opening');
  }
});

export default router;
