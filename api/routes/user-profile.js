/**
 * User Profile Routes
 * Endpoints for managing user personal information and preferences
 */

import { Router } from "express";
import { validationError, forbiddenError, serverError, successResponse } from "../utils/responses.js";
import { logErrorFromCatch } from '../shared/errorLogger.js';
import {
  getPersonalInfo,
  savePersonalInfo,
  clearUserAstrologyCache,
  getUserPreferences,
  updateTimezone,
  updateLanguagePreferences,
  updateFullPreferences
} from "../services/user/index.js";
import { markEmailVerified } from "../services/authService.js";

const router = Router();

/**
 * GET /:userId
 * Retrieve user personal information
 */
router.get("/:userId", async (req, res) => {
  // Use actual userId from token (set by authenticateToken middleware)
  // Web client sends hashed userId in URL, but we use the real one from token
  const userId = req.userId || req.params.userId;
  
  try {
    const personalInfo = await getPersonalInfo(userId);
    return successResponse(res, personalInfo);
  } catch (err) {
    logErrorFromCatch('[USER-PROFILE] Error fetching personal info:', err);
    return serverError(res, 'Failed to fetch personal information');
  }
});

/**
 * POST /:userId
 * Save or update user personal information
 */
router.post("/:userId", async (req, res) => {
  // Use actual userId from token (set by authenticateToken middleware)
  // Web client sends hashed userId in URL, but we use the real one from token
  const userId = req.userId || req.params.userId;

  try {
    const result = await savePersonalInfo(userId, req.body);

    if (!result.success) {
      // Check if account was deleted due to age violation
      if (result.accountDeleted) {
        return forbiddenError(res, result.error);
      }
      return validationError(res, result.error);
    }

    return successResponse(res, { success: true, message: result.message });
  } catch (err) {
    logErrorFromCatch('[USER-PROFILE] Error saving personal info:', err);
    return serverError(res, 'Failed to save personal information');
  }
});

/**
 * DELETE /:userId/astrology-cache
 * Clear cached astrology messages for user
 */
router.delete("/:userId/astrology-cache", async (req, res) => {
  // Use actual userId from token (set by authenticateToken middleware)
  // Web client sends hashed userId in URL, but we use the real one from token
  const userId = req.userId || req.params.userId;
  
  try {
    const result = await clearUserAstrologyCache(userId);
    return successResponse(res, result);
  } catch (err) {
    logErrorFromCatch('[USER-PROFILE] Error clearing astrology cache:', err);
    return serverError(res, 'Failed to clear astrology cache');
  }
});

/**
 * GET /:userId/preferences
 * Retrieve user preferences with defaults
 */
router.get("/:userId/preferences", async (req, res) => {
  // Use actual userId from token (set by authenticateToken middleware)
  // Web client sends hashed userId in URL, but we use the real one from token
  const userId = req.userId || req.params.userId;

  try {
    const preferences = await getUserPreferences(userId);
    return successResponse(res, preferences);
  } catch (err) {
    logErrorFromCatch('[USER-PROFILE] Error fetching preferences:', err);
    return serverError(res, 'Failed to fetch preferences');
  }
});

/**
 * POST /:userId/preferences
 * Save or update user preferences
 * Supports three modes:
 * 1. Timezone-only update (browser detection on login)
 * 2. Language preferences update (temp user flow)
 * 3. Full preferences update (complete profile)
 */
router.post("/:userId/preferences", async (req, res) => {
  // Use actual userId from token (set by authenticateToken middleware)
  // Web client sends hashed userId in URL, but we use the real one from token
  const userId = req.userId || req.params.userId;
  const { language, response_type, voice_enabled, voice_selected, timezone, oracle_language } = req.body;

  try {
    // Mode 1: Timezone-only update
    if (timezone && !language && !response_type && !oracle_language) {
      const result = await updateTimezone(userId, timezone);
      return successResponse(res, result);
    }

    // Mode 2: Language preferences update (temp user flow)
    if (timezone && language && oracle_language && response_type) {
      const result = await updateLanguagePreferences(userId, {
        language,
        response_type,
        voice_enabled,
        timezone,
        oracle_language
      });

      if (!result.success) {
        return validationError(res, result.error);
      }

      return successResponse(res, result);
    }

    // Mode 3: Full preferences update
    if (!language || !response_type) {
      return validationError(res, 'Missing required fields: language, response_type');
    }

    const result = await updateFullPreferences(userId, {
      language,
      response_type,
      voice_enabled,
      voice_selected,
      timezone,
      oracle_language
    });

    if (!result.success) {
      return validationError(res, result.error);
    }

    return successResponse(res, result);
  } catch (err) {
    logErrorFromCatch('[USER-PROFILE] Error saving preferences:', err);
    return serverError(res, 'Failed to save preferences');
  }
});

/**
 * POST /:userId/sync-email-verified
 * Sync the Firebase email-verified flag into user_personal_info.email_verified.
 *
 * Called by the mobile app (fire-and-forget) whenever it detects that the
 * Firebase user object has emailVerified = true.  The server-side
 * markEmailVerified() function exists but was never wired into a route, so the
 * DB column stayed false even after the user clicked the verification link.
 *
 * Security: requires a valid Firebase token (authenticateToken middleware).
 * The endpoint only writes when the token itself carries email_verified = true,
 * so a malicious call with a non-verified token is silently ignored.
 */
router.post("/:userId/sync-email-verified", async (req, res) => {
  const userId = req.userId || req.params.userId;

  // Only sync when the Firebase token itself confirms verification.
  // req.user.emailVerified is populated by the authenticateToken middleware
  // from the decoded Firebase JWT (decodedToken.email_verified).
  if (!req.user?.emailVerified) {
    return successResponse(res, {
      success: false,
      message: 'Email not yet verified in Firebase token — nothing to sync',
    });
  }

  try {
    await markEmailVerified(userId);
    return successResponse(res, { success: true, message: 'Email verification synced' });
  } catch (err) {
    logErrorFromCatch('[USER-PROFILE] Error syncing email verified status:', err);
    return serverError(res, 'Failed to sync email verification status');
  }
});

export default router;
