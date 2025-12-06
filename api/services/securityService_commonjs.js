const db = require('../db');
const admin = require('firebase-admin');
const { encrypt, decrypt, generateVerificationCode } = require('../utils/encryption');

const VERIFICATION_EXPIRY = 10 * 60 * 1000; // 10 minutes

/**
 * Get all active devices for user (from Firebase sessions)
 */
async function getDevices(userId) {
  try {
    // Query our security_sessions table
    const result = await db.query(
      'SELECT id, device_name, ip_address, last_active, created_at FROM security_sessions WHERE user_id = $1 ORDER BY last_active DESC',
      [userId]
    );

    const devices = result.rows.map(row => ({
      id: row.id,
      deviceName: row.device_name,
      ipAddress: row.ip_address,
      lastLogin: row.last_active,
      createdAt: row.created_at,
      isCurrent: false // Frontend can mark current device
    }));

    return { devices, count: devices.length };
  } catch (err) {
    console.error('[SECURITY] Error getting devices:', err);
    throw err;
  }
}

/**
 * Log out a specific device
 */
async function logoutDevice(userId, deviceId) {
  try {
    // Get the device to find its token
    const result = await db.query(
      'SELECT firebase_token FROM security_sessions WHERE id = $1 AND user_id = $2',
      [deviceId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Device not found');
    }

    const { firebase_token } = result.rows[0];

    // Delete from our tracking table
    await db.query(
      'DELETE FROM security_sessions WHERE id = $1 AND user_id = $2',
      [deviceId, userId]
    );

    // Optionally revoke the Firebase token
    // This prevents the user from making authenticated requests with that token
    try {
      await admin.auth().revokeRefreshTokens(userId);
      console.log('[SECURITY] ✓ Refresh tokens revoked for user:', userId);
    } catch (err) {
      console.warn('[SECURITY] Could not revoke Firebase tokens:', err.message);
    }

    console.log('[SECURITY] ✓ Device logged out:', deviceId);
    return { success: true };
  } catch (err) {
    console.error('[SECURITY] Error logging out device:', err);
    throw err;
  }
}

/**
 * Get phone data
 */
async function getPhoneData(userId) {
  try {
    let result = await db.query(
      'SELECT phone_number, recovery_phone, phone_verified, recovery_phone_verified FROM security WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return { phoneNumber: null, recoveryPhone: null };
    }

    const row = result.rows[0];
    return {
      phoneNumber: row.phone_number ? decrypt(row.phone_number) : null,
      recoveryPhone: row.recovery_phone ? decrypt(row.recovery_phone) : null,
      phoneVerified: row.phone_verified,
      recoveryPhoneVerified: row.recovery_phone_verified
    };
  } catch (err) {
    console.error('[SECURITY] Error getting phone data:', err);
    throw err;
  }
}

/**
 * Save phone and send verification code
 */
async function savePhoneNumber(userId, phoneNumber, recoveryPhone) {
  try {
    const encryptedPhone = phoneNumber ? encrypt(phoneNumber) : null;
    const encryptedRecovery = recoveryPhone ? encrypt(recoveryPhone) : null;

    // Insert or update
    await db.query(
      `INSERT INTO security (user_id, phone_number, recovery_phone, phone_verified, recovery_phone_verified)
       VALUES ($1, $2, $3, FALSE, FALSE)
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         phone_number = $2,
         recovery_phone = $3,
         phone_verified = FALSE,
         recovery_phone_verified = FALSE,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, encryptedPhone, encryptedRecovery]
    );

    // Generate and store verification code for primary phone
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + VERIFICATION_EXPIRY);

    await db.query(
      `INSERT INTO verification_codes (user_id, phone_number, code, code_type, expires_at)
       VALUES ($1, $2, $3, 'sms', $4)`,
      [userId, phoneNumber, code, expiresAt]
    );

    console.log('[SECURITY] ✓ Phone saved, verification code generated');

    // TODO: Send SMS to phoneNumber with code
    // For now, log it for testing
    console.log(`[SECURITY] SMS CODE FOR TESTING: ${code}`);

    return { success: true, codeSent: true };
  } catch (err) {
    console.error('[SECURITY] Error saving phone:', err);
    throw err;
  }
}

/**
 * Verify phone code
 */
async function verifyPhoneCode(userId, code) {
  try {
    // Find valid verification code
    const result = await db.query(
      `SELECT id, phone_number FROM verification_codes 
       WHERE user_id = $1 AND code = $2 AND code_type = 'sms' 
       AND expires_at > NOW() AND verified_at IS NULL`,
      [userId, code]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid or expired verification code');
    }

    const { id, phone_number } = result.rows[0];

    // Mark as verified
    await db.query(
      'UPDATE verification_codes SET verified_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    // Update phone_verified in security table
    const encryptedPhone = encrypt(phone_number);
    await db.query(
      `UPDATE security SET phone_verified = TRUE 
       WHERE user_id = $1 AND phone_number = $2`,
      [userId, encryptedPhone]
    );

    console.log('[SECURITY] ✓ Phone verified for user:', userId);
    return { success: true, verified: true };
  } catch (err) {
    console.error('[SECURITY] Error verifying phone code:', err);
    throw err;
  }
}

/**
 * Get email data
 */
async function getEmailData(userId) {
  try {
    const result = await db.query(
      'SELECT recovery_email, recovery_email_verified FROM security WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return { recoveryEmail: null, recoveryEmailVerified: false };
    }

    const row = result.rows[0];
    return {
      recoveryEmail: row.recovery_email ? decrypt(row.recovery_email) : null,
      recoveryEmailVerified: row.recovery_email_verified
    };
  } catch (err) {
    console.error('[SECURITY] Error getting email data:', err);
    throw err;
  }
}

/**
 * Save recovery email and send verification code
 */
async function saveRecoveryEmail(userId, recoveryEmail) {
  try {
    const encryptedEmail = encrypt(recoveryEmail);

    // Insert or update
    await db.query(
      `INSERT INTO security (user_id, recovery_email, recovery_email_verified)
       VALUES ($1, $2, FALSE)
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         recovery_email = $2,
         recovery_email_verified = FALSE,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, encryptedEmail]
    );

    // Generate and store verification code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + VERIFICATION_EXPIRY);

    await db.query(
      `INSERT INTO verification_codes (user_id, email, code, code_type, expires_at)
       VALUES ($1, $2, $3, 'email', $4)`,
      [userId, recoveryEmail, code, expiresAt]
    );

    console.log('[SECURITY] ✓ Recovery email saved, verification code generated');

    // TODO: Send email to recoveryEmail with code
    console.log(`[SECURITY] EMAIL CODE FOR TESTING: ${code}`);

    return { success: true, codeSent: true };
  } catch (err) {
    console.error('[SECURITY] Error saving recovery email:', err);
    throw err;
  }
}

