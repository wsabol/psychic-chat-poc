/**
 * Free Trial Routes
 * Handles free trial session management and progress tracking
 */

import express from 'express';
import { db } from '../shared/db.js';
import {
  createFreeTrialSession,
  updateFreeTrialStep,
  completeFreeTrialSession,
  getFreeTrialSession
} from '../shared/freeTrialUtils.js';
import { logErrorFromCatch } from '../shared/errorLogger.js';
import { serverError, validationError } from '../utils/responses.js';
import { hashUserId } from '../shared/hashUtils.js';
import { enqueueMessage } from '../shared/queue.js';
import { validateAge } from '../shared/ageValidator.js';
import { handleAgeViolation } from '../shared/violationHandler.js';
import { forbiddenError } from '../utils/responses.js';
import { calculateSunSignFromDate } from '../shared/zodiacUtils.js';

const router = express.Router();

function parseDateForStorage(dateString) {
    if (!dateString) return null;
    try {
        const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
        const trimmed = dateString.trim();
        if (isoRegex.test(trimmed)) {
            return trimmed;
        }
        return null;
    } catch (e) {
        return null;
    }
}

/**
 * POST /free-trial/create-session
 * Create a new free trial session for temp user
 * 
 * Body: { tempUserId }
 * Headers: x-client-ip (or from request)
 */
router.post('/create-session', async (req, res) => {
  try {
    const { tempUserId } = req.body;
    
    if (!tempUserId) {
      return validationError(res, 'Missing required information');
    }

    // Get client IP from request
    const clientIp = req.headers['x-client-ip'] || 
                     req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                     req.connection.remoteAddress ||
                     req.socket.remoteAddress;

    const result = await createFreeTrialSession(tempUserId, clientIp, db);

    if (!result.success) {
      if (result.alreadyCompleted) {
        return res.status(429).json({ 
          error: 'Free trial access has been used from this location',
          alreadyCompleted: true 
        });
      }
      // Log detailed error but return generic message
      await logErrorFromCatch(new Error(result.error), 'free-trial', 'Session creation failed');
      return serverError(res, 'Unable to start free trial session');
    }

    return res.json(result);
  } catch (err) {
    await logErrorFromCatch(err, 'free-trial', 'Error creating session');
    return serverError(res, 'Unable to start free trial session');
  }
});

/**
 * POST /free-trial/update-step/:tempUserId
 * Update current step in free trial progress
 * 
 * Body: { step: 'chat' | 'personal_info' | 'horoscope' | 'completed' }
 */
router.post('/update-step/:tempUserId', async (req, res) => {
  try {
    const { tempUserId } = req.params;
    const { step } = req.body;

    if (!tempUserId || !step) {
      return validationError(res, 'Missing required information');
    }

    const validSteps = ['chat', 'personal_info', 'horoscope', 'completed'];
    if (!validSteps.includes(step)) {
      return validationError(res, 'Invalid step value');
    }

    const result = await updateFreeTrialStep(tempUserId, step, db);

    if (!result.success) {
      // Log detailed error but return generic message
      await logErrorFromCatch(new Error(result.error), 'free-trial', 'Step update failed');
      return serverError(res, 'Unable to update trial progress');
    }

    return res.json(result);
  } catch (err) {
    await logErrorFromCatch(err, 'free-trial', 'Error updating step');
    return serverError(res, 'Unable to update trial progress');
  }
});

/**
 * POST /free-trial/complete/:tempUserId
 * Mark free trial as completed
 */
router.post('/complete/:tempUserId', async (req, res) => {
  try {
    const { tempUserId } = req.params;

    if (!tempUserId) {
      return validationError(res, 'Missing required information');
    }

    const result = await completeFreeTrialSession(tempUserId, db);

    if (!result.success) {
      // Log detailed error but return generic message
      await logErrorFromCatch(new Error(result.error), 'free-trial', 'Completion failed');
      return serverError(res, 'Unable to complete trial session');
    }

    return res.json(result);
  } catch (err) {
    await logErrorFromCatch(err, 'free-trial', 'Error completing session');
    return serverError(res, 'Unable to complete trial session');
  }
});

/**
 * GET /free-trial/session/:tempUserId
 * Get current free trial session info
 */
