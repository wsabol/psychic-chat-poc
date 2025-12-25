/**
 * Violation Redemption System
 * 
 * Allows users to redeem certain violations after a cooling-off period.
 * 
 * REDEEMABLE VIOLATIONS (with cooling periods):
 * - ABUSIVE_LANGUAGE (24 hours) - Momentary outbursts, typically emotional
 * - SEXUAL_CONTENT (168 hours / 7 days, first offense only) - Boundary testing
 * 
 * NON-REDEEMABLE VIOLATIONS:
 * - SELF_HARM (CRITICAL) - Requires professional help, not app-based redemption
 * - HARM_OTHERS (CRITICAL) - Safety threat, zero tolerance
 */

import { db } from '../../shared/db.js';
import { hashUserId } from '../../shared/hashUtils.js';
import { VIOLATION_TYPES } from './violationDetector.js';

/**
 * Configuration for redemption policies
 * Defines which violations can be redeemed and their cooling-off periods
 */
const REDEMPTION_CONFIG = {
  [VIOLATION_TYPES.ABUSIVE_LANGUAGE]: {
    redeemable: true,
    coolingHours: 24,
    maxRedemptions: -1, // -1 means unlimited
    description: 'Cooling-off period after which warning will be cleared'
  },
  [VIOLATION_TYPES.SEXUAL_CONTENT]: {
    redeemable: true,
    coolingHours: 168, // 7 days
    maxRedemptions: 1, // Can only redeem once (first offense)
    description: '7-day cooling-off period for first offense only'
  },
  [VIOLATION_TYPES.SELF_HARM]: {
    redeemable: false,
    coolingHours: null,
    maxRedemptions: 0,
    description: 'Not redeemable - directs to crisis support'
  },
  [VIOLATION_TYPES.HARM_OTHERS]: {
    redeemable: false,
    coolingHours: null,
    maxRedemptions: 0,
    description: 'Not redeemable - safety threat'
  }
};

/**
 * Check if a violation should be automatically redeemed
 * 
 * @param {string} userId - User ID
 * @param {string} violationType - Type of violation
 * @returns {Promise<{canRedeem: boolean, reason: string}>}
 */
export async function checkViolationRedemption(userId, violationType) {
  try {
    const config = REDEMPTION_CONFIG[violationType];
    
    // Check if this violation type is redeemable at all
    if (!config || !config.redeemable) {
      return {
        canRedeem: false,
        reason: `${violationType} cannot be redeemed`
      };
    }

    const userIdHash = hashUserId(userId);

    // Get the most recent violation of this type
    const { rows } = await db.query(
      `SELECT 
        violation_count, 
        last_violation_timestamp, 
        violation_redeemed_at
       FROM user_violations 
       WHERE user_id_hash = $1 AND violation_type = $2 
       ORDER BY created_at DESC LIMIT 1`,
      [userIdHash, violationType]
    );

    // If no violation exists, nothing to redeem
    if (rows.length === 0) {
      return {
        canRedeem: false,
        reason: 'No active violation to redeem'
      };
    }

    const violation = rows[0];

    // Check if violation has already been redeemed
    if (violation.violation_redeemed_at) {
      // Check if redemption limit reached
      if (config.maxRedemptions === 1) {
        return {
          canRedeem: false,
          reason: 'Maximum redemptions reached (first offense only)'
        };
      }
    }

    // For SEXUAL_CONTENT, only first offense can be redeemed
    if (violationType === VIOLATION_TYPES.SEXUAL_CONTENT && violation.violation_count > 1) {
      return {
        canRedeem: false,
        reason: 'Only first offense of sexual content can be redeemed'
      };
    }

    // Check if cooling-off period has passed
    const lastViolationTime = new Date(violation.last_violation_timestamp);
    const currentTime = new Date();
    const hoursSinceViolation = (currentTime - lastViolationTime) / (1000 * 60 * 60);

    if (hoursSinceViolation < config.coolingHours) {
      const hoursRemaining = Math.ceil(config.coolingHours - hoursSinceViolation);
      return {
        canRedeem: false,
        reason: `Cooling-off period still active. ${hoursRemaining} hours remaining.`,
        hoursRemaining
      };
    }

    // All checks passed - violation can be redeemed!
    return {
      canRedeem: true,
      reason: 'Cooling-off period satisfied, violation eligible for redemption'
    };

  } catch (err) {
    console.error('[VIOLATION-REDEMPTION] Error checking redemption eligibility:', err);
    return {
      canRedeem: false,
      reason: 'Error checking redemption status'
    };
  }
}

/**
 * Reset a violation's count to 0 and mark it as redeemed
 * Called after cooling-off period expires with no new violations
 * 
 * @param {string} userId - User ID
 * @param {string} violationType - Type of violation to reset
 * @returns {Promise<boolean>} - True if reset successful
 */
export async function resetViolationCount(userId, violationType) {
  try {
    const userIdHash = hashUserId(userId);

    // Reset violation count to 0 and mark redeemed
    const { rowCount } = await db.query(
      `UPDATE user_violations 
       SET violation_count = 0, 
           violation_redeemed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id_hash = $1 AND violation_type = $2 
       ORDER BY created_at DESC LIMIT 1`,
      [userIdHash, violationType]
    );

    if (rowCount > 0) {
      return true;
    } else {
      return false;
    }

  } catch (err) {
    console.error('[VIOLATION-REDEMPTION] Error resetting violation count:', err);
    return false;
  }
}

/**
 * Get redemption message for a violation type
 * 
 * @param {string} violationType - Type of violation
 * @returns {string} - Redemption message
 */
export function getRedemptionMessage(violationType) {
  const config = REDEMPTION_CONFIG[violationType];
  
  if (!config || !config.redeemable) {
    return '';
  }

  const messages = {
    [VIOLATION_TYPES.ABUSIVE_LANGUAGE]: `
---
💫 **A Path Forward:** We understand that moments of frustration happen. If you keep your interactions respectful over the next 24 hours, this warning will be cleared from your record and we'll start fresh. We believe in your ability to engage positively. ✨`,

    [VIOLATION_TYPES.SEXUAL_CONTENT]: `
---
💫 **A Path Forward:** Everyone tests boundaries sometimes. If you can honor our community guidelines for the next 7 days, this warning will be cleared and you'll get a fresh start. We trust you can grow from this. ✨`
  };

  return messages[violationType] || '';
}

/**
 * Check and apply automatic redemptions for a user
 * Should be called when user sends a new message (before violation check)
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of violations that were redeemed
 */
export async function applyPendingRedemptions(userId) {
  try {
    const userIdHash = hashUserId(userId);
    const redeemedViolations = [];

    // Check each redeemable violation type
    for (const violationType of [
      VIOLATION_TYPES.ABUSIVE_LANGUAGE,
      VIOLATION_TYPES.SEXUAL_CONTENT
    ]) {
      const redemptionCheck = await checkViolationRedemption(userId, violationType);
      
      if (redemptionCheck.canRedeem) {
        const success = await resetViolationCount(userId, violationType);
        if (success) {
          redeemedViolations.push(violationType);
        }
      }
    }

    return redeemedViolations;

  } catch (err) {
    console.error('[VIOLATION-REDEMPTION] Error applying pending redemptions:', err);
    return [];
  }
}

/**
 * Export the redemption configuration for reference
 */
export function getRedemptionConfig(violationType) {
  return REDEMPTION_CONFIG[violationType] || null;
}
