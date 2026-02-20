/**
 * Session Check Endpoint
 * Checks if user is returning based on IP address and database records
 * Replaces localStorage-based session management
 */

import express from 'express';
import { db } from '../../shared/db.js';
import { hashIpAddress } from '../../shared/hashUtils.js';
import { extractClientIp } from '../../services/freeTrialService.js';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import { serverError, successResponse } from '../../utils/responses.js';

const router = express.Router();

/**
 * POST /auth/check-returning-user
 * Check if this IP has an existing session
 * 
 * Returns session restoration data based on database lookups
 */
router.post('/check-returning-user', async (req, res) => {
  try {
    // Extract client IP using same logic as free trial
    const clientIp = extractClientIp(req);
    const ipHash = hashIpAddress(clientIp);

    // Check 0: Is this IP whitelisted? Whitelisted IPs get unlimited trials (testers)
    const whitelistCheck = await db.query(
      'SELECT id FROM free_trial_whitelist WHERE ip_address_hash = $1',
      [ipHash]
    );
    const isWhitelisted = whitelistCheck.rows.length > 0;

    // Check 1: Look for completed free trial sessions from this IP
    const freeTrialCheck = await db.query(
      `SELECT id, current_step, is_completed, user_id_hash, started_at, completed_at
       FROM free_trial_sessions 
       WHERE ip_address_hash = $1 
       ORDER BY started_at DESC
       LIMIT 1`,
      [ipHash]
    );

    // Check 2: Look for active authenticated sessions from this IP
    const securitySessionCheck = await db.query(
      `SELECT s.id, s.user_id_hash, s.last_active, s.is_trusted,
              pgp_sym_decrypt(s.ip_address_encrypted, $2) as decrypted_ip
       FROM security_sessions s
       WHERE pgp_sym_decrypt(s.ip_address_encrypted, $2) = $1
       ORDER BY s.last_active DESC
       LIMIT 1`,
      [clientIp, process.env.ENCRYPTION_KEY]
    );

    // Determine user type and session data
    let userType = 'new';
    let sessionData = null;
    let hasCompletedTrial = false;

    // If IP has completed free trial, they must log in or create account
    // Exception: whitelisted IPs are testers who can always start fresh
    if (freeTrialCheck.rows.length > 0) {
      const trialSession = freeTrialCheck.rows[0];

      if (trialSession.is_completed && isWhitelisted) {
        // Whitelisted tester with a completed session — treat as new user so the
        // Landing page is shown and they can click "Try Free" again.  The actual
        // session reset happens in createFreeTrialSession() when they click the button.
        userType = 'new';
        hasCompletedTrial = false;
        sessionData = null;
      } else if (trialSession.is_completed) {
        // Non-whitelisted completed trial - must login
        hasCompletedTrial = true;
        userType = 'free_trial_completed';
        sessionData = {
          completedAt: trialSession.completed_at,
          message: 'Free trial already completed from this device'
        };
      } else {
        // Incomplete trial - can resume
        hasCompletedTrial = false;
        userType = 'free_trial_incomplete';
        sessionData = {
          currentStep: trialSession.current_step,
          sessionId: trialSession.id,
          startedAt: trialSession.started_at,
          userIdHash: trialSession.user_id_hash
        };
      }
    }

    // If has active security session (authenticated user), check onboarding status
    if (securitySessionCheck.rows.length > 0) {
      const secSession = securitySessionCheck.rows[0];
      
      // CRITICAL FIX: Look up user by user_id_hash (which is the hashed Firebase UID)
      // The user_personal_info table stores user_id (unhashed Firebase UID) as primary key
      // But we need to match against the hash stored in security_sessions
      const userCheck = await db.query(
        `SELECT upi.user_id, upi.onboarding_step, upi.onboarding_completed, upi.subscription_status
         FROM user_personal_info upi
         WHERE ENCODE(DIGEST(upi.user_id, 'sha256'), 'hex') = $1`,
        [secSession.user_id_hash]
      );

      if (userCheck.rows.length > 0) {
        const userInfo = userCheck.rows[0];
        userType = 'registered';
        sessionData = {
          userId: userInfo.user_id,
          userIdHash: secSession.user_id_hash,
          onboardingStep: userInfo.onboarding_step,
          onboardingCompleted: userInfo.onboarding_completed,
          subscriptionStatus: userInfo.subscription_status,
          lastActive: secSession.last_active,
          isTrusted: secSession.is_trusted
        };
      } else {
        // CRITICAL FIX: User has security_session but no user_personal_info
        // This happens after 2FA verification but before onboarding is complete
        // Treat as registered user who needs to complete onboarding
        userType = 'registered';
        sessionData = {
          userIdHash: secSession.user_id_hash,
          onboardingStep: 'create_account', // Start of onboarding
          onboardingCompleted: false,
          subscriptionStatus: null,
          lastActive: secSession.last_active,
          isTrusted: secSession.is_trusted
        };
      }
    }

    return successResponse(res, {
      isReturningUser: userType !== 'new',
      userType,
      hasCompletedTrial,
      sessionData,
      ipHash // Return for debugging (hash is safe to expose)
    });

  } catch (err) {
    await logErrorFromCatch(err, 'session-check', 'Error checking returning user');
    return serverError(res, 'Unable to check session status');
  }
});

export default router;
