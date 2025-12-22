import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-secret-key-change-this-in-production';
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt sensitive data (phone, email)
 */
function encrypt(text) {
  if (!text) return null;

  try {
    // Generate random IV for each encryption
    const iv = crypto.randomBytes(16);
    
    // Create cipher
    const cipher = crypto.createCipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)),
      iv
    );

    // Encrypt
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get auth tag
    const authTag = cipher.getAuthTag();

    // Return IV:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (err) {
    console.error('[ENCRYPTION] Error encrypting:', err);
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypt sensitive data
 * 
 * FIXED: Properly handles NULL, undefined, empty strings, and non-string types
 * Returns null instead of throwing on invalid data
 */
function decrypt(encryptedData) {
  // Handle NULL, undefined, empty strings, and non-string types
  if (!encryptedData || typeof encryptedData !== 'string') {
    return null;
  }

  try {
    // Split the data
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      // Invalid format - return null instead of throwing
      console.warn('[ENCRYPTION] Invalid encrypted data format, returning null');
      return null;
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    // Create decipher
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)),
      iv
    );

    decipher.setAuthTag(authTag);

    // Decrypt
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    console.warn('[ENCRYPTION] Error decrypting (returning null):', err.message);
    return null;
  }
}

/**
 * Generate random verification code
 */
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export { encrypt, decrypt, generateVerificationCode };