/**
 * Verify email code
 */
async function verifyEmailCode(userId, code) {
  try {
    const result = await db.query(
      `SELECT id, email FROM verification_codes 
       WHERE user_id = $1 AND code = $2 AND code_type = 'email' 
       AND expires_at > NOW() AND verified_at IS NULL`,
      [userId, code]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid or expired verification code');
    }

    const { id, email } = result.rows[0];

    // Mark as verified
    await db.query(
      'UPDATE verification_codes SET verified_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    // Update recovery_email_verified in security table
    const encryptedEmail = encrypt(email);
    await db.query(
      `UPDATE security SET recovery_email_verified = TRUE 
       WHERE user_id = $1 AND recovery_email = $2`,
      [userId, encryptedEmail]
    );

    console.log('[SECURITY] ✓ Email verified for user:', userId);
    return { success: true, verified: true };
  } catch (err) {
    console.error('[SECURITY] Error verifying email code:', err);
    throw err;
  }
}

/**
 * Remove recovery email
 */
async function removeRecoveryEmail(userId) {
  try {
    await db.query(
      `UPDATE security SET recovery_email = NULL, recovery_email_verified = FALSE
       WHERE user_id = $1`,
      [userId]
    );

    console.log('[SECURITY] ✓ Recovery email removed for user:', userId);
    return { success: true };
  } catch (err) {
    console.error('[SECURITY] Error removing recovery email:', err);
    throw err;
  }
}

/**
 * Record password change
 */
async function recordPasswordChange(userId) {
  try {
    await db.query(
      `INSERT INTO security (user_id, password_changed_at)
       VALUES ($1, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) 
       DO UPDATE SET password_changed_at = CURRENT_TIMESTAMP`,
      [userId]
    );

    // Optionally invalidate all other sessions
    await db.query(
      'DELETE FROM security_sessions WHERE user_id = $1',
      [userId]
    );

    console.log('[SECURITY] ✓ Password change recorded, sessions cleared');
    return { success: true };
  } catch (err) {
    console.error('[SECURITY] Error recording password change:', err);
    throw err;
  }
}

module.exports = {
  getDevices,
  logoutDevice,
  getPhoneData,
  savePhoneNumber,
  verifyPhoneCode,
  getEmailData,
  saveRecoveryEmail,
  verifyEmailCode,
  removeRecoveryEmail,
  recordPasswordChange
};
