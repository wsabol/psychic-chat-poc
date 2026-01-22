import { Router } from 'express';
import { db } from '../../shared/db.js';
import { hashUserId } from '../../shared/hashUtils.js';
import logger from '../../shared/logger.js';
import { validationError, serverError, successResponse } from '../../utils/responses.js';

const router = Router();

/**
 * POST /auth/timezone
 * Save user's browser timezone to database
 * Called on app startup with browser-detected timezone
 */
router.post('/timezone', async (req, res) => {
  try {
    const { userId, timezone } = req.body;
    
    if (!userId) {
      return validationError(res, 'userId is required');
    }

    if (!timezone) {
      return validationError(res, 'timezone is required');
    }

    // Validate timezone is IANA format (basic check)
    if (typeof timezone !== 'string' || timezone.length < 3) {
      return validationError(res, 'Invalid timezone format');
    }
    
    const userIdHash = hashUserId(userId);
    
    // UPSERT: Update if exists, insert if not
    const result = await db.query(
      `INSERT INTO user_preferences (user_id_hash, timezone)
       VALUES ($1, $2)
       ON CONFLICT (user_id_hash) DO UPDATE SET
       timezone = EXCLUDED.timezone,
       updated_at = CURRENT_TIMESTAMP
       RETURNING timezone`,
      [userIdHash, timezone]
    );
    
    return successResponse(res, {
      success: true,
      timezone: result.rows[0].timezone,
      message: 'Timezone saved successfully'
    });
  } catch (err) {
    return serverError(res, 'Failed to save timezone');
  }
});

/**
 * GET /auth/timezone
 * Retrieve user's stored timezone
 */
router.get('/timezone', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return validationError(res, 'userId is required');
    }
    
    const userIdHash = hashUserId(userId);
    
    const { rows } = await db.query(
      `SELECT timezone FROM user_preferences WHERE user_id_hash = $1`,
      [userIdHash]
    );
    
    if (rows.length === 0) {
      return successResponse(res, {
        success: true,
        timezone: 'GMT',
        message: 'No timezone set, defaulting to GMT'
      });
    }
    
    return successResponse(res, {
      success: true,
      timezone: rows[0].timezone || 'GMT'
    });
  } catch (err) {
    return serverError(res, 'Failed to fetch timezone');
  }
});

export default router;
