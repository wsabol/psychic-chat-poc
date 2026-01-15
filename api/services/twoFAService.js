import { db } from '../shared/db.js';
import { generate6DigitCode, validate6DigitCode } from '../shared/authUtils.js';
import { send2FACodeEmail } from '../shared/emailService.js';
import { sendSMS } from '../shared/smsService.js';

/**
 * Generate 2FA code, save to DB, and send via email
 */
export async function generateAndSend2FACode(userId, email, method = 'email') {
  try {
    const code = generate6DigitCode();
    const codeExpires = new Date(Date.now() + 10 * 60000); // 10 minutes

    // Save code to database
    await db.query(
      `INSERT INTO user_2fa_codes (user_id, code, code_type, created_at, expires_at)
       VALUES ($1, $2, 'login', NOW(), $3)`,
      [userId, code, codeExpires]
    );

    // Send code via specified method
    let sendResult;
    if (method === 'email') {
      sendResult = await send2FACodeEmail(email, code);
    } else if (method === 'sms') {
      sendResult = await sendSMS(email, code); // email param is actually phone for SMS
    } else {
      return { success: false, error: 'Invalid 2FA method' };
    }

    if (!sendResult.success) {
      logErrorFromCatch(error, 'app', 'Error handling');
      return { success: false, error: 'Failed to send 2FA code' };
    }

    return { success: true, code };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'Error handling');
    return { success: false, error: error.message };
  }
}

/**
 * Verify 2FA code
 */
export async function verify2FACode(userId, code, codeType = 'login') {
  try {
    if (!validate6DigitCode(code)) {
      return { success: false, error: 'Invalid code format' };
    }

    const codeResult = await db.query(
      `SELECT * FROM user_2fa_codes 
       WHERE user_id = $1 AND code = $2 AND code_type = $3
       AND expires_at > NOW() AND used = false`,
      [userId, code, codeType]
    );

    if (codeResult.rows.length === 0) {
      return { success: false, error: 'Invalid or expired code' };
    }

    // Mark as used
    await db.query(
      'UPDATE user_2fa_codes SET used = true WHERE id = $1',
      [codeResult.rows[0].id]
    );

    return { success: true };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'Error handling');
    return { success: false, error: error.message };
  }
}

/**
 * Get user's 2FA settings
 */
export async function get2FASettings(userId) {
  try {
    const result = await db.query(
      'SELECT * FROM user_2fa_settings WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logErrorFromCatch(error, 'app', 'Error handling');
    return null;
  }
}

/**
 * Check if 2FA is enabled for user
 */
export async function is2FAEnabled(userId) {
  const settings = await get2FASettings(userId);
  return settings && settings.enabled;
}

/**
 * Update 2FA settings
 */
export async function update2FASettings(userId, settings) {
  try {
    const { enabled, method, phoneNumber, backupPhoneNumber } = settings;

    const updates = [];
    const params = [userId];
    let paramIndex = 2;

    if (enabled !== undefined) {
      updates.push(`enabled = $${paramIndex}`);
      params.push(enabled);
      paramIndex++;
    }

    if (method) {
      updates.push(`method = $${paramIndex}`);
      params.push(method);
      paramIndex++;
    }

    if (phoneNumber) {
      updates.push(`phone_number = $${paramIndex}`);
      params.push(phoneNumber);
      paramIndex++;
    }

    if (backupPhoneNumber) {
      updates.push(`backup_phone_number = $${paramIndex}`);
      params.push(backupPhoneNumber);
      paramIndex++;
    }

    if (updates.length === 0) {
      return { success: false, error: 'No updates provided' };
    }

    updates.push(`updated_at = NOW()`);

    const query = `
      UPDATE user_2fa_settings 
      SET ${updates.join(', ')} 
      WHERE user_id = $1
      RETURNING *
    `;

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return { success: false, error: '2FA settings not found' };
    }

    return { success: true, settings: result.rows[0] };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'Error handling');
    return { success: false, error: error.message };
  }
}
