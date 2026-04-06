/**
 * Free Trial — Session Service
 * Handles session creation, resumption, step updates, and retrieval.
 *
 * Access-control tiers:
 *   - Whitelisted IPs may create / reset unlimited sessions (testers / QA).
 *   - A non-whitelisted IP whose most recent session is COMPLETED and belongs to a
 *     different user_id_hash is blocked (the device has exhausted its free trial).
 *   - A non-whitelisted IP whose most recent session is INCOMPLETE from a different
 *     user_id_hash resumes that session with ownership transferred to the new hash
 *     (handles mobile app restarts where Firebase creates a new anonymous UID each
 *     cold start, so progress is preserved rather than restarting from scratch).
 *   - The same user_id_hash on any IP always resumes their own session.
 */

import crypto from 'crypto';
import { db } from '../../shared/db.js';
import { hashTempUserId, hashIpAddress } from '../../shared/hashUtils.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import { clearAstrologyMessages } from './astrologyService.js';

// ─── PRIVATE HELPERS ─────────────────────────────────────────────────────────

/**
 * Determine whether a new session should be created, resumed, blocked, or reset.
 * This is the access-control layer for session creation — all policy lives here.
 *
 * Possible actions:
 *   'create'       — no prior session; proceed to insert.
 *   'resume'       — same user_id_hash; preserves step progress (only resets
 *                    messages/started_at when step is still 'created').
 *   'resume-by-ip' — IP has incomplete session from a different user_id_hash
 *                    (mobile restart with new Firebase anon UID); transfer ownership.
 *   'block'        — IP has a COMPLETED session for a different user (trial used up).
 *   'reset'        — whitelisted tester with a completed session; wipe and restart.
 *
 * @param {string} ipHash     - Hashed IP address
 * @param {string} userIdHash - Hashed user ID
 * @returns {Promise<{ action: 'create'|'resume'|'resume-by-ip'|'block'|'reset', session?: Object }>}
 */
async function checkSessionAccess(ipHash, userIdHash) {
  // Only active whitelist entries grant privileges; inactive entries are ignored.
  const { rows: wlRows } = await db.query(
    'SELECT id FROM free_trial_whitelist WHERE ip_address_hash = $1 AND is_active = true',
    [ipHash]
  );
  const isWhitelisted = wlRows.length > 0;

  const { rows: ipRows } = await db.query(
    `SELECT id, current_step, is_completed, user_id_hash, started_at
     FROM free_trial_sessions
     WHERE ip_address_hash = $1
     ORDER BY started_at DESC
     LIMIT 1`,
    [ipHash]
  );

  if (ipRows.length > 0 && !isWhitelisted) {
    const session = ipRows[0];
    if (session.user_id_hash === userIdHash) return { action: 'resume', session };
    // Only block if the device has already COMPLETED a free trial.
    if (session.is_completed) return { action: 'block' };
    // Incomplete session from a different user_id_hash on the same IP.
    // This happens on mobile when the app restarts: Firebase creates a new
    // anonymous UID each cold start, producing a different user_id_hash.
    // Rather than creating a new session (which loses the progress), we
    // transfer ownership to the new user_id_hash so the user resumes exactly
    // where they left off (e.g. chat done → PersonalInfo screen).
    return { action: 'resume-by-ip', session };
  }

  const { rows: userRows } = await db.query(
    `SELECT id, current_step, is_completed
     FROM free_trial_sessions
     WHERE user_id_hash = $1
     LIMIT 1`,
    [userIdHash]
  );

  if (userRows.length > 0) {
    const session = userRows[0];
    if (isWhitelisted && session.is_completed) return { action: 'reset', session };
    return { action: 'resume', session };
  }

  return { action: 'create' };
}

/**
 * Write placeholder `user_personal_info` and `user_preferences` rows so the chat
 * handler always finds the user in the DB before they fill in their profile.
 * Throws on failure — callers should surface the error (chat won't work without this).
 *
 * @param {string} tempUserId        - Raw temporary user ID
 * @param {string} userIdHash        - Hashed user ID
 * @param {string} [language='en-US'] - Language selected on the landing screen
 */
