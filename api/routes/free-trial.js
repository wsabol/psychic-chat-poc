/**
 * Free Trial Routes
 * Handles free trial session management and progress tracking
 */

import express from 'express';
import { logErrorFromCatch } from '../shared/errorLogger.js';
import {
  serverError, validationError, forbiddenError,
  rateLimitError, notFoundError, successResponse,
} from '../utils/responses.js';
import { hashTempUserId } from '../shared/hashUtils.js';
import { validateAge } from '../shared/ageValidator.js';
import { handleAgeViolation } from '../shared/violationHandler.js';
import { parseDateForStorage, isValidFreeTrialStep } from '../shared/validationUtils.js';
import { extractClientIp } from '../shared/ipUtils.js';
import {
  createFreeTrialSession,
  updateFreeTrialStep,
  completeFreeTrialSession,
  getFreeTrialSession,
  sanitizePersonalInfo,
  processPersonalInfoSave,
  resolveZodiacSignForTrial,
  clearAstrologyMessages,
  refreshLanguagePreference,
} from '../services/freeTrialService.js';
import { freeTrialSessionLimiter, freeTrialLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Log an internal service error and return a generic 500 to the client.
 * Keeps error-handling at route level DRY without leaking internal details.
 * @param {Object} res           - Express response object
 * @param {Object} result        - Failed service result (must have .error)
 * @param {string} logContext    - Message passed to the error logger
 * @param {string} clientMessage - Generic message returned to the client
 */
async function handleServiceFailure(res, result, logContext, clientMessage) {
  await logErrorFromCatch(new Error(result.error), 'free-trial', logContext);
  return serverError(res, clientMessage);
}

// ─── ROUTES ───────────────────────────────────────────────────────────────────

/**
 * GET /free-trial/check-session/:tempUserId
 * Check whether a session exists without creating one.
 * Returns { exists: false } when no session is found — NOT a 404.
 */
router.get('/check-session/:tempUserId', freeTrialLimiter, async (req, res) => {
  try {
    const { tempUserId } = req.params;
    if (!tempUserId) return validationError(res, 'Missing required information');

    const result = await getFreeTrialSession(tempUserId);

    if (!result.success) {
      if (result.notFound) return res.json({ exists: false });
      return serverError(res, 'Unable to check session');
    }

    return res.json({
      exists:      true,
      sessionId:   result.sessionId,
      currentStep: result.currentStep,
      isCompleted: result.isCompleted,
    });
  } catch (err) {
    await logErrorFromCatch(err, 'free-trial', 'Error checking session');
    return serverError(res, 'Unable to check session');
  }
});

/**
 * POST /free-trial/create-session
 * Create a new (or resume an existing) free trial session.
 *
 * Body   : { tempUserId, language? }
 * Headers: x-client-ip (or inferred from the request)
 *
 * IP-based device tracking and trial limits are enforced inside
 * createFreeTrialSession() — no additional checks needed here.
 */
router.post('/create-session', freeTrialSessionLimiter, async (req, res) => {
  try {
    const { tempUserId, language } = req.body;
    if (!tempUserId) return validationError(res, 'Missing required information');

    const clientIp = extractClientIp(req);
    const result   = await createFreeTrialSession(tempUserId, clientIp, language || 'en-US');

    if (!result.success) {
      if (result.alreadyCompleted || result.alreadyStarted) return rateLimitError(res, 3600);
      await logErrorFromCatch(new Error(result.error), 'free-trial', 'Session creation failed');
      return serverError(res, 'Unable to start free trial session');
    }

    return res.json({
      success:     true,
      sessionId:   result.sessionId,
      currentStep: result.currentStep,
      resuming:    result.resuming || false,
      message:     result.message,
    });
  } catch (err) {
    await logErrorFromCatch(err, 'free-trial', 'Error creating session');
    return serverError(res, 'Unable to start free trial session');
  }
});

/**
 * POST /free-trial/update-step/:tempUserId
 * Advance the current step in the free trial progress.
 *
 * Body: { step: 'chat' | 'personal_info' | 'horoscope' | 'completed' }
 */
router.post('/update-step/:tempUserId', freeTrialLimiter, async (req, res) => {
  try {
    const { tempUserId } = req.params;
    const { step }       = req.body;

    if (!tempUserId || !step)        return validationError(res, 'Missing required information');
    if (!isValidFreeTrialStep(step)) return validationError(res, 'Invalid step value');

    const result = await updateFreeTrialStep(tempUserId, step);
    if (!result.success) {
      return handleServiceFailure(res, result, 'Step update failed', 'Unable to update trial progress');
    }

    return res.json(result);
  } catch (err) {
    await logErrorFromCatch(err, 'free-trial', 'Error updating step');
    return serverError(res, 'Unable to update trial progress');
  }
});

/**
 * POST /free-trial/complete/:tempUserId
 * Mark the free trial as completed.
 */
router.post('/complete/:tempUserId', freeTrialLimiter, async (req, res) => {
  try {
    const { tempUserId } = req.params;
    if (!tempUserId) return validationError(res, 'Missing required information');

    const result = await completeFreeTrialSession(tempUserId);
    if (!result.success) {
      return handleServiceFailure(res, result, 'Completion failed', 'Unable to complete trial session');
    }

    return res.json(result);
  } catch (err) {
    await logErrorFromCatch(err, 'free-trial', 'Error completing session');
    return serverError(res, 'Unable to complete trial session');
  }
});

/**
 * GET /free-trial/session/:tempUserId
 * Retrieve current free trial session details.
 */
router.get('/session/:tempUserId', freeTrialLimiter, async (req, res) => {
  try {
    const { tempUserId } = req.params;
    if (!tempUserId) return validationError(res, 'Missing required information');

    const result = await getFreeTrialSession(tempUserId);
    if (!result.success) {
      if (result.notFound) return notFoundError(res, 'Session not found');
      return handleServiceFailure(res, result, 'Session retrieval failed', 'Unable to retrieve trial session');
    }

    return res.json(result);
  } catch (err) {
    await logErrorFromCatch(err, 'free-trial', 'Error retrieving session');
    return serverError(res, 'Unable to retrieve trial session');
  }
});

/**
 * POST /free-trial/save-personal-info/:tempUserId
 * Save personal information for a free trial user (no authentication required).
 *
 * Body: { firstName, lastName, email, birthDate, birthTime,
 *         birthCountry, birthProvince, birthCity, birthTimezone,
 *         sex, addressPreference, zodiacSign, astrologyData }
 *
 * Only `email` and `birthDate` are required — all other fields are optional.
 */
router.post('/save-personal-info/:tempUserId', freeTrialLimiter, async (req, res) => {
  try {
    const { tempUserId } = req.params;
    if (!tempUserId) return validationError(res, 'User ID is required');

    // Pull out fields that need up-front handling; spread the rest to sanitizePersonalInfo
    const { email, birthDate, zodiacSign, astrologyData, ...profileFields } = req.body;
    if (!email || !birthDate) return validationError(res, 'Missing required fields: email, birthDate');

    // Normalise and validate birth date
    const parsedBirthDate = parseDateForStorage(birthDate);
    if (!parsedBirthDate || parsedBirthDate === 'Invalid Date') {
      return validationError(res, 'Invalid birth date format');
    }

    // Enforce 18+ age requirement
    const ageValidation = validateAge(parsedBirthDate);
    if (!ageValidation.isValid) {
      return validationError(res, `${ageValidation.error} (This app requires users to be 18 years or older)`);
    }
    if (!ageValidation.isAdult) {
      const violation = await handleAgeViolation(tempUserId, ageValidation.age);
      return forbiddenError(res, violation.deleted ? violation.error : violation.message);
    }

    // Sanitize inputs and apply defaults, then orchestrate the full save
    const personalInfo = sanitizePersonalInfo({ ...profileFields, email, birthDate: parsedBirthDate });
    const result       = await processPersonalInfoSave(tempUserId, personalInfo, zodiacSign, astrologyData);
    if (!result.success) return serverError(res, result.error);

    return res.json(result);
  } catch (err) {
    await logErrorFromCatch(err, 'free-trial', 'Error saving personal info');
    return serverError(res, 'Failed to save personal information');
  }
});

/**
 * GET /free-trial/horoscope/:tempUserId
 * Generate a daily horoscope for a free trial user (no auth required).
 *
 * Requires personal info (at minimum a birth date) to have been saved first.
 * Falls back to ?zodiacSign= query param for users who skipped personal info.
 *
 * Note: processor.js is imported dynamically to avoid circular-dependency issues
 * at module load time — this is the established pattern across all route files.
 */
router.get('/horoscope/:tempUserId', freeTrialLimiter, async (req, res) => {
  try {
    const { tempUserId }                                          = req.params;
    const { zodiacSign: signParam, language, timezone }          = req.query;

    if (!tempUserId) return validationError(res, 'Missing tempUserId');

    // Confirm a free trial session exists before doing any work
    const sessionResult = await getFreeTrialSession(tempUserId);
    if (!sessionResult.success) {
      if (sessionResult.notFound) return notFoundError(res, 'Free trial session not found');
      return serverError(res, 'Unable to verify trial session');
    }

    // Resolve zodiac sign — three-tier fallback:
    //   1. Stored astrology data  →  2. Birth date calculation  →  3. Client sign-picker param
    // Wrapped in try/catch so any unexpected DB error during resolution returns 400
    // (prompts the sign picker) instead of 500 (which would skip the sign picker entirely).
    const userIdHash = hashTempUserId(tempUserId);
    let zodiacSign, chartData;
    try {
      ({ zodiacSign, chartData } = await resolveZodiacSignForTrial(userIdHash, tempUserId, signParam));
    } catch (resolveErr) {
      await logErrorFromCatch(resolveErr, 'free-trial', 'Error resolving zodiac sign for trial');
      return validationError(res, 'Zodiac sign unavailable. Please select your sign.');
    }

    if (!zodiacSign) {
      return validationError(res, 'Zodiac sign unavailable. Please save your birth date or select your sign.');
    }

    // Ensure oracle_language in user_preferences matches the client's current language.
    // This handles the common case where the user changed language after the session
    // was first created (which set oracle_language to the creation-time value).
    // Non-fatal — refreshLanguagePreference swallows its own errors.
    if (language) {
      await refreshLanguagePreference(userIdHash, language);
    }

    // CRITICAL: Update the user's timezone in user_preferences so the horoscope
    // handler uses the user's LOCAL date (not UTC/GMT) when generating the reading.
    // Free trial sessions start with timezone='UTC' — this corrects it using the
    // browser-supplied IANA timezone (e.g. 'America/Chicago') sent by the client.
    if (timezone) {
      try {
        const { db } = await import('../shared/db.js');
        await db.query(
          `UPDATE user_preferences SET timezone = $1, updated_at = NOW() WHERE user_id_hash = $2`,
          [timezone, userIdHash]
        );
      } catch (tzErr) {
        // Non-fatal — log and continue; falls back to UTC if update fails
        await logErrorFromCatch(tzErr, 'free-trial', 'Failed to update timezone preference');
      }
    }

    // CRITICAL: Always clear any stale horoscope messages before generating so a
    // free trial user NEVER receives a cached horoscope from a previous session.
    // This ONLY affects messages belonging to this temp user's hash — established
    // customers use a completely separate endpoint and are never touched here.
    await clearAstrologyMessages(userIdHash);

    // Generate horoscope synchronously (temp users skip compliance checks)
    const { processHoroscopeSync } = await import('../services/chat/processor.js');
    let result;
    try {
      result = await processHoroscopeSync(tempUserId, 'daily');
    } catch (procErr) {
      throw procErr;
    }

    if (!result?.horoscope) return serverError(res, 'Failed to generate horoscope');

    return successResponse(res, {
      horoscope:   result.horoscope,
      brief:       result.brief ?? null,
      zodiacSign,
      generatedAt: result.generated_at,
      chartData,   // null when only sun sign is available
    });
  } catch (err) {
    await logErrorFromCatch(err, 'free-trial', 'Error generating horoscope');
    return serverError(res, 'Failed to generate horoscope');
  }
});

export default router;
