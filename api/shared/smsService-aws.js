/**
 * SMS Service using AWS SNS
 * Replacement for Twilio Verify API with manual code generation and validation
 * 
 * Benefits:
 * - Better rate limits (no artificial Verify Service restrictions)
 * - Lower cost (~$0.00645 per SMS vs Twilio's $0.05)
 * - More reliable (AWS infrastructure)
 * - 100 free SMS per month forever
 */

import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { logErrorFromCatch } from './errorLogger.js';
import { db } from './db.js';
import crypto from 'crypto';

// Initialize AWS SNS client
const snsClient = new SNSClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

/**
 * Generate a 6-digit verification code
 */
function generate6DigitCode() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Store verification code in database with expiration
 * @param {string} phoneNumber - Phone number in E.164 format
 * @param {string} code - 6-digit code
 * @returns {Promise<string>} - Code ID for tracking
 */
async function storeVerificationCode(phoneNumber, code) {
  try {
    const result = await db.query(
      `INSERT INTO sms_verification_codes 
       (phone_number, code, expires_at, created_at)
       VALUES ($1, $2, NOW() + INTERVAL '10 minutes', NOW())
       RETURNING id`,
      [phoneNumber, code]
    );
    return result.rows[0].id;
  } catch (err) {
    logErrorFromCatch(err, 'app', 'SMS Code Storage');
    throw err;
  }
}

/**
 * Check if there's a recent verification attempt for this phone number
 * Prevents spamming AWS SNS with duplicate requests
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
 * Send SMS verification code via AWS SNS
 * @param {string} toPhoneNumber - Phone number in E.164 format (e.g., +15555555555)
 * @param {Object} options - Optional parameters
 * @param {number} options.maxRetries - Maximum retry attempts (default: 3)
 * @returns {Promise<Object>} Result with success status
 */
export async function sendSMS(toPhoneNumber, options = {}) {
  const maxRetries = options.maxRetries || 3;
  
  try {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      logErrorFromCatch('AWS SNS not configured - SMS verification disabled', 'CONFIG', 'smsService-aws.sendSMS');
      return {
        success: false,
        error: 'SMS verification service not configured',
        mockMode: true
      };
    }

    // Check for recent verification attempts (prevent spam)
    const rateCheck = await checkRecentVerification(toPhoneNumber);
    if (!rateCheck.canSend) {
      logErrorFromCatch(`Rate limit: Recent verification for ${toPhoneNumber}`, 'RATE_LIMITED_LOCAL', 'smsService-aws.sendSMS');
      await recordVerificationAttempt(toPhoneNumber, false, 'RATE_LIMITED_LOCAL');
      return {
        success: false,
        error: rateCheck.message,
        code: 'RATE_LIMITED',
        waitSeconds: rateCheck.waitSeconds
      };
    }

    // Generate 6-digit code
    const code = generate6DigitCode();
    
    // Store code in database
    const codeId = await storeVerificationCode(toPhoneNumber, code);

    // Prepare SMS message
    const message = `Your verification code is: ${code}\n\nThis code expires in 10 minutes. Do not share this code with anyone.`;

    // Try sending with exponential backoff on throttling errors
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        
        // Send via AWS SNS
        const command = new PublishCommand({
          PhoneNumber: toPhoneNumber,
          Message: message,
          MessageAttributes: {
            'AWS.SNS.SMS.SMSType': {
              DataType: 'String',
              StringValue: 'Transactional' // Higher priority, better deliverability
            }
          }
        });

        const response = await snsClient.send(command);
        
        await recordVerificationAttempt(toPhoneNumber, true);

        return {
          success: true,
          status: 'sent',
          to: toPhoneNumber,
          channel: 'sms',
          messageId: response.MessageId,
          codeId: codeId,
          message: `Verification code sent via SMS to ${toPhoneNumber}`
        };
        
      } catch (error) {
        const errorCode = error.name || error.code;
        
        // Log error details
        logErrorFromCatch(error, errorCode || 'SMS_SEND_ERROR', `smsService-aws.sendSMS attempt ${attempt + 1}`);
        
        // Handle throttling errors (similar to Twilio 429)
        if (errorCode === 'Throttling' || errorCode === 'ThrottlingException') {
          await recordVerificationAttempt(toPhoneNumber, false, errorCode);
          
          // Exponential backoff
          const waitSeconds = Math.pow(2, attempt);
          
          if (attempt < maxRetries - 1) {
            logErrorFromCatch(`Throttled. Waiting ${waitSeconds}s before retry ${attempt + 2}`, errorCode, 'smsService-aws.sendSMS retry');
            await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
            continue; // Retry
          } else {
            logErrorFromCatch(error, errorCode, 'SMS Service - AWS SNS Throttling - Max retries reached');
            return {
              success: false,
              error: 'Too many SMS requests. Please try again in a few minutes.',
              code: errorCode,
              rateLimited: true
            };
          }
        }
        
        // Handle other AWS SNS errors (non-retryable)
        logErrorFromCatch(error, errorCode, 'SMS Service - AWS SNS - Non-retryable error');
        await recordVerificationAttempt(toPhoneNumber, false, errorCode);
        
        return {
          success: false,
          error: error.message,
          code: errorCode
        };
      }
    }
    
    return {
      success: false,
      error: 'Maximum retry attempts exceeded'
    };
    
  } catch (error) {
    logErrorFromCatch('❌ AWS SNS SMS send failed:', error.message);
    logErrorFromCatch(error, 'app', 'SMS Service - AWS SNS');
    await recordVerificationAttempt(toPhoneNumber, false, 'EXCEPTION');
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
}