async function initializeUserScaffold(tempUserId, userIdHash, language = 'en-US') {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('[SESSION-SERVICE] ENCRYPTION_KEY is not set — cannot initialize user scaffold');
  }

  // firstName / lastName columns have been dropped — scaffold row now only
  // stores the placeholder email, leaving all other PII columns NULL until
  // the user fills in their profile.
  await db.query(
    `INSERT INTO user_personal_info
     (user_id, email_encrypted, email_hash,
      birth_date_encrypted, birth_time_encrypted, birth_country_encrypted,
      birth_province_encrypted, birth_city_encrypted, birth_timezone_encrypted,
      sex_encrypted, familiar_name_encrypted, created_at, updated_at)
     VALUES ($1, pgp_sym_encrypt($2, $3), encode(digest(lower(trim($2)), 'sha256'), 'hex'),
             NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NOW(), NOW())
     ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()`,
    [tempUserId, `${tempUserId}@psychic.local`, key]
  );

  // Seed user_preferences so the oracle greeting and timezone queries work.
  // Store the landing-screen language so the oracle responds in that language
  // from the very first message.
  await db.query(
    `INSERT INTO user_preferences
     (user_id_hash, language, oracle_language, timezone, response_type, created_at, updated_at)
     VALUES ($1, $2, $2, 'UTC', 'full', NOW(), NOW())
     ON CONFLICT (user_id_hash) DO UPDATE SET
       language        = EXCLUDED.language,
       oracle_language = EXCLUDED.oracle_language,
       updated_at      = NOW()`,
    [userIdHash, language]
  );
}

/**
 * Upsert user_preferences with the given language.
 * Used by the resume and reset paths to ensure the row is always current.
 * INSERT … ON CONFLICT is required because a plain UPDATE is a silent no-op
 * when the row doesn't yet exist (e.g. the scaffold failed or was cleaned up).
 *
 * @param {string} userIdHash - Hashed user ID
 * @param {string} language   - BCP-47 language code
 */
async function upsertLanguagePreferences(userIdHash, language) {
  await db.query(
    `INSERT INTO user_preferences
     (user_id_hash, language, oracle_language, timezone, response_type, created_at, updated_at)
     VALUES ($1, $2, $2, 'UTC', 'full', NOW(), NOW())
     ON CONFLICT (user_id_hash) DO UPDATE SET
       language        = EXCLUDED.language,
       oracle_language = EXCLUDED.oracle_language,
       updated_at      = NOW()`,
    [userIdHash, language]
  );
}

// ─── EXPORTS ─────────────────────────────────────────────────────────────────

/**
 * Create (or resume) a free trial session for a temporary user.
 *
 * On first creation, placeholder `user_personal_info` and `user_preferences`
 * rows are written so the chat layer always finds the user in the DB.
 *
 * @param {string} tempUserId         - Temporary user ID
 * @param {string} ipAddress          - Client IP address
 * @param {string} [language='en-US'] - Language selected on the landing screen
 * @returns {Promise<Object>} Session data or error descriptor
 */
