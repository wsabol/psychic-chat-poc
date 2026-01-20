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
      return res.status(400).json({ error: 'tempUserId required' });
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
          error: 'This IP address has already completed the free trial',
          alreadyCompleted: true 
        });
      }
      return res.status(500).json({ error: result.error });
    }

    return res.json(result);
  } catch (err) {
    logErrorFromCatch('[FREE-TRIAL] Error creating session', err);
    return res.status(500).json({ error: 'Failed to create free trial session' });
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
      return res.status(400).json({ error: 'tempUserId and step required' });
    }

    const validSteps = ['chat', 'personal_info', 'horoscope', 'completed'];
    if (!validSteps.includes(step)) {
      return res.status(400).json({ error: 'Invalid step value' });
    }

    const result = await updateFreeTrialStep(tempUserId, step, db);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    return res.json(result);
  } catch (err) {
    logErrorFromCatch('[FREE-TRIAL] Error updating step', err);
    return res.status(500).json({ error: 'Failed to update free trial step' });
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
      return res.status(400).json({ error: 'tempUserId required' });
    }

    const result = await completeFreeTrialSession(tempUserId, db);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    return res.json(result);
  } catch (err) {
    logErrorFromCatch('[FREE-TRIAL] Error completing session', err);
    return res.status(500).json({ error: 'Failed to complete free trial' });
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
      return res.status(400).json({ error: 'tempUserId required' });
    }

    const result = await getFreeTrialSession(tempUserId, db);

    if (!result.success) {
      if (result.notFound) {
        return res.status(404).json({ error: 'Session not found' });
      }
      return res.status(500).json({ error: result.error });
    }

    return res.json(result);
  } catch (err) {
    logErrorFromCatch('[FREE-TRIAL] Error retrieving session', err);
    return res.status(500).json({ error: 'Failed to retrieve free trial session' });
  }
});

export default router;
