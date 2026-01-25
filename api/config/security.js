/**
 * Security Configuration Constants
 * Centralized configuration for security-related features
 */

export const SECURITY_CONFIG = {
  // Two-Factor Authentication
  TWO_FA_CODE_EXPIRY: 10 * 60 * 1000, // 10 minutes in milliseconds
  TWO_FA_CODE_LENGTH: 6,
  
  // Device Trust
  DEVICE_TRUST_DURATION_DAYS: 30,
  
  // Rate Limiting
  CODE_RESEND_COOLDOWN: 60 * 1000, // 60 seconds
  ADMIN_ALERT_COOLDOWN: 60 * 1000, // 60 seconds to prevent duplicate emails
  MAX_CODE_ATTEMPTS: 5,
  
  // Account Lockout
  LOCKOUT_DURATION_MINUTES: 30,
  
  // Verification Methods
  VERIFICATION_METHODS: {
    EMAIL: 'email',
    SMS: 'sms'
  },
  
  // Code Types
  CODE_TYPES: {
    LOGIN: 'login',
    PASSWORD_RESET: 'password_reset',
    PHONE_VERIFICATION: 'phone_verification',
    EMAIL_VERIFICATION: 'email_verification'
  }
};

export default SECURITY_CONFIG;
