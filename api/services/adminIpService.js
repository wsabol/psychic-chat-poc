import { db } from '../shared/db.js';
import { send2FACodeEmail } from '../shared/emailService.js';
import { logErrorFromCatch } from '../shared/errorLogger.js';
import { hashUserId } from '../shared/hashUtils.js';

const ADMIN_EMAILS = ['starshiptechnology1@gmail.com', 'wsabol39@gmail.com'];
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

/**
 * Check if an email is registered as an admin
 */
export async function isAdmin(userEmail) {
  return ADMIN_EMAILS.includes(userEmail.toLowerCase());
}

/**
 * Check if an IP is trusted for a given admin user
 */
export async function checkTrustedIP(userId, ipAddress) {
  try {
    const userIdHash = hashUserId(userId);
    // Decrypt stored IPs and compare with plaintext to find match
    // (Can't compare encrypted values directly since each encryption is different)
    const result = await db.query(
      `SELECT id, first_seen, device_name FROM admin_trusted_ips 
       WHERE user_id_hash = $1 
       AND pgp_sym_decrypt(ip_address_encrypted, $2) = $3`,
      [userIdHash, ENCRYPTION_KEY, ipAddress]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (err) {
    logErrorFromCatch(err, 'admin', 'check trusted IP');
    return null;
  }
}

/**
 * Record a trusted IP for an admin user
 */
export async function recordTrustedIP(userId, ipAddress, deviceName, browserInfo) {
  try {
    const userIdHash = hashUserId(userId);
    
    // Try to update existing first
    const updateResult = await db.query(
      `UPDATE admin_trusted_ips 
       SET last_accessed = NOW(), device_name = $2, browser_info = $3, is_trusted = TRUE
       WHERE user_id_hash = $1 AND pgp_sym_decrypt(ip_address_encrypted, $4) = $5
       RETURNING id, first_seen`,
      [userIdHash, deviceName, browserInfo, ENCRYPTION_KEY, ipAddress]
    );
    
    // If already exists, return the updated record
    if (updateResult.rows.length > 0) {
      return updateResult.rows[0];
    }
    
    // If not, insert new record - set is_trusted = TRUE immediately
    const insertResult = await db.query(
      `INSERT INTO admin_trusted_ips 
       (user_id_hash, ip_address_encrypted, device_name, browser_info, is_trusted, last_accessed, created_at)
       VALUES ($1, pgp_sym_encrypt($2, $3), $4, $5, TRUE, NOW(), NOW())
       RETURNING id, first_seen`,
      [userIdHash, ipAddress, ENCRYPTION_KEY, deviceName, browserInfo]
    );
    
    return insertResult.rows[0];
  } catch (err) {
    logErrorFromCatch(err, 'admin', 'record trusted IP');
    return null;
  }
}

/**
 * Log an admin login attempt for audit trail
 */
export async function logAdminLoginAttempt(userId, ipAddress, deviceName, status, alertSent = false) {
  try {
    const userIdHash = hashUserId(userId);
    await db.query(
      `INSERT INTO admin_login_attempts 
       (user_id_hash, ip_address_encrypted, device_name, login_status, alert_sent, attempted_at)
       VALUES ($1, pgp_sym_encrypt($2, $3), $4, $5, $6, NOW())`,
      [userIdHash, ipAddress, ENCRYPTION_KEY, deviceName, status, alertSent]
    );
  } catch (err) {
    logErrorFromCatch(err, 'admin', 'log admin login attempt');
  }
}

/**
 * Send email alert to admin about new IP login
 */
export async function sendNewIPAlert(adminEmail, ipAddress, deviceName) {
  try {
    // Get geolocation
    let location = 'Unknown Location';
    try {
      const geo = await fetch(`https://ipapi.co/${ipAddress}/json/`)
        .then(r => r.json())
        .catch(() => ({}));
      
      location = `${geo.city || 'Unknown'}, ${geo.country_name || 'Unknown'}`;
    } catch (geoErr) {
      // Use default location if geolocation fails
    }
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #fff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #e74c3c;">🔐 New Login Location Detected</h2>
          
          <p>Someone attempted to log into your admin account from a new location:</p>
          
          <table style="border: 1px solid #ddd; width: 100%; margin: 20px 0;">
            <tr style="background-color: #f5f5f5;">
              <td style="padding: 10px; font-weight: bold;">IP Address:</td>
              <td style="padding: 10px; font-family: monospace;">${ipAddress}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold;">Location:</td>
              <td style="padding: 10px;">${location}</td>
            </tr>
            <tr style="background-color: #f5f5f5;">
              <td style="padding: 10px; font-weight: bold;">Device:</td>
              <td style="padding: 10px;">${deviceName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold;">Time:</td>
              <td style="padding: 10px;">${new Date().toLocaleString()}</td>
            </tr>
          </table>
          
          <div style="background-color: #e8f4f8; padding: 15px; border-left: 4px solid #3498db; margin: 20px 0;">
            <strong>✅ What we did:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Blocked the login from this new location</li>
              <li>Required additional 2FA verification</li>
              <li>Your account remains secure</li>
            </ul>
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #f39c12; margin: 20px 0;">
            <strong>What you should do:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>If this was YOU: Complete the 2FA verification to trust this device</li>
              <li>If this was NOT you: Change your password immediately</li>
            </ul>
          </div>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This alert was sent to ${adminEmail}. 
            If you receive unexpected alerts, your account may be compromised.
          </p>
        </div>
      </div>
    `;
    
    const sendResult = await send2FACodeEmail(adminEmail, html);
    
    if (sendResult.success) {
      await logAdminLoginAttempt('admin_alert', ipAddress, deviceName, 'alert_sent');
    }
    
    return sendResult;
  } catch (err) {
    logErrorFromCatch(err, 'admin', 'send new IP alert');
    return { success: false, error: err.message };
  }
}

/**
 * Get all trusted IPs for an admin user
 */
export async function getTrustedIPs(userId) {
  try {
    const userIdHash = hashUserId(userId);
    const result = await db.query(
      `SELECT 
        id,
        device_name,
        browser_info,
        first_seen,
        last_accessed,
        created_at
       FROM admin_trusted_ips 
       WHERE user_id_hash = $1
       ORDER BY last_accessed DESC`,
      [userIdHash]
    );

    return result.rows;
  } catch (err) {
    logErrorFromCatch(err, 'admin', 'get trusted IPs');
    return [];
  }
}

/**
 * Revoke trust on an IP for an admin user
 */
export async function revokeTrustedIP(userId, ipId) {
  try {
    const userIdHash = hashUserId(userId);
    const result = await db.query(
      `DELETE FROM admin_trusted_ips 
       WHERE id = $1 AND user_id_hash = $2
       RETURNING id`,
      [ipId, userIdHash]
    );

    return result.rows.length > 0;
  } catch (err) {
    logErrorFromCatch(err, 'admin', 'revoke trusted IP');
    return false;
  }
}