export async function createFreeTrialSession(tempUserId, ipAddress, language = 'en-US') {
  if (!tempUserId || !ipAddress) {
    return { success: false, error: 'Missing required parameters' };
  }

  try {
    const ipHash     = hashIpAddress(ipAddress);
    const userIdHash = hashTempUserId(tempUserId);

    const { action, session } = await checkSessionAccess(ipHash, userIdHash);

    if (action === 'block') {
      return {
        success:        false,
        error:          'This device has already started a free trial',
        alreadyStarted: true,
      };
    }

    if (action === 'resume-by-ip') {
      const oldUserIdHash = session.user_id_hash;

      // ── Transfer session ownership to the new user_id_hash ─────────────────
      // Update the session row so future checkSession(newUID) lookups find it.
      try {
        await db.query(
          `UPDATE free_trial_sessions
           SET user_id_hash         = $1,
               ip_address_hash      = $2,
               ip_address_encrypted = pgp_sym_encrypt($3, $4),
               started_at           = NOW(),
               last_activity_at     = NOW()
           WHERE id = $5`,
          [userIdHash, ipHash, ipAddress, process.env.ENCRYPTION_KEY, session.id]
        );
      } catch (err) {
        logErrorFromCatch(err, 'free-trial', '[SESSION-SERVICE] Failed to update user_id_hash on resume-by-ip');
      }

      // ── Migrate astrology data to the new hash ─────────────────────────────
      // Preserves zodiac sign / birth chart so the horoscope screen still works
      // when the user restarts after completing personal info.
      try {
        await db.query(
          `UPDATE user_astrology SET user_id_hash = $1 WHERE user_id_hash = $2`,
          [userIdHash, oldUserIdHash]
        );
      } catch (err) {
        logErrorFromCatch(err, 'free-trial', '[SESSION-SERVICE] Failed to migrate user_astrology on resume-by-ip');
      }

      // ── Initialize scaffold + preferences for new user_id ──────────────────
      await upsertLanguagePreferences(userIdHash, language);
      try {
        await initializeUserScaffold(tempUserId, userIdHash, language);
      } catch (err) {
        logErrorFromCatch(err, 'free-trial', '[SESSION-SERVICE] Failed to init scaffold on resume-by-ip');
      }

      return {
        success:     true,
        sessionId:   session.id,
        currentStep: session.current_step,
        resuming:    true,
        message:     'Session ownership transferred to new device session',
      };
    }

    if (action === 'resume') {
      // ── Preserve progress beyond 'created' ───────────────────────────────
      // If the user has already completed the free chat (step = 'chat') or
      // gone further, preserve that progress so the navigator routes them to
      // the correct next screen (e.g. PersonalInfo, Horoscope).
      //
      // Only reset messages/started_at when step is still 'created', i.e. the
      // user never actually completed a chat exchange — in that case they get a
      // fresh oracle greeting.
      const currentStep = session.current_step || 'created';
      const hasProgress = !session.is_completed && currentStep !== 'created';

      if (!session.is_completed && !hasProgress) {
        // Step is 'created' — chat hasn't happened yet.  Reset the session
        // clock so time-based message filters exclude stale greetings, and
        // wipe any orphaned messages so the oracle generates a fresh opening.
        try {
          await db.query(
            `UPDATE free_trial_sessions
             SET started_at       = NOW(),
                 last_activity_at = NOW()
             WHERE user_id_hash = $1`,
            [userIdHash]
          );
        } catch (err) {
          logErrorFromCatch(err, 'free-trial', '[SESSION-SERVICE] Failed to reset started_at on resume');
        }
        try {
          await db.query(
            `DELETE FROM messages
             WHERE user_id_hash = $1
             AND role IN ('user', 'assistant')`,
            [userIdHash]
          );
        } catch (err) {
          logErrorFromCatch(err, 'free-trial', '[SESSION-SERVICE] Failed to clear chat messages on resume');
        }
      }

      await upsertLanguagePreferences(userIdHash, language);
      return {
        success:     true,
        sessionId:   session.id,
        currentStep: session.is_completed ? session.current_step : currentStep,
        isCompleted: session.is_completed,
        resuming:    true,
        message:     session.is_completed
          ? 'Trial already completed'
          : hasProgress
            ? `Resuming from step: ${currentStep}`
            : 'Starting fresh: previous chat cleared',
      };
    }

    if (action === 'reset') {
      const { rows } = await db.query(
        `UPDATE free_trial_sessions
         SET current_step         = 'created',
             is_completed         = false,
             completed_at         = NULL,
             started_at           = NOW(),
             last_activity_at     = NOW(),
             ip_address_hash      = $2,
             ip_address_encrypted = pgp_sym_encrypt($3, $4)
         WHERE user_id_hash = $1
         RETURNING id, current_step, started_at`,
        [userIdHash, ipHash, ipAddress, process.env.ENCRYPTION_KEY]
      );

      await upsertLanguagePreferences(userIdHash, language);

      // CRITICAL: Wipe ALL stale messages (chat + astrology) and astrology profile
      // so the tester gets a completely clean slate on each new run.
      await clearAstrologyMessages(userIdHash);
      try {
        await db.query(
          `DELETE FROM messages
           WHERE user_id_hash = $1
           AND role IN ('user', 'assistant')`,
          [userIdHash]
        );
      } catch (err) {
        logErrorFromCatch(err, 'free-trial', '[SESSION-SERVICE] Failed to clear chat messages on reset');
      }
      try {
        await db.query(`DELETE FROM user_astrology WHERE user_id_hash = $1`, [userIdHash]);
      } catch (err) {
        logErrorFromCatch(err, 'free-trial', '[SESSION-SERVICE] Failed to clear user_astrology on reset');
      }

      return {
        success:     true,
        sessionId:   rows[0].id,
        currentStep: rows[0].current_step,
        startedAt:   rows[0].started_at,
        resuming:    false,
        message:     'Session reset for whitelisted tester',
      };
    }

    // action === 'create' — brand-new session
    const sessionId = crypto.randomUUID();

    const { rows } = await db.query(
      `INSERT INTO free_trial_sessions
       (id, ip_address_hash, ip_address_encrypted, user_id_hash, current_step, is_completed, started_at, last_activity_at)
       VALUES ($1, $2, pgp_sym_encrypt($3, $7), $4, $5, $6, NOW(), NOW())
       RETURNING id, current_step, started_at`,
      [sessionId, ipHash, ipAddress, userIdHash, 'created', false, process.env.ENCRYPTION_KEY]
    );

    await initializeUserScaffold(tempUserId, userIdHash, language);

    return {
      success:     true,
      sessionId:   rows[0].id,
      currentStep: rows[0].current_step,
      startedAt:   rows[0].started_at,
    };
  } catch (err) {
    // Duplicate-key errors are expected under race conditions — suppress them
    if (!err.message?.includes('duplicate key')) {
      logErrorFromCatch(err, 'free-trial', '[SESSION-SERVICE] Error creating session');
    }
    return { success: false, error: 'Unable to create session' };
  }
}

