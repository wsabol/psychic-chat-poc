/**
 * Core violation enforcement logic
 * Records violations and applies enforcement actions
 */

import { db } from '../../shared/db.js';
import { hashUserId } from '../../shared/hashUtils.js';
import {
  getTempAccountViolationResponse,
  getWarningResponse,
  getSuspensionResponse,
  getPermanentBanResponse
} from './violationResponses.js';

/**
 * Record violation and get enforcement action
 * DATABASE ONLY - No Firebase operations
 */
export async function recordViolationAndGetAction(userId, violationType, userMessage, isTemporaryUser) {
  try {
    const userIdHash = hashUserId(userId);

    // Get current violation count for this type
    const { rows: violationRows } = await db.query(
      `SELECT violation_count FROM user_violations 
       WHERE user_id_hash = $1 AND violation_type = $2 
       ORDER BY created_at DESC LIMIT 1`,
      [userIdHash, violationType]
    );

    let violationCount = (violationRows.length > 0 ? violationRows[0].violation_count : 0) + 1;

    // Record the violation
    await db.query(
      `INSERT INTO user_violations (user_id_hash, violation_type, violation_count, violation_message)
      VALUES ($1, $2, $3, $4)`,
      [userIdHash, violationType, violationCount, userMessage.substring(0, 500)]
    );

    // TEMP ACCOUNT: Delete immediately on any violation
    if (isTemporaryUser) {
      return {
        action: 'TEMP_ACCOUNT_DELETED',
        violationCount: violationCount,
        response: getTempAccountViolationResponse(violationType)
      };
    }

    // ESTABLISHED ACCOUNT: Enforce based on violation count
    if (violationCount === 1) {
      // First offense: Warning
      return {
        action: 'WARNING',
        violationCount: violationCount,
        response: getWarningResponse(violationType, violationCount)
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
        response: getSuspensionResponse(violationType)
      };
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
    console.error('[VIOLATION] Error recording violation:', err);
    throw err;
  }
}
