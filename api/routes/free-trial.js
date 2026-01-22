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
import { serverError, validationError, forbiddenError } from '../utils/responses.js';
import { validateAge } from '../shared/ageValidator.js';
import { handleAgeViolation } from '../shared/violationHandler.js';
import { parseDateForStorage, isValidFreeTrialStep } from '../shared/validationUtils.js';
import {
  extractClientIp,
  sanitizePersonalInfo,
  processPersonalInfoSave
} from '../services/freeTrialService.js';

const router = express.Router();

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
    const clientIp = extractClientIp(req);

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
 * Body: { 
 *   firstName, lastName, email, birthDate, birthTime, 
 *   birthCountry, birthProvince, birthCity, birthTimezone, 
 *   sex, addressPreference, zodiacSign, astrologyData 
 * }
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

export default router;
