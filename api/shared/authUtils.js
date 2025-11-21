import crypto from 'crypto';
import bcrypt from 'bcrypt';

/**
 * Password validation utility
 * Requirements: 8+ chars, 1 uppercase, 1 number, 1 special character
 */
export function validatePassword(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const isLongEnough = password.length >= minLength;

  if (!isLongEnough) {
    return {
      valid: false,
      message: 'Password must be at least 8 characters long'
    };
  }

  if (!hasUpperCase) {
    return {
      valid: false,
      message: 'Password must include at least one uppercase letter'
    };
  }

  if (!hasNumber) {
    return {
      valid: false,
      message: 'Password must include at least one number'
    };
  }

  if (!hasSpecialChar) {
    return {
      valid: false,
      message: 'Password must include at least one special character (!@#$%^&* etc)'
    };
  }

  return {
    valid: true,
    message: 'Password is valid'
  };
}

/**
 * Hash a password with bcrypt
 */
export async function hashPassword(password) {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Generate a 6-digit verification code
 */
export function generate6DigitCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Validate a 6-digit code format
 */
export function validate6DigitCode(code) {
  return /^\d{6}$/.test(code);
}

/**
 * Format phone number for Twilio (E.164 format)
 * Handles common US formats
 */
export function formatPhoneNumber(phone) {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If 10 digits, assume US
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  
  // If 11 digits starting with 1, format as US
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+${cleaned}`;
  }
  
  // If already has country code
  if (cleaned.length > 10) {
    return `+${cleaned}`;
  }
  
  return null; // Invalid format
}

/**
 * Validate email format
 */
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Log audit trail (for compliance)
 */
export async function logAudit(db, userId, action, details, ipAddress, userAgent) {
  try {
    await db.query(
      `INSERT INTO audit_log (user_id, action, details, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [userId, action, JSON.stringify(details), ipAddress, userAgent]
    );
  } catch (error) {
    console.error('Audit log error:', error);
    // Don't throw - audit logging should not block main operations
  }
}

/**
 * Hash email for searchable lookups (not authentication)
 * Uses SHA256 for one-way hashing of email addresses
 * Allows us to find users by email without storing plaintext
 */
export function hashEmail(email) {
  if (!email) return null;
  return crypto
    .createHash('sha256')
    .update(email.toLowerCase().trim())
    .digest('hex');
}

/**
 * Clean up expired 2FA codes and reset tokens
 */
export async function cleanupExpiredTokens(db) {
  try {
    // Delete expired 2FA codes
    await db.query(
      'DELETE FROM user_2fa_codes WHERE expires_at < NOW() AND used = false'
    );

    // Delete expired password reset tokens
    await db.query(
      'DELETE FROM password_reset_tokens WHERE expires_at < NOW() AND used = false'
    );
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}
