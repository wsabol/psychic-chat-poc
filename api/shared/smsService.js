import twilio from 'twilio';
import { logErrorFromCatch } from './errorLogger.js';
import { db } from './db.js';
import { hashUserId } from './hashUtils.js';

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
 * Check if there's a recent verification attempt for this phone number
 * Prevents spamming Twilio Verify API with duplicate requests
 * @param {string} phoneNumber - Phone number in E.164 format
 * @returns {Promise<Object>} {canSend: boolean, waitSeconds: number}
 */
async function checkRecentVerification(phoneNumber) {
  try {
    const result = await db.query(
      `SELECT created_at FROM sms_verification_attempts 
       WHERE phone_number = $1 
       AND created_at > NOW() - INTERVAL '2 minutes'
       ORDER BY created_at DESC 
       LIMIT 1`,
      [phoneNumber]
    );

    if (result.rows.length > 0) {
      const lastAttempt = new Date(result.rows[0].created_at);
      const now = new Date();
      const secondsSinceLastAttempt = Math.floor((now - lastAttempt) / 1000);
      const waitSeconds = Math.max(0, 120 - secondsSinceLastAttempt);
      
      return {
        canSend: waitSeconds === 0,
        waitSeconds,
        message: waitSeconds > 0 
          ? `Please wait ${waitSeconds} seconds before requesting another code` 
          : null
      };
    }

    return { canSend: true, waitSeconds: 0 };
  } catch (err) {
    logErrorFromCatch(err, 'app', 'SMS Rate Check');
    // If check fails, allow the request (fail open)
    return { canSend: true, waitSeconds: 0 };
  }
}

/**
 * Record a verification attempt for rate limiting
 * @param {string} phoneNumber - Phone number in E.164 format
 * @param {boolean} success - Whether the attempt was successful
 * @param {string} errorCode - Error code if failed
 */
