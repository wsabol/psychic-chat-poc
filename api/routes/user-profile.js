/**
 * User Profile Routes
 * Endpoints for managing user personal information and preferences
 */

import { Router } from "express";
import { authorizeUser } from "../middleware/auth.js";
import { validationError, forbiddenError, serverError, successResponse } from "../utils/responses.js";
import {
  getPersonalInfo,
  savePersonalInfo,
  clearUserAstrologyCache,
  getUserPreferences,
  updateTimezone,
  updateLanguagePreferences,
  updateFullPreferences
} from "../services/userProfileService.js";

const router = Router();

/**
 * GET /:userId
 * Retrieve user personal information
 */
router.get("/:userId", authorizeUser, async (req, res) => {
  const { userId } = req.params;
  
  try {
    const personalInfo = await getPersonalInfo(userId);
    return successResponse(res, personalInfo);
  } catch (err) {
    console.error('[USER-PROFILE] Error fetching personal info:', err);
    return serverError(res, 'Failed to fetch personal information');
  }
});

/**
 * POST /:userId
 * Save or update user personal information
 */
router.post("/:userId", authorizeUser, async (req, res) => {
  const { userId } = req.params;

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
    console.error('[USER-PROFILE] Error saving personal info:', err);
    return serverError(res, 'Failed to save personal information');
  }
});

/**
 * DELETE /:userId/astrology-cache
 * Clear cached astrology messages for user
 */
router.delete("/:userId/astrology-cache", authorizeUser, async (req, res) => {
  const { userId } = req.params;
  
  try {
    const result = await clearUserAstrologyCache(userId);
    return successResponse(res, result);
  } catch (err) {
    console.error('[USER-PROFILE] Error clearing astrology cache:', err);
    return serverError(res, 'Failed to clear astrology cache');
  }
});

/**
 * GET /:userId/preferences
 * Retrieve user preferences with defaults
 */
router.get("/:userId/preferences", authorizeUser, async (req, res) => {
  const { userId } = req.params;

  try {
    const preferences = await getUserPreferences(userId);
    return successResponse(res, preferences);
  } catch (err) {
    console.error('[USER-PROFILE] Error fetching preferences:', err);
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
router.post("/:userId/preferences", authorizeUser, async (req, res) => {
  const { userId } = req.params;
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
    console.error('[USER-PROFILE] Error saving preferences:', err);
    return serverError(res, 'Failed to save preferences');
  }
});

export default router;
