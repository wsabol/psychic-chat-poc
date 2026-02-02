/**
 * Core violation enforcement logic
 * Records violations and applies enforcement actions
 * Integrates with violation redemption system
 * 
 * MULTILINGUAL: Now supports translated responses based on user's oracle language
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
import { logErrorFromCatch } from '../../shared/errorLogger.js';

/**
 * Record violation and get enforcement action
 * DATABASE ONLY - No Firebase operations
 * 
 * NOW WITH REDEMPTION SYSTEM:
 * - Checks for pending redemptions before recording new violation
 * - If eligible violations have passed cooling-off, resets them
 * - Provides redemption messaging for first offenses
 * 
 * @param {string} userId - User ID
 * @param {string} violationType - Type of violation
 * @param {string} userMessage - The violating message
 * @param {boolean} isTemporaryUser - Whether this is a temporary account
 * @param {string} language - User's oracle language for translated responses
 */
export async function recordViolationAndGetAction(userId, violationType, userMessage, isTemporaryUser, language = 'en-US') {
  try {
    const userIdHash = hashUserId(userId);

    // SPECIAL CASE: Health/Medical advice - Log for compliance but do NOT enforce
    // The health guardrail handles the user-facing response
    if (violationType === VIOLATION_TYPES.HEALTH_MEDICAL_ADVICE) {
      
      // Log for compliance monitoring only
      const result = await db.query(
        `INSERT INTO user_violations (user_id_hash, violation_type, violation_count, violation_message, severity, is_active)
        VALUES ($1, $2, 1, $3, 'info', true)`,
        [userIdHash, violationType, userMessage.substring(0, 500)]
      );

      // Return null to indicate no enforcement action - health guardrail will handle response
      return null;
    }

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

    // STEP 3: Record the violation
    await db.query(
      `INSERT INTO user_violations (user_id_hash, violation_type, violation_count, violation_message, is_active)
      VALUES ($1, $2, $3, $4, true)`,
      [userIdHash, violationType, violationCount, userMessage.substring(0, 500)]
    );

    // STEP 4: TEMP ACCOUNT: Delete immediately on any violation
    if (isTemporaryUser) {
      return {
        action: 'TEMP_ACCOUNT_DELETED',
        violationCount: violationCount,
        response: getTempAccountViolationResponse(violationType, language)
      };
    }

    // STEP 5: ESTABLISHED ACCOUNT: Enforce based on violation type and count
    
    // ZERO TOLERANCE violations - Immediate indefinite suspension on 1st offense
    const zeroToleranceViolations = [
      VIOLATION_TYPES.MINOR_CONTENT,
      VIOLATION_TYPES.HARM_OTHERS,
      VIOLATION_TYPES.DOXXING_THREATS,
      VIOLATION_TYPES.HATEFUL_CONTENT,
      VIOLATION_TYPES.ILLEGAL_ACTIVITY,
      VIOLATION_TYPES.JAILBREAK_ATTEMPT,
      VIOLATION_TYPES.SELF_HARM  // Added to zero tolerance per requirements
    ];
    
    if (zeroToleranceViolations.includes(violationType)) {
      // IMMEDIATE INDEFINITE SUSPENSION - No warnings, no second chances
      await db.query(
        `UPDATE user_violations SET is_account_disabled = TRUE WHERE user_id_hash = $1`,
        [userIdHash]
      );

      return {
        action: 'ACCOUNT_DISABLED_PERMANENT',
        violationCount: violationCount,
        response: getPermanentBanResponse(violationType, language)
      };
    }
    
    // SEXUAL CONTENT - Warning on 1st, indefinite suspension on 2nd
    if (violationType === VIOLATION_TYPES.SEXUAL_CONTENT) {
      if (violationCount === 1) {
        // First offense: Warning (no redemption for sexual content)
        const baseResponse = getWarningResponse(violationType, violationCount, language);
        
        return {
          action: 'WARNING',
          violationCount: violationCount,
          response: baseResponse,
          redeemableAfter: null  // No redemption for sexual content
        };
      } else {
        // Second+ offense: Indefinite suspension
        await db.query(
          `UPDATE user_violations SET is_account_disabled = TRUE WHERE user_id_hash = $1`,
          [userIdHash]
        );

        return {
          action: 'ACCOUNT_DISABLED_PERMANENT',
          violationCount: violationCount,
          response: getPermanentBanResponse(violationType, language)
        };
      }
    }
    
    // ABUSIVE LANGUAGE - Keep existing progressive enforcement (not in zero tolerance list)
    if (violationType === VIOLATION_TYPES.ABUSIVE_LANGUAGE) {
      if (violationCount === 1) {
        // First offense: Warning + Redemption Path
        const baseResponse = getWarningResponse(violationType, violationCount, language);
        const redemptionMessage = getRedemptionMessage(violationType);
        const fullResponse = baseResponse + redemptionMessage;
        
        return {
          action: 'WARNING',
          violationCount: violationCount,
          response: fullResponse,
          redeemableAfter: calculateRedemptionTime(violationType)
        };
      } else if (violationCount === 2) {
        // Second offense: 7-day suspension
        const suspensionEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await db.query(
          `UPDATE user_personal_info SET is_suspended = TRUE, suspension_end_date = $1 WHERE user_id = $2`,
          [suspensionEnd, userId]
        );

        return {
          action: 'SUSPENDED_7_DAYS',
          violationCount: violationCount,
          suspensionEnd: suspensionEnd,
          response: getSuspensionResponse(violationType, language)
        };
      } else {
        // Third+ offense: Permanent ban
        await db.query(
          `UPDATE user_violations SET is_account_disabled = TRUE WHERE user_id_hash = $1`,
          [userIdHash]
        );

        return {
          action: 'ACCOUNT_DISABLED_PERMANENT',
          violationCount: violationCount,
          response: getPermanentBanResponse(violationType, language)
        };
      }
    }
    
    // Default fallback (shouldn't reach here)
    return {
      action: 'WARNING',
      violationCount: violationCount,
      response: getWarningResponse(violationType, violationCount, language)
    };
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