/**
 * Advance (or set) the current step for a free trial session.
 * Steps 'completed' and 'horoscope' also mark the session as done.
 *
 * @param {string} tempUserId - Temporary user ID
 * @param {string} newStep    - 'chat' | 'personal_info' | 'horoscope' | 'completed'
 * @returns {Promise<Object>} Updated session data or error descriptor
 */
export async function updateFreeTrialStep(tempUserId, newStep) {
  if (!tempUserId || !newStep) {
    return { success: false, error: 'Missing required parameters' };
  }

  try {
    const userIdHash  = hashTempUserId(tempUserId);
    const isCompleted = newStep === 'completed' || newStep === 'horoscope';

    const { rows } = await db.query(
      `UPDATE free_trial_sessions
       SET current_step     = $1,
           is_completed     = $2,
           completed_at     = CASE WHEN $2 = true THEN NOW() ELSE completed_at END,
           last_activity_at = NOW()
       WHERE user_id_hash = $3
       RETURNING id, current_step, is_completed, completed_at, last_activity_at`,
      [newStep, isCompleted, userIdHash]
    );

    if (rows.length === 0) return { success: false, error: 'Session not found' };

    return {
      success:        true,
      sessionId:      rows[0].id,
      currentStep:    rows[0].current_step,
      isCompleted:    rows[0].is_completed,
      completedAt:    rows[0].completed_at,
      lastActivityAt: rows[0].last_activity_at,
    };
  } catch (err) {
    logErrorFromCatch(err, 'free-trial', '[SESSION-SERVICE] Error updating step');
    return { success: false, error: 'Unable to update progress' };
  }
}

/**
 * Mark a free trial session as completed.
 * Thin semantic wrapper around `updateFreeTrialStep` for call-site clarity.
 *
 * @param {string} tempUserId - Temporary user ID
 * @returns {Promise<Object>} Completion data or error descriptor
 */
export function completeFreeTrialSession(tempUserId) {
  if (!tempUserId) return Promise.resolve({ success: false, error: 'Missing required parameters' });
  return updateFreeTrialStep(tempUserId, 'completed');
}

/**
 * Fetch the current free trial session for a user.
 *
 * @param {string} tempUserId - Temporary user ID
 * @returns {Promise<Object>} Session data or error descriptor
 */
export async function getFreeTrialSession(tempUserId) {
  if (!tempUserId) return { success: false, error: 'Missing required parameters' };

  try {
    const userIdHash = hashTempUserId(tempUserId);

    const { rows } = await db.query(
      `SELECT id, current_step, is_completed, started_at, completed_at, last_activity_at
       FROM free_trial_sessions
       WHERE user_id_hash = $1`,
      [userIdHash]
    );

    if (rows.length === 0) return { success: false, error: 'Session not found', notFound: true };

    return {
      success:        true,
      sessionId:      rows[0].id,
      currentStep:    rows[0].current_step,
      isCompleted:    rows[0].is_completed,
      startedAt:      rows[0].started_at,
      completedAt:    rows[0].completed_at,
      lastActivityAt: rows[0].last_activity_at,
    };
  } catch (err) {
    logErrorFromCatch(err, 'free-trial', '[SESSION-SERVICE] Error retrieving session');
    return { success: false, error: 'Unable to retrieve session' };
  }
}
