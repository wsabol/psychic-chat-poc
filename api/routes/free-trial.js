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
import { serverError, validationError, forbiddenError, rateLimitError, notFoundError, successResponse } from '../utils/responses.js';
import { hashUserId } from '../shared/hashUtils.js';
import { validateAge } from '../shared/ageValidator.js';
import { handleAgeViolation } from '../shared/violationHandler.js';
import { parseDateForStorage, isValidFreeTrialStep } from '../shared/validationUtils.js';
import {
  extractClientIp,
  sanitizePersonalInfo,
  processPersonalInfoSave
} from '../services/freeTrialService.js';
import { freeTrialSessionLimiter, freeTrialLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * GET /free-trial/check-session/:tempUserId
 * Check if a session exists without creating one
 * NOTE: No rate limiter for development
 */
router.get('/check-session/:tempUserId', async (req, res) => {
  try {
    const { tempUserId } = req.params;
    
    if (!tempUserId) {
      return validationError(res, 'Missing required information');
    }

    const result = await getFreeTrialSession(tempUserId, db);

    if (!result.success) {
      if (result.notFound) {
        return res.json({ exists: false });
      }
      return serverError(res, 'Unable to check session');
    }

    return res.json({
      exists: true,
      sessionId: result.sessionId,
      currentStep: result.currentStep,
      isCompleted: result.isCompleted
    });
  } catch (err) {
    await logErrorFromCatch(err, 'free-trial', 'Error checking session');
    return serverError(res, 'Unable to check session');
  }
});

/**
 * POST /free-trial/create-session
 * Create a new free trial session for temp user
 * 
 * Body: { tempUserId }
 * Headers: x-client-ip (or from request)
 * 
 * NOTE: No rate limiter on this endpoint for development
 * Production uses IP-based device tracking in createFreeTrialSession()
 */
router.post('/create-session', async (req, res) => {
  try {
    const { tempUserId } = req.body;
    
    if (!tempUserId) {
      return validationError(res, 'Missing required information');
    }

    // Get client IP from request
    const clientIp = extractClientIp(req);

    const result = await createFreeTrialSession(tempUserId, clientIp, db);

    if (!result.success) {
      // Handle different types of trial restrictions
      if (result.alreadyCompleted) {
        return rateLimitError(res, 3600);
      }
      if (result.alreadyStarted) {
        // Device already has a trial in progress with different user
        return rateLimitError(res, 3600);
      }
      // Log detailed error but return generic message
      await logErrorFromCatch(new Error(result.error), 'free-trial', 'Session creation failed');
      return serverError(res, 'Unable to start free trial session');
    }

    // Return success even if resuming existing session
    return res.json({
      success: true,
      sessionId: result.sessionId,
      currentStep: result.currentStep,
      resuming: result.resuming || false,
      message: result.message
    });
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
 * NOTE: No rate limiter for development
 */
router.post('/update-step/:tempUserId', async (req, res) => {
  try {
    const { tempUserId } = req.params;
    const { step } = req.body;

    if (!tempUserId || !step) {
      return validationError(res, 'Missing required information');
    }

    if (!isValidFreeTrialStep(step)) {
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
 * NOTE: No rate limiter for development
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
 * NOTE: No rate limiter for development
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
        return notFoundError(res, 'Session not found');
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
 * Body: { 
 *   firstName, lastName, email, birthDate, birthTime, 
 *   birthCountry, birthProvince, birthCity, birthTimezone, 
 *   sex, addressPreference, zodiacSign, astrologyData 
 * }
 * NOTE: No rate limiter for development
 */
router.post('/save-personal-info/:tempUserId', async (req, res) => {
  try {
    const { tempUserId } = req.params;
    const { 
      firstName, 
      lastName, 
      email, 
      birthDate, 
      birthTime, 
      birthCountry, 
      birthProvince, 
      birthCity, 
      birthTimezone, 
      sex, 
      addressPreference, 
      zodiacSign, 
      astrologyData 
    } = req.body;

    // Validate required fields
    if (!tempUserId) {
      return validationError(res, 'User ID is required');
    }

    // Temp users have relaxed requirements - only email and birthDate are required
    if (!email || !birthDate) {
      return validationError(res, 'Missing required fields: email, birthDate');
    }

    // Parse and validate birth date
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

    // Sanitize and apply defaults to personal information
    const personalInfo = sanitizePersonalInfo({
      firstName,
      lastName,
      email,
      birthDate: parsedBirthDate,
      birthTime,
      birthCountry,
      birthProvince,
      birthCity,
      birthTimezone,
      sex,
      addressPreference
    });

    // Process the complete personal info save operation
    const result = await processPersonalInfoSave(
      tempUserId, 
      personalInfo, 
      zodiacSign, 
      astrologyData
    );

    if (!result.success) {
      return serverError(res, result.error);
    }

    return res.json(result);
  } catch (err) {
    await logErrorFromCatch(err, 'free-trial', 'Error saving personal info');
    return serverError(res, 'Failed to save personal information');
  }
});

/**
 * GET /free-trial/horoscope/:tempUserId
 * Generate a daily horoscope for a free trial user (no auth required).
 * Requires personal info (at minimum a birth date) to have been saved first.
 * Falls back to a provided ?zodiacSign= query param for users who skipped personal info.
 * NOTE: No rate limiter for development
 */
router.get('/horoscope/:tempUserId', async (req, res) => {
  try {
    const { tempUserId } = req.params;
    const { zodiacSign: signParam } = req.query;

    if (!tempUserId) {
      return validationError(res, 'Missing tempUserId');
    }

    // Verify the free trial session exists
    const userIdHash = hashUserId(tempUserId);
    const sessionCheck = await db.query(
      `SELECT id FROM free_trial_sessions WHERE user_id_hash = $1`,
      [userIdHash]
    );
    if (sessionCheck.rows.length === 0) {
      return notFoundError(res, 'Free trial session not found');
    }

    // Determine zodiac sign: prefer stored astrology data, then birth date calculation, then query param
    let zodiacSign = null;
    let chartData = null; // will hold { sunSign, moonSign, risingSign } when available

    const { rows: astrologyRows } = await db.query(
      `SELECT zodiac_sign, astrology_data FROM user_astrology WHERE user_id_hash = $1`,
      [userIdHash]
    );
    if (astrologyRows.length > 0) {
      if (astrologyRows[0].zodiac_sign) {
        zodiacSign = astrologyRows[0].zodiac_sign;
      }
      // Extract full birth-chart data if it was calculated by the lambda
      if (astrologyRows[0].astrology_data) {
        const ad =
          typeof astrologyRows[0].astrology_data === 'string'
            ? JSON.parse(astrologyRows[0].astrology_data)
            : astrologyRows[0].astrology_data;
        // Only expose chart if we have at least moon or rising (not just sun)
        if (ad && (ad.moon_sign || ad.rising_sign)) {
          chartData = {
            sunSign: ad.sun_sign || zodiacSign,
            moonSign: ad.moon_sign || null,
            risingSign: ad.rising_sign || null,
          };
        }
      }
    }

    if (!zodiacSign) {
      // Try to calculate from stored birth date
      const { rows: piRows } = await db.query(
        `SELECT pgp_sym_decrypt(birth_date_encrypted, $1)::text AS birth_date
         FROM user_personal_info WHERE user_id = $2`,
        [process.env.ENCRYPTION_KEY, tempUserId]
      );
      if (piRows.length > 0 && piRows[0].birth_date && piRows[0].birth_date !== 'null') {
        const { calculateSunSignFromDate } = await import('../shared/zodiacUtils.js');
        zodiacSign = calculateSunSignFromDate(piRows[0].birth_date);
      }
    }

    // Final fallback: sign provided by client (user picked manually via sign-picker UI)
    if (!zodiacSign && signParam) {
      zodiacSign = String(signParam).toLowerCase();

      // Persist the picked sign so processHoroscopeSync can find it in user_astrology.
      // Without this the horoscope generator has no sign data and would throw.
      try {
        const minimalAstrologyData = {
          sun_sign: zodiacSign,
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
          [userIdHash, zodiacSign, JSON.stringify(minimalAstrologyData)]
        );
      } catch (saveErr) {
        console.error('[FREE-TRIAL] Failed to save picked zodiac sign:', saveErr.message);
        // Non-fatal — attempt horoscope generation anyway
      }
    }

    if (!zodiacSign) {
      return validationError(res, 'Zodiac sign unavailable. Please save your birth date or select your sign.');
    }

    // Generate horoscope synchronously (works for temp users — no compliance checks required)
    const { processHoroscopeSync } = await import('../services/chat/processor.js');
    const result = await processHoroscopeSync(tempUserId, 'daily');

    if (!result || !result.horoscope) {
      return serverError(res, 'Failed to generate horoscope');
    }

    return successResponse(res, {
      horoscope: result.horoscope,
      zodiacSign,
      generatedAt: result.generated_at,
      chartData, // null when only sun sign is available
    });
  } catch (err) {
    await logErrorFromCatch(err, 'free-trial', 'Error generating horoscope');
    return serverError(res, 'Failed to generate horoscope');
  }
});

export default router;
