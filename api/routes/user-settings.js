/**
 * User Settings Routes
 * Handles privacy and communication preference persistence
 * 
 * Endpoints:
 * - GET /user-settings/:userId - Retrieve user settings
 * - POST /user-settings/:userId - Save user settings
 */

import { Router } from 'express';
import { db } from '../shared/db.js';
import { hashUserId } from '../shared/hashUtils.js';
import { authorizeUser } from '../middleware/auth.js';
import logger from '../shared/logger.js';
import { validationError, serverError } from '../utils/responses.js';
import { successResponse } from '../utils/responses.js';

const router = Router();

/**
 * GET /user-settings/:userId
 * Retrieve all user settings from database
 * Returns default values if settings don't exist yet
 */
router.get('/:userId', authorizeUser, async (req, res) => {
  try {
    const { userId } = req.params;
    const userIdHash = hashUserId(userId);

    const { rows } = await db.query(
      `SELECT 
        cookies_enabled,
        analytics_enabled,
        email_marketing_enabled,
        push_notifications_enabled,
        updated_at
       FROM user_settings 
       WHERE user_id_hash = $1`,
      [userIdHash]
    );

    // Return default settings if user settings record doesn't exist yet
    const settings = rows.length > 0 
      ? rows[0]
      : {
          cookies_enabled: true,
          analytics_enabled: true,
          email_marketing_enabled: true,
          push_notifications_enabled: true,
          updated_at: null
        };

    // Convert camelCase keys for frontend compatibility
    res.json({
      success: true,
      settings: {
        cookiesEnabled: settings.cookies_enabled,
        analyticsEnabled: settings.analytics_enabled,
        emailEnabled: settings.email_marketing_enabled,
        pushNotificationsEnabled: settings.push_notifications_enabled,
        updatedAt: settings.updated_at
      }
    });
  } catch (error) {
    return serverError(res, 'Failed to fetch settings');
  }
});

/**
 * POST /user-settings/:userId
 * Save user settings to database
 * 
 * Body:
 * {
 *   cookiesEnabled: boolean,
 *   analyticsEnabled: boolean,
 *   emailEnabled: boolean,
 *   pushNotificationsEnabled: boolean
 * }
 */
router.post('/:userId', authorizeUser, async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      cookiesEnabled, 
      analyticsEnabled, 
      emailEnabled, 
      pushNotificationsEnabled 
    } = req.body;

    const userIdHash = hashUserId(userId);

    // Validate input types
    if (typeof cookiesEnabled !== 'boolean' && cookiesEnabled !== undefined) {
      return validationError(res, 'cookiesEnabled must be a boolean');
    }
    if (typeof analyticsEnabled !== 'boolean' && analyticsEnabled !== undefined) {
      return validationError(res, 'analyticsEnabled must be a boolean');
    }
    if (typeof emailEnabled !== 'boolean' && emailEnabled !== undefined) {
      return validationError(res, 'emailEnabled must be a boolean');
    }
    if (typeof pushNotificationsEnabled !== 'boolean' && pushNotificationsEnabled !== undefined) {
      return validationError(res, 'pushNotificationsEnabled must be a boolean');
    }

    // Use UPSERT to insert or update
    const { rows } = await db.query(
      `INSERT INTO user_settings (
        user_id_hash,
        cookies_enabled,
        analytics_enabled,
        email_marketing_enabled,
        push_notifications_enabled
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id_hash) DO UPDATE SET
        cookies_enabled = COALESCE($2, user_settings.cookies_enabled),
        analytics_enabled = COALESCE($3, user_settings.analytics_enabled),
        email_marketing_enabled = COALESCE($4, user_settings.email_marketing_enabled),
        push_notifications_enabled = COALESCE($5, user_settings.push_notifications_enabled),
        updated_at = CURRENT_TIMESTAMP
      RETURNING 
        cookies_enabled,
        analytics_enabled,
        email_marketing_enabled,
        push_notifications_enabled,
        updated_at`,
      [
        userIdHash,
        cookiesEnabled !== undefined ? cookiesEnabled : true,
        analyticsEnabled !== undefined ? analyticsEnabled : true,
        emailEnabled !== undefined ? emailEnabled : true,
        pushNotificationsEnabled !== undefined ? pushNotificationsEnabled : true
      ]
    );

    const savedSettings = rows[0];

    

    res.json({
      success: true,
      message: 'Settings saved successfully',
      settings: {
        cookiesEnabled: savedSettings.cookies_enabled,
        analyticsEnabled: savedSettings.analytics_enabled,
        emailEnabled: savedSettings.email_marketing_enabled,
        pushNotificationsEnabled: savedSettings.push_notifications_enabled,
        updatedAt: savedSettings.updated_at
      }
    });
    } catch (error) {
    return serverError(res, 'Failed to save settings');
  }
});

export default router;
