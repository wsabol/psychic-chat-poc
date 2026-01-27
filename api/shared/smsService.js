import twilio from 'twilio';
import { logErrorFromCatch } from './errorLogger.js';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let client = null;

try {
  if (accountSid && authToken) {
    client = twilio(accountSid, authToken);
  }
} catch (err) {
  logErrorFromCatch('❌ Failed to initialize Twilio:', err.message);
}

/**
 * Send SMS verification code via Twilio Verify API
 * Uses Twilio's Verify service for secure 2FA verification
 * @param {string} toPhoneNumber - Phone number in E.164 format (e.g., +15555555555)
 * @returns {Promise<Object>} Result with success status and verification SID
 */
export async function sendSMS(toPhoneNumber) {
  try {
    if (!client || !verifyServiceSid) {
      console.warn('⚠️ Twilio Verify not configured - SMS verification disabled');
      return {
        success: false,
        error: 'SMS verification service not configured',
        mockMode: true
      };
    }

    // Use Twilio Verify API to send verification code
    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verifications
      .create({ to: toPhoneNumber, channel: 'sms' });

    return {
      success: true,
      status: verification.status,
      to: verification.to,
      channel: verification.channel,
      message: `Verification code sent via SMS to ${toPhoneNumber}`
    };
  } catch (error) {
    logErrorFromCatch('❌ SMS verification send failed:', error.message);
    if (error.code) logErrorFromCatch('   Error code:', error.code);
    if (error.status) logErrorFromCatch('   Status:', error.status);
    logErrorFromCatch(error, 'app', 'SMS Service - Verify API');
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
}

/**
 * Verify SMS code using Twilio Verify API
 * @param {string} toPhoneNumber - Phone number in E.164 format
 * @param {string} code - 6-digit verification code
 * @returns {Promise<Object>} Result with verification status
 */
export async function verifySMSCode(toPhoneNumber, code) {
  try {
    if (!client || !verifyServiceSid) {
      console.warn('⚠️ Twilio Verify not configured - mock verification');
      return {
        success: true,
        status: 'approved',
        mockMode: true
      };
    }

    // Use Twilio Verify API to check verification code
    const verificationCheck = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks
      .create({ to: toPhoneNumber, code: code });

    const isValid = verificationCheck.status === 'approved';

    return {
      success: isValid,
      status: verificationCheck.status,
      valid: isValid,
      to: verificationCheck.to,
      message: isValid ? 'Code verified successfully' : 'Invalid or expired code'
    };
  } catch (error) {
    logErrorFromCatch('❌ SMS code verification failed:', error.message);
    if (error.code) logErrorFromCatch('   Error code:', error.code);
    if (error.status) logErrorFromCatch('   Status:', error.status);
    logErrorFromCatch(error, 'app', 'SMS Service - Verify Check');
    return {
      success: false,
      valid: false,
      error: error.message,
      code: error.code
    };
  }
}

/**
 * Send SMS for password reset using Twilio Verify API
 * @param {string} toPhoneNumber - Phone number in E.164 format
 * @returns {Promise<Object>} Result with success status
 */
export async function sendPasswordResetSMS(toPhoneNumber) {
  // Password reset uses the same Verify API
  return await sendSMS(toPhoneNumber);
}

/**
 * Legacy function: Send custom SMS message (for non-verification messages)
 * Uses Twilio Messages API for custom message content
 * @param {string} toPhoneNumber - Phone number in E.164 format
 * @param {string} messageBody - Custom message text
 * @returns {Promise<Object>} Result with success status
 */
export async function sendCustomSMS(toPhoneNumber, messageBody) {
  try {
    if (!client || !twilioPhoneNumber) {
      return {
        success: false,
        error: 'SMS messaging service not configured'
      };
    }

    const message = await client.messages.create({
      body: messageBody,
      from: twilioPhoneNumber,
      to: toPhoneNumber
    });

    return {
      success: true,
      messageId: message.sid
    };
  } catch (error) {
    logErrorFromCatch('❌ Custom SMS send failed:', error.message);
    logErrorFromCatch(error, 'app', 'SMS Service - Messages API');
    return {
      success: false,
      error: error.message
    };
  }
}
