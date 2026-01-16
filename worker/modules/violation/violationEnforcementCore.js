/**
 * Core violation enforcement logic
 * Records violations and applies enforcement actions
 * Integrates with violation redemption system
 */

import { db } from '../../shared/db.js';
import { hashUserId } from '../../shared/hashUtils.js';
import {
  getTempAccountViolationResponse,
  getWarningResponse,
  getSuspensionResponse,
  getPermanentBanResponse
} from './violationResponses.js';
import {
  applyPendingRedemptions,
  getRedemptionMessage
} from './violationRedemption.js';
import { VIOLATION_TYPES } from './violationDetector.js';
import { logErrorFromCatch } from '../../../shared/errorLogger.js';

/**
 * Record violation and get enforcement action
 * DATABASE ONLY - No Firebase operations
 * 
 * NOW WITH REDEMPTION SYSTEM:
 * - Checks for pending redemptions before recording new violation
 * - If eligible violations have passed cooling-off, resets them
 * - Provides redemption messaging for first offenses
 */
export async function recordViolationAndGetAction(userId, violationType, userMessage, isTemporaryUser) {
  try {
    const userIdHash = hashUserId(userId);

    // STEP 1: Check and apply any pending redemptions
    // This resets violations that have cooled off without new infractions
    const redeemedViolations = await applyPendingRedemptions(userId);

    // STEP 2: Get current violation count for this type
    const { rows: violationRows } = await db.query(
      `SELECT violation_count FROM user_violations 
       WHERE user_id_hash = $1 AND violation_type = $2 
       ORDER BY created_at DESC LIMIT 1`,
      [userIdHash, violationType]
    );

    let violationCount = (violationRows.length > 0 ? violationRows[0].violation_count : 0) + 1;

    // STEP 3: Record the violation with redemption metadata
    await db.query(
      `INSERT INTO user_violations (user_id_hash, violation_type, violation_count, violation_message, last_violation_timestamp)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [userIdHash, violationType, violationCount, userMessage.substring(0, 500)]
    );

    // STEP 4: TEMP ACCOUNT: Delete immediately on any violation
    if (isTemporaryUser) {
      return {
        action: 'TEMP_ACCOUNT_DELETED',
        violationCount: violationCount,
        response: getTempAccountViolationResponse(violationType)
      };
    }

    // STEP 5: ESTABLISHED ACCOUNT: Enforce based on violation count
    // Special handling for CRITICAL violations (self-harm, harm to others)
    const isCriticalViolation = [VIOLATION_TYPES.SELF_HARM, VIOLATION_TYPES.HARM_OTHERS].includes(violationType);

    if (violationCount === 1) {
      // First offense: Warning + Redemption Path
      const baseResponse = getWarningResponse(violationType, violationCount);
      const redemptionMessage = getRedemptionMessage(violationType);
      const fullResponse = baseResponse + redemptionMessage;
      
      return {
        action: 'WARNING',
        violationCount: violationCount,
        response: fullResponse,
        redeemableAfter: calculateRedemptionTime(violationType)
      };
    } else if (violationCount === 2) {
      // Second offense:
      // - CRITICAL violations (self-harm, harm to others): IMMEDIATE PERMANENT BAN
      // - Other violations: 7-day suspension
      
      if (isCriticalViolation) {
        // Critical violations: 2nd offense = permanent ban
        await db.query(
          `UPDATE user_violations SET is_account_disabled = TRUE WHERE user_id_hash = $1`,
          [userIdHash]
        );

        return {
          action: 'ACCOUNT_DISABLED_PERMANENT',
          violationCount: violationCount,
          response: getPermanentBanResponse(violationType)
        };
      } else {
        // Standard violations: 7-day suspension
        // NOTE: If this violation was previously redeemed and user offended again,
        // they lose the redemption privilege for this violation type going forward
        const suspensionEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await db.query(
          `UPDATE user_personal_info SET is_suspended = TRUE, suspension_end_date = $1 WHERE user_id = $2`,
          [suspensionEnd, userId]
        );

        return {
          action: 'SUSPENDED_7_DAYS',
          violationCount: violationCount,
          suspensionEnd: suspensionEnd,
          response: getSuspensionResponse(violationType)
        };
      }
    } else {
      // Third+ offense: Permanent ban
      // Mark as disabled in database
      await db.query(
        `UPDATE user_violations SET is_account_disabled = TRUE WHERE user_id_hash = $1`,
        [userIdHash]
      );

      return {
        action: 'ACCOUNT_DISABLED_PERMANENT',
        violationCount: violationCount,
        response: getPermanentBanResponse(violationType)
      };
    }
  } catch (err) {
    logErrorFromCatch('[VIOLATION] Error recording violation:', err);
    throw err;
  }
}

/**
 * Calculate when a violation becomes eligible for redemption
 * @param {string} violationType - Type of violation
 * @returns {Date|null} - Date/time when redemption becomes available, or null if not redeemable
 */
function calculateRedemptionTime(violationType) {
  const REDEMPTION_HOURS = {
    'abusive_language': 24,
    'sexual_content': 168  // 7 days
  };

  const hours = REDEMPTION_HOURS[violationType];
  if (!hours) return null;
  
  const redeemableAt = new Date();
  redeemableAt.setHours(redeemableAt.getHours() + hours);
  return redeemableAt;
}