/**
 * Verify SMS code by checking database
 * @param {string} toPhoneNumber - Phone number in E.164 format
 * @param {string} code - 6-digit verification code
 * @returns {Promise<Object>} Result with verification status
 */
export async function verifySMSCode(toPhoneNumber, code) {
  try {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      logErrorFromCatch('AWS SNS not configured - using mock verification', 'CONFIG', 'smsService-aws.verifySMSCode');
      return {
        success: true,
        status: 'approved',
        mockMode: true
      };
    }

    // Validate code format
    if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return {
        success: false,
        valid: false,
        error: 'Invalid code format'
      };
    }

    // Check database for valid code
    const result = await db.query(
      `SELECT id, code, expires_at, verified_at 
       FROM sms_verification_codes 
       WHERE phone_number = $1 
       AND code = $2
       AND expires_at > NOW()
       AND verified_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [toPhoneNumber, code]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        valid: false,
        error: 'Invalid or expired verification code'
      };
    }

    // Mark code as verified
    await db.query(
      `UPDATE sms_verification_codes 
       SET verified_at = NOW() 
       WHERE id = $1`,
      [result.rows[0].id]
    );

    return {
      success: true,
      status: 'approved',
      valid: true,
      to: toPhoneNumber,
      message: 'Code verified successfully'
    };

  } catch (error) {
    logErrorFromCatch(error, error.code || 'SMS_VERIFY_ERROR', 'smsService-aws.verifySMSCode');
    
    return {
      success: false,
      valid: false,
      error: error.message,
      code: error.code
    };
  }
}

/**
 * Send SMS for password reset
 * @param {string} toPhoneNumber - Phone number in E.164 format
 * @returns {Promise<Object>} Result with success status
 */
export async function sendPasswordResetSMS(toPhoneNumber) {
  return await sendSMS(toPhoneNumber);
}

/**
 * Send custom SMS message (for non-verification messages)
 * @param {string} toPhoneNumber - Phone number in E.164 format
 * @param {string} messageBody - Custom message text
 * @returns {Promise<Object>} Result with success status
 */
export async function sendCustomSMS(toPhoneNumber, messageBody) {
  try {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return {
        success: false,
        error: 'SMS messaging service not configured'
      };
    }

    const command = new PublishCommand({
      PhoneNumber: toPhoneNumber,
      Message: messageBody,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional'
        }
      }
    });

    const response = await snsClient.send(command);

    return {
      success: true,
      messageId: response.MessageId
    };
  } catch (error) {
    logErrorFromCatch('❌ AWS SNS custom SMS failed:', error.message);
    logErrorFromCatch(error, 'app', 'SMS Service - AWS SNS Custom');
    return {
      success: false,
      error: error.message
    };
  }
}
