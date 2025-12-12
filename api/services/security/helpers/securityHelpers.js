import { encrypt, decrypt, generateVerificationCode } from '../../../utils/encryption.js';

// Constants
export const VERIFICATION_EXPIRY = 10 * 60 * 1000; // 10 minutes

/**
 * Helper: Encrypt phone number
 */
export function encryptPhone(phoneNumber) {
  return phoneNumber ? encrypt(phoneNumber) : null;
}

/**
 * Helper: Decrypt phone number
 */
export function decryptPhone(encryptedPhone) {
  return encryptedPhone ? decrypt(encryptedPhone) : null;
}

/**
 * Helper: Encrypt email
 */
export function encryptEmail(email) {
  return email ? encrypt(email) : null;
}

/**
 * Helper: Decrypt email
 */
export function decryptEmail(encryptedEmail) {
  return encryptedEmail ? decrypt(encryptedEmail) : null;
}

/**
 * Helper: Generate verification code
 */
export function generateVerificationCodeWithExpiry() {
  return {
    code: generateVerificationCode(),
    expiresAt: new Date(Date.now() + VERIFICATION_EXPIRY)
  };
}

/**
 * Helper: Log verification code for testing
 */
export function logVerificationCode(type, code) {
}