router.get('/session/:tempUserId', async (req, res) => {
  try {
    const { tempUserId } = req.params;

    if (!tempUserId) {
      return validationError(res, 'Missing required information');
    }

    const result = await getFreeTrialSession(tempUserId, db);

    if (!result.success) {
      if (result.notFound) {
        return res.status(404).json({ error: 'Session not found' });
      }
      // Log detailed error but return generic message
      await logErrorFromCatch(new Error(result.error), 'free-trial', 'Session retrieval failed');
      return serverError(res, 'Unable to retrieve trial session');
    }

    return res.json(result);
  } catch (err) {
    await logErrorFromCatch(err, 'free-trial', 'Error retrieving session');
    return serverError(res, 'Unable to retrieve trial session');
  }
});

/**
 * POST /free-trial/save-personal-info/:tempUserId
 * Save personal information for free trial users (no authentication required)
 * This endpoint allows temp users to save their personal info without Firebase auth tokens
 * 
 * Body: { firstName, lastName, email, birthDate, birthTime, birthCountry, birthProvince, birthCity, birthTimezone, sex, addressPreference, zodiacSign, astrologyData }
 */
router.post('/save-personal-info/:tempUserId', async (req, res) => {
  try {
    const { tempUserId } = req.params;
    const { firstName, lastName, email, birthDate, birthTime, birthCountry, birthProvince, birthCity, birthTimezone, sex, addressPreference, zodiacSign, astrologyData } = req.body;

    // Validate required fields for temp users
    if (!tempUserId) {
      return validationError(res, 'User ID is required');
    }

    // Temp users have relaxed requirements - only email and birthDate are required
    if (!email || !birthDate) {
      return validationError(res, 'Missing required fields: email, birthDate');
    }

    // Note: This endpoint is specifically for free trial users
    // No additional validation needed - if they can call this endpoint, they're in the free trial flow

    const parsedBirthDate = parseDateForStorage(birthDate);
    
    if (!parsedBirthDate || parsedBirthDate === 'Invalid Date') {
      return validationError(res, 'Invalid birth date format');
    }

    // Age validation (18+ requirement)
    const ageValidation = validateAge(parsedBirthDate);
    if (!ageValidation.isValid) {
      return validationError(res, ageValidation.error + ' (This app requires users to be 18 years or older)');
    }

    if (!ageValidation.isAdult) {
      const violationResult = await handleAgeViolation(tempUserId, ageValidation.age);

      if (violationResult.deleted) {
        return forbiddenError(res, violationResult.error);
      } else {
        return forbiddenError(res, violationResult.message);
      }
    }

    // Prepare safe values
    const safeTime = birthTime && birthTime.trim() ? birthTime : null;
    const safeCountry = birthCountry && birthCountry.trim() ? birthCountry : null;
    const safeProvince = birthProvince && birthProvince.trim() ? birthProvince : null;
    const safeCity = birthCity && birthCity.trim() ? birthCity : null;
    const safeTimezone = birthTimezone && birthTimezone.trim() ? birthTimezone : null;
    const safeAddressPreference = addressPreference && addressPreference.trim() ? addressPreference : null;

    // Apply temp account defaults
    const safeFirstName = firstName || 'Seeker';
    const safeLastName = lastName || 'Soul';
    const safeSex = sex || 'Unspecified';

    // Save personal information
    await db.query(
      `INSERT INTO user_personal_info 
       (user_id, first_name_encrypted, last_name_encrypted, email_encrypted, birth_date_encrypted, birth_time_encrypted, birth_country_encrypted, birth_province_encrypted, birth_city_encrypted, birth_timezone_encrypted, sex_encrypted, familiar_name_encrypted)
       VALUES ($2, pgp_sym_encrypt($3, $1), pgp_sym_encrypt($4, $1), pgp_sym_encrypt($5, $1), pgp_sym_encrypt($6, $1), pgp_sym_encrypt($7, $1), pgp_sym_encrypt($8, $1), pgp_sym_encrypt($9, $1), pgp_sym_encrypt($10, $1), pgp_sym_encrypt($11, $1), pgp_sym_encrypt($12, $1), pgp_sym_encrypt($13, $1))
       ON CONFLICT (user_id) DO UPDATE SET
       first_name_encrypted = EXCLUDED.first_name_encrypted,
       last_name_encrypted = EXCLUDED.last_name_encrypted,
       email_encrypted = EXCLUDED.email_encrypted,
       birth_date_encrypted = EXCLUDED.birth_date_encrypted,
       birth_time_encrypted = EXCLUDED.birth_time_encrypted,
       birth_country_encrypted = EXCLUDED.birth_country_encrypted,
       birth_province_encrypted = EXCLUDED.birth_province_encrypted,
       birth_city_encrypted = EXCLUDED.birth_city_encrypted,
       birth_timezone_encrypted = EXCLUDED.birth_timezone_encrypted,
       sex_encrypted = EXCLUDED.sex_encrypted,
       familiar_name_encrypted = EXCLUDED.familiar_name_encrypted,
       updated_at = CURRENT_TIMESTAMP`,
      [process.env.ENCRYPTION_KEY, tempUserId, safeFirstName, safeLastName, email, parsedBirthDate, safeTime, safeCountry, safeProvince, safeCity, safeTimezone, safeSex, safeAddressPreference]
    );

    // Verify data was saved
    const { rows: verifyRows } = await db.query(
      `SELECT user_id FROM user_personal_info WHERE user_id = $1`,
      [tempUserId]
    );

    if (verifyRows.length === 0) {
      return serverError(res, 'Failed to confirm personal information was saved');
    }

    const userIdHash = hashUserId(tempUserId);
    
    // Store email in free_trial_sessions for marketing follow-up
    if (email) {
      try {
        await db.query(
          `UPDATE free_trial_sessions 
           SET email_encrypted = pgp_sym_encrypt($1, $2)
           WHERE user_id_hash = $3`,
          [email, process.env.ENCRYPTION_KEY, userIdHash]
        );
      } catch (err) {
        // Non-fatal: Log error but continue
        console.error('[FREE-TRIAL] Failed to update trial session email:', err.message);
      }
    }
    
    // Calculate and store sun sign immediately
    try {
      const sunSign = calculateSunSignFromDate(parsedBirthDate);
      if (sunSign) {
        const minimalAstrologyData = {
          sun_sign: sunSign,
          sun_degree: 0,
          moon_sign: null,
          moon_degree: null,
          rising_sign: null,
          rising_degree: null,
          calculated_at: new Date().toISOString()
        };
        
        await db.query(
          `INSERT INTO user_astrology (user_id_hash, zodiac_sign, astrology_data)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id_hash) DO UPDATE SET
           zodiac_sign = EXCLUDED.zodiac_sign,
           astrology_data = EXCLUDED.astrology_data,
           updated_at = CURRENT_TIMESTAMP`,
          [userIdHash, sunSign, JSON.stringify(minimalAstrologyData)]
        );
      }
    } catch (err) {
      // Non-fatal: continue anyway
      console.error('[FREE-TRIAL] Failed to save minimal astrology:', err.message);
    }
    
    // Clear old astrology messages
    try {
      await db.query(
        `DELETE FROM messages 
         WHERE user_id_hash = $1 
         AND role IN ('horoscope', 'moon_phase', 'cosmic_weather', 'void_of_course', 'lunar_nodes')`,
        [userIdHash]
      );
    } catch (err) {
      // Non-fatal
    }
    
    // Enqueue worker to calculate full birth chart if complete location data provided
    if (safeTime && safeCountry && safeProvince && safeCity && parsedBirthDate) {
      try {
        // Delay to ensure write is fully propagated
        const delayMs = 1000;
        await new Promise(resolve => setTimeout(resolve, delayMs));
        
        await enqueueMessage({
          userId: tempUserId,
          message: '[SYSTEM] Calculate my birth chart with rising sign and moon sign.'
        });
      } catch (err) {
        // Non-fatal
        console.error('[FREE-TRIAL] Failed to enqueue astrology calculation:', err.message);
      }
    }

    // If full astrology data provided
    if (zodiacSign && astrologyData) {
      await db.query(
        `INSERT INTO user_astrology 
         (user_id_hash, zodiac_sign, astrology_data)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id_hash) DO UPDATE SET
         zodiac_sign = EXCLUDED.zodiac_sign,
         astrology_data = EXCLUDED.astrology_data,
         updated_at = CURRENT_TIMESTAMP`,
        [userIdHash, zodiacSign, JSON.stringify(astrologyData)]
      );
    }

    return res.json({ success: true, message: "Personal information saved successfully" });
  } catch (err) {
    await logErrorFromCatch(err, 'free-trial', 'Error saving personal info');
    return serverError(res, 'Failed to save personal information');
  }
});

export default router;
