import { db } from '../../../shared/db.js';
import { logAudit } from '../../../shared/auditLog.js';
import logger from '../../../shared/logger.js';

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Check if account is locked
 */
export async function isAccountLocked(userId) {
  try {
    const result = await db.query(
      `SELECT unlock_at FROM user_account_lockouts 
       WHERE user_id = $1 AND unlock_at > NOW()`,
      [userId]
    );

    if (result.rows.length === 0) {
      return { locked: false };
    }

    const lockout = result.rows[0];
    const minutesRemaining = Math.ceil(
      (new Date(lockout.unlock_at) - new Date()) / 1000 / 60
    );

    return {
      locked: true,
      unlockAt: lockout.unlock_at,
      minutesRemaining
    };
  } catch (err) {
    logger.error('Failed to check account lockout:', err.message);
    throw err;
  }
}

/**
 * Record login attempt and lock account if threshold exceeded
 */
export async function recordLoginAttempt(userId, success, reason, req) {
  try {
    // Record the attempt
    await db.query(
      `INSERT INTO user_login_attempts (user_id, ip_address, user_agent, success, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, req.ip, req.get('user-agent'), success || false, reason || null]
    );

    // If failed attempt, check threshold
    if (!success) {
      const countResult = await db.query(
        `SELECT COUNT(*) as failed_count FROM user_login_attempts
         WHERE user_id = $1 AND success = FALSE
         AND created_at > NOW() - INTERVAL '60 minutes'`,
        [userId]
      );

      const failedCount = parseInt(countResult.rows[0].failed_count);

      if (failedCount >= LOCKOUT_THRESHOLD) {
        const unlockAt = new Date(Date.now() + LOCKOUT_DURATION_MS);

        try {
          await db.query(
            `INSERT INTO user_account_lockouts (user_id, reason, failed_attempt_count, unlock_at, details)
             VALUES ($1, 'failed_attempts', $2, $3, '{}' ::JSONB)
             ON CONFLICT (user_id) WHERE (unlock_at > NOW())
             DO UPDATE SET failed_attempt_count = $2, unlock_at = $3`,
            [userId, failedCount, unlockAt]
          );

          // Log audit
          await logAudit(db, {
            userId,
            action: 'ACCOUNT_LOCKED_AUTO',
            resourceType: 'authentication',
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            httpMethod: req.method,
            endpoint: req.path,
            status: 'SUCCESS',
            details: { failedAttempts: failedCount, reason: 'Too many failed login attempts' }
          });

          return {
            success: true,
            accountLocked: true,
            message: `Account locked after ${failedCount} failed attempts. Try again in 15 minutes.`
          };
        } catch (lockErr) {
          logger.error('Failed to lock account:', lockErr.message);
        }
      }
    }

    return {
      success: true,
      accountLocked: false,
      message: `Login attempt recorded (${success ? 'success' : 'failure'})`
    };
  } catch (err) {
    logger.error('Failed to record login attempt:', err.message);
    throw err;
  }
}

/**
 * Unlock account manually
 */
export async function unlockAccount(userId, req) {
  try {
    const result = await db.query(
      `DELETE FROM user_account_lockouts 
       WHERE user_id = $1 AND unlock_at > NOW()
       RETURNING id`,
      [userId]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        message: 'Account is not currently locked'
      };
    }

    // Log audit
    await logAudit(db, {
      userId,
      action: 'ACCOUNT_UNLOCKED_MANUAL',
      resourceType: 'authentication',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      httpMethod: req.method,
      endpoint: req.path,
      status: 'SUCCESS'
    });

    return {
      success: true,
      message: 'Account unlocked successfully'
    };
  } catch (err) {
    logger.error('Failed to unlock account:', err.message);
    throw err;
  }
}
