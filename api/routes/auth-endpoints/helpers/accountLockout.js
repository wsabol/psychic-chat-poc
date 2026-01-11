import { db } from '../../../shared/db.js';
import { logAudit } from '../../../shared/auditLog.js';
import { getEncryptionKey } from '../../../shared/decryptionHelper.js';
import { hashUserId } from '../../../shared/hashUtils.js';
import logger from '../../../shared/logger.js';

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Check if account is locked
 */
export async function isAccountLocked(userId) {
  try {
    const userIdHash = hashUserId(userId);
    const result = await db.query(
      `SELECT lock_expires_at FROM user_account_lockouts 
       WHERE user_id_hash = $1 AND lock_expires_at > NOW()`,
      [userIdHash]
    );

    if (result.rows.length === 0) {
      return { locked: false };
    }

    const lockout = result.rows[0];
    const minutesRemaining = Math.ceil(
      (new Date(lockout.lock_expires_at) - new Date()) / 1000 / 60
    );

    return {
      locked: true,
      unlockAt: lockout.lock_expires_at,
      minutesRemaining
    };
  } catch (err) {
    throw err;
  }
}

/**
 * Record login attempt and lock account if threshold exceeded
 */
export async function recordLoginAttempt(userId, success, reason, req) {
  try {
    const ENCRYPTION_KEY = getEncryptionKey();
    const userIdHash = hashUserId(userId);
    
    // Encrypt IP address
    let encryptedIp = null;
    if (req.ip) {
      try {
        const encResult = await db.query(
          'SELECT pgp_sym_encrypt($1::text, $2) as encrypted',
          [req.ip, ENCRYPTION_KEY]
        );
        encryptedIp = encResult.rows[0]?.encrypted;
      } catch (encErr) {
      }
    }
    
    // Record the attempt using login_attempts table (has encrypted IP field)
    // login_attempts schema: user_id_hash, attempt_type, email_attempted_encrypted, ip_address_encrypted, created_at
    await db.query(
      `INSERT INTO login_attempts (user_id_hash, attempt_type, ip_address_encrypted)
       VALUES ($1, $2, $3)`,
      [userIdHash, success ? 'success' : 'failed', encryptedIp]
    );

    // If failed attempt, check threshold
    if (!success) {
      const countResult = await db.query(
        `SELECT COUNT(*) as failed_count FROM login_attempts
         WHERE user_id_hash = $1 AND attempt_type = 'failed'
         AND created_at > NOW() - INTERVAL '60 minutes'`,
        [userIdHash]
      );

      const failedCount = parseInt(countResult.rows[0].failed_count);

      if (failedCount >= LOCKOUT_THRESHOLD) {
        const unlockAt = new Date(Date.now() + LOCKOUT_DURATION_MS);

        try {
          // user_account_lockouts schema: id, user_id_hash, reason, ip_addresses_encrypted, lock_expires_at, created_at
          await db.query(
            `INSERT INTO user_account_lockouts (user_id_hash, reason, lock_expires_at)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id_hash) DO UPDATE SET reason = $2, lock_expires_at = $3`,
            [userIdHash, `failed_attempts (${failedCount} failed)`, unlockAt]
          );

          // Log audit - only use columns that exist in audit_log schema
          // audit_log schema: id, user_id_hash, action, details, ip_address_encrypted, user_agent, created_at
          await logAudit(db, {
            userId,
            action: 'ACCOUNT_LOCKED_AUTO',
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            status: 'SUCCESS',
            details: { failedAttempts: failedCount, reason: 'Too many failed login attempts' }
          });

          return {
            success: true,
            accountLocked: true,
            message: `Account locked after ${failedCount} failed attempts. Try again in 15 minutes.`
          };
        } catch (lockErr) {
        }
      }
    }

    return {
      success: true,
      accountLocked: false,
      message: `Login attempt recorded (${success ? 'success' : 'failure'})`
    };
  } catch (err) {
    throw err;
  }
}

/**
 * Unlock account manually
 */
export async function unlockAccount(userId, req) {
  try {
    const ENCRYPTION_KEY = getEncryptionKey();
    const userIdHash = hashUserId(userId);
    const result = await db.query(
      `DELETE FROM user_account_lockouts 
       WHERE user_id_hash = $1 AND lock_expires_at > NOW()
       RETURNING id`,
      [userIdHash]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        message: 'Account is not currently locked'
      };
    }

    // Log audit - only use columns that exist in audit_log schema
    // audit_log schema: id, user_id_hash, action, details, ip_address_encrypted, user_agent, created_at
    await logAudit(db, {
      userId,
      action: 'ACCOUNT_UNLOCKED_MANUAL',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS'
    });
    
    // Also log to login_attempts for audit trail
    let encryptedIp = null;
    if (req.ip) {
      try {
        const encResult = await db.query(
          'SELECT pgp_sym_encrypt($1::text, $2) as encrypted',
          [req.ip, ENCRYPTION_KEY]
        );
        encryptedIp = encResult.rows[0]?.encrypted;
      } catch (encErr) {
      }
    }
    await db.query(
      `INSERT INTO login_attempts (user_id_hash, attempt_type, ip_address_encrypted)
       VALUES ($1, $2, $3)`,
      [userIdHash, 'unlocked_manual', encryptedIp]
    );

    return {
      success: true,
      message: 'Account unlocked successfully'
    };
  } catch (err) {
    throw err;
  }
}
