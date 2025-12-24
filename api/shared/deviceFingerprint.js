import crypto from 'crypto';

/**
 * Generate a consistent device fingerprint
 * Used to identify the same device across logins
 * 
 * Creates a hash from: User-Agent + Timezone (from request or system)
 * More sophisticated options (screen resolution, etc.) can be added but these are sufficient for most cases
 */
export function generateDeviceFingerprint(userAgent = '', ipAddress = '') {
  // Combine stable device identifiers
  const components = [
    userAgent || 'unknown-agent',
    ipAddress || 'unknown-ip'
  ].join('|');

  // Create SHA256 hash
  const hash = crypto.createHash('sha256').update(components).digest('hex');
  
  return hash;
}

/**
 * Extract device name from User-Agent for display purposes
 */
export function extractDeviceName(userAgent = '') {
  if (!userAgent) return 'Unknown Device';

  // Try to extract OS and browser
  let os = 'Unknown OS';
  let browser = 'Unknown Browser';

  // Detect OS
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
  else if (userAgent.includes('Android')) os = 'Android';

  // Detect browser
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Edge')) browser = 'Edge';
  else if (userAgent.includes('Opera')) browser = 'Opera';

  return `${browser} on ${os}`;
}

/**
 * Check if device is trusted and not expired
 */
export async function isDeviceTrusted(db, userIdHash, deviceFingerprint) {
  try {
    const result = await db.query(
      `SELECT id, is_trusted, trust_expiry 
       FROM security_sessions 
       WHERE user_id_hash = $1 
       AND device_name_encrypted = pgp_sym_encrypt($2, $3)
       AND is_trusted = true 
       AND trust_expiry > NOW()
       LIMIT 1`,
      [userIdHash, deviceFingerprint, process.env.ENCRYPTION_KEY]
    );

    return result.rows.length > 0;
  } catch (err) {
    console.error('[DEVICE] Error checking if device is trusted:', err);
    return false;
  }
}

/**
 * Mark a device as trusted for 30 days
 */
export async function trustDevice(db, userIdHash, deviceFingerprint, deviceName) {
  try {
    // Calculate 30 days from now
    const trustExpiry = new Date();
    trustExpiry.setDate(trustExpiry.getDate() + 30);

    const result = await db.query(
      `UPDATE security_sessions 
       SET is_trusted = true, trust_expiry = $1
       WHERE user_id_hash = $2 
       AND device_name_encrypted = pgp_sym_encrypt($3, $4)
       ORDER BY created_at DESC
       LIMIT 1
       RETURNING id, created_at`,
      [trustExpiry, userIdHash, deviceFingerprint, process.env.ENCRYPTION_KEY]
    );

    return result.rows.length > 0;
  } catch (err) {
    console.error('[DEVICE] Error trusting device:', err);
    throw err;
  }
}

/**
 * Get all trusted devices for a user
 */
export async function getTrustedDevices(db, userIdHash) {
  try {
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    
    const result = await db.query(
      `SELECT 
        id,
        device_name_encrypted,
        pgp_sym_decrypt(device_name_encrypted, $1) as device_name,
        created_at,
        last_active,
        trust_expiry,
        is_trusted
       FROM security_sessions 
       WHERE user_id_hash = $2 
       AND is_trusted = true
       ORDER BY last_active DESC`,
      [ENCRYPTION_KEY, userIdHash]
    );

    return result.rows;
  } catch (err) {
    console.error('[DEVICE] Error getting trusted devices:', err);
    throw err;
  }
}

/**
 * Revoke trust on a device
 */
export async function revokeTrustedDevice(db, userIdHash, deviceSessionId) {
  try {
    const result = await db.query(
      `UPDATE security_sessions 
       SET is_trusted = false, trust_expiry = NULL
       WHERE id = $1 
       AND user_id_hash = $2
       RETURNING id`,
      [deviceSessionId, userIdHash]
    );

    return result.rows.length > 0;
  } catch (err) {
    console.error('[DEVICE] Error revoking trusted device:', err);
    throw err;
  }
}

/**
 * Clean up expired trusted devices
 */
export async function cleanupExpiredTrustedDevices(db) {
  try {
    const result = await db.query(
      `UPDATE security_sessions 
       SET is_trusted = false, trust_expiry = NULL
       WHERE is_trusted = true 
       AND trust_expiry < NOW()`
    );

    if (result.rowCount > 0) {
      console.log(`[DEVICE] Cleaned up ${result.rowCount} expired trusted devices`);
    }

    return result.rowCount;
  } catch (err) {
    console.error('[DEVICE] Error cleaning up expired devices:', err);
    throw err;
  }
}
