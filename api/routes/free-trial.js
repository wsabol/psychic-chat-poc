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

export default router;