async function recordVerificationAttempt(phoneNumber, success, errorCode = null) {
  try {
    await db.query(
      `INSERT INTO sms_verification_attempts (phone_number, success, error_code, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [phoneNumber, success, errorCode]
    );

    // Clean up old attempts (older than 1 hour)
    await db.query(
      `DELETE FROM sms_verification_attempts 
       WHERE created_at < NOW() - INTERVAL '1 hour'`
    );
  } catch (err) {
    logErrorFromCatch(err, 'app', 'SMS Attempt Recording');
    // Non-critical - don't throw
  }
}

/**
 * Send SMS verification code via Twilio Verify API with retry logic and rate limit handling
 * Implements exponential backoff and Retry-After header support per Twilio best practices
 * @param {string} toPhoneNumber - Phone number in E.164 format (e.g., +15555555555)
 * @param {Object} options - Optional parameters
 * @param {number} options.maxRetries - Maximum retry attempts (default: 3)
 * @returns {Promise<Object>} Result with success status and verification SID
 */
export async function sendSMS(toPhoneNumber, options = {}) {
  const maxRetries = options.maxRetries || 3;
  
  try {
    if (!client || !verifyServiceSid) {
      console.warn('⚠️ Twilio Verify not configured - SMS verification disabled');
      return {
        success: false,
        error: 'SMS verification service not configured',
        mockMode: true
      };
    }

    // Check for recent verification attempts (prevent spam)
    const rateCheck = await checkRecentVerification(toPhoneNumber);
    if (!rateCheck.canSend) {
      console.warn(`⚠️ Rate limit: Recent verification for ${toPhoneNumber}`);
      await recordVerificationAttempt(toPhoneNumber, false, 'RATE_LIMITED_LOCAL');
      return {
        success: false,
        error: rateCheck.message,
        code: 'RATE_LIMITED',
        waitSeconds: rateCheck.waitSeconds
      };
    }

    // Try sending with exponential backoff on 429 errors
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`[SMS-SEND] Attempt ${attempt + 1}/${maxRetries} for ${toPhoneNumber}`);
        
        // Use Twilio Verify API to send verification code
        const verification = await client.verify.v2
          .services(verifyServiceSid)
          .verifications
          .create({ to: toPhoneNumber, channel: 'sms' });

        // Log success headers for monitoring (if available from response)
        console.log(`[SMS-SEND] ✅ Success - Status: ${verification.status}`);
        
        await recordVerificationAttempt(toPhoneNumber, true);

        return {
          success: true,
          status: verification.status,
          to: verification.to,
          channel: verification.channel,
          message: `Verification code sent via SMS to ${toPhoneNumber}`
        };
        
      } catch (error) {
        const errorCode = error.code;
        const errorStatus = error.status;
        
        // Log error details
        console.error(`[SMS-SEND] ❌ Error on attempt ${attempt + 1}: ${error.message}`);
        if (errorCode) console.error(`[SMS-SEND]    Code: ${errorCode}`);
        if (errorStatus) console.error(`[SMS-SEND]    Status: ${errorStatus}`);
        
        // Handle rate limiting errors (429 or 20429)
        if (errorCode === 20429 || errorStatus === 429 || error.message?.includes('Too many requests')) {
          await recordVerificationAttempt(toPhoneNumber, false, errorCode || '429');
          
          // Check for Retry-After header (in seconds)
          let retryAfterSeconds = null;
          if (error.moreInfo || error.details) {
            // Twilio may include retry info in error details
            console.log(`[SMS-SEND]    Error details:`, error.moreInfo || error.details);
          }
          
          // Use Retry-After if provided, otherwise exponential backoff
          const waitSeconds = retryAfterSeconds || Math.pow(2, attempt);
          
          if (attempt < maxRetries - 1) {
            console.warn(`[SMS-SEND] ⏳ Rate limited (429). Waiting ${waitSeconds}s before retry ${attempt + 2}...`);
            await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
            continue; // Retry
          } else {
            // Max retries reached
            console.error(`[SMS-SEND] ❌ Max retries reached. Rate limit still active.`);
            logErrorFromCatch(error, 20429, 'SMS Service - Rate Limit');
            return {
              success: false,
              error: 'Too many SMS requests. Please try again in a few minutes.',
              code: errorCode || '429',
              rateLimited: true
            };
          }
        }
        
        // Handle other Twilio errors (non-retryable)
        console.error(`[SMS-SEND] ❌ Non-retryable error:`, error.message);
        logErrorFromCatch(error, errorCode || 'app', 'SMS Service - Verify API');
        await recordVerificationAttempt(toPhoneNumber, false, errorCode);
        
        return {
          success: false,
          error: error.message,
          code: errorCode
        };
      }
    }
    
    // Should not reach here
    return {
      success: false,
      error: 'Maximum retry attempts exceeded'
    };
    
  } catch (error) {
    logErrorFromCatch('❌ SMS verification send failed:', error.message);
    logErrorFromCatch(error, 'app', 'SMS Service - Verify API');
    await recordVerificationAttempt(toPhoneNumber, false, 'EXCEPTION');
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

    console.log(`[SMS-VERIFY] Checking code for ${toPhoneNumber}`);

    // Use Twilio Verify API to check verification code
    const verificationCheck = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks
      .create({ to: toPhoneNumber, code: code });

    const isValid = verificationCheck.status === 'approved';

    console.log(`[SMS-VERIFY] Result: ${verificationCheck.status}`);

    return {
      success: isValid,
      status: verificationCheck.status,
      valid: isValid,
      to: verificationCheck.to,
      message: isValid ? 'Code verified successfully' : 'Invalid or expired code'
    };
  } catch (error) {
    console.error(`[SMS-VERIFY] ❌ Error: ${error.message}`);
    if (error.code) console.error(`[SMS-VERIFY]    Code: ${error.code}`);
    if (error.status) console.error(`[SMS-VERIFY]    Status: ${error.status}`);
    
    logErrorFromCatch(error, error.code || 'app', 'SMS Service - Verify Check');
    
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
