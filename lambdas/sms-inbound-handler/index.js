/**
 * SMS Inbound Handler Lambda
 * Processes incoming SMS messages (STOP/START/HELP) for TCPA compliance
 * Triggered by SNS topic: starship-psychics-sms-inbound
 */

import pg from 'pg';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const { Pool } = pg;

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 2, // Lambda connections should be minimal
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// AWS SNS client for sending outbound reply messages
const snsClient = new SNSClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

// ─── TCPA-Compliant Reply Messages ───────────────────────────────────────────

/**
 * STOP reply: sent after successfully opting out the user.
 * TCPA requires a confirmation message after a STOP request.
 */
const STOP_REPLY =
  'Starship Psychics: You have been unsubscribed from SMS. No further messages will be sent. ' +
  'To re-enable, update your MFA settings at starshippsychics.com';

/**
 * HELP reply: sent in response to a HELP or INFO keyword.
 * Must identify the program, describe message frequency, and include support contact.
 */
const HELP_REPLY =
  'Starship Psychics SMS Help: Codes sent only for login/verification. ' +
  '1-3 msgs/login session. Msg&data rates may apply. Reply STOP to cancel. ' +
  'Support: support@starshippsychics.com';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parse AWS SNS message for SMS data
 * @param {Object} snsMessage - SNS message object
 * @returns {Object} Parsed SMS data
 */
function parseSNSMessage(snsMessage) {
  try {
    // AWS sends SMS data in this format
    return {
      originationNumber: snsMessage.originationNumber, // E.164 format — sender's number
      destinationNumber: snsMessage.destinationNumber,  // Our AWS number
      messageBody: snsMessage.messageBody,
      messageKeyword: snsMessage.messageKeyword,
      inboundMessageId: snsMessage.inboundMessageId,
      previousPublishedMessageId: snsMessage.previousPublishedMessageId
    };
  } catch (error) {
    console.error('Error parsing SNS message:', error);
    return null;
  }
}

/**
 * Send an outbound SMS reply back to the user via AWS SNS.
 * Uses the inbound message's destinationNumber as the origination identity
 * (i.e., the AWS-managed number the user originally texted).
 *
 * NOTE: AWS SNS may also auto-respond to STOP keywords at the carrier level.
 * This custom reply ensures our branded message is delivered regardless.
 *
 * @param {string} toPhoneNumber   - Recipient phone number in E.164 format
 * @param {string} messageBody     - Text to send
 * @param {string} originationNumber - Our AWS number that received the inbound message
 */
async function sendReply(toPhoneNumber, messageBody, originationNumber) {
  try {
    const params = {
      PhoneNumber: toPhoneNumber,
      Message: messageBody,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional'
        }
      }
    };

    // If we have our origination number, pin the reply to the same number
    // the user texted so carrier threading works correctly.
    if (originationNumber) {
      params.MessageAttributes['AWS.MM.SMS.OriginationNumber'] = {
        DataType: 'String',
        StringValue: originationNumber
      };
    }

    const command = new PublishCommand(params);
    await snsClient.send(command);
    return true;
  } catch (error) {
    // Non-critical: log but don't throw — opt-out was already recorded
    return false;
  }
}

/**
 * Add phone number to opt-out list
 * @param {string} phoneNumber - Phone number in E.164 format
 */
async function addOptOut(phoneNumber) {
  try {
    await pool.query(
      `INSERT INTO sms_opt_outs (phone_number, opted_out_at, created_at)
       VALUES ($1, NOW(), NOW())
       ON CONFLICT (phone_number) 
       DO UPDATE SET opted_out_at = NOW()`,
      [phoneNumber]
    );
    return true;
  } catch (error) {
    console.error('Error adding opt-out:', error);
    throw error;
  }
}

/**
 * When a user opts out of SMS, switch their 2FA method to 'email' so they
 * are never locked out of their account.
 *
 * Uses pgp_sym_decrypt to match the stored encrypted phone number against
 * the opt-out phone number, then updates user_2fa_settings.
 *
 * Requires ENCRYPTION_KEY env var (same key used by the API for pgcrypto).
 *
 * @param {string} phoneNumber - Phone number in E.164 format
 */
async function downgradeToEmailIfSMS(phoneNumber) {
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

  if (!ENCRYPTION_KEY) {
    console.warn('⚠️  ENCRYPTION_KEY not set — skipping 2FA method downgrade');
    return;
  }

  try {
    // Find the user whose primary phone matches and whose 2FA method is 'sms',
    // then flip the method to 'email' in a single UPDATE … WHERE subquery.
    const result = await pool.query(
      `UPDATE user_2fa_settings
       SET    method     = 'email',
              updated_at = NOW()
       WHERE  user_id_hash = (
         SELECT user_id_hash
         FROM   security
         WHERE  pgp_sym_decrypt(phone_number_encrypted::bytea, $1::text) = $2
         LIMIT  1
       )
       AND method = 'sms'
       RETURNING user_id_hash`,
      [ENCRYPTION_KEY, phoneNumber]
    );

  } catch (error) {
    // Non-critical: opt-out is already recorded; log and continue
    console.error('❌ Failed to downgrade 2FA method to email:', error);
  }
}

/**
 * Remove phone number from opt-out list (re-subscribe)
 * @param {string} phoneNumber - Phone number in E.164 format
 */
async function removeOptOut(phoneNumber) {
  try {
    const result = await pool.query(
      `DELETE FROM sms_opt_outs WHERE phone_number = $1 RETURNING id`,
      [phoneNumber]
    );
    
    if (result.rowCount > 0) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error('Error removing opt-out:', error);
    throw error;
  }
}

/**
 * Log incoming SMS for audit trail
 * @param {Object} smsData - SMS data object
 * @param {string} action - Action taken (STOP, START, HELP, IGNORED)
 */
async function logInboundSMS(smsData, action) {
  try {
    // Optional: Create an audit table for inbound SMS
    // This is useful for compliance and debugging
    await pool.query(
      `INSERT INTO sms_inbound_log 
       (phone_number, message_body, action_taken, message_id, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT DO NOTHING`,
      [
        smsData.originationNumber,
        smsData.messageBody,
        action,
        smsData.inboundMessageId
      ]
    ).catch(err => {
      // If table doesn't exist, log to console only
      console.warn('sms_inbound_log table not available:', err.message);
    });
  } catch (error) {
    // Non-critical - just log
    console.error('Error logging inbound SMS:', error);
  }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

/**
 * Main Lambda handler
 */
export const handler = async (event) => {

  try {
    // Process each SNS record
    for (const record of event.Records) {
      if (record.EventSource !== 'aws:sns') {
        continue;
      }

      // Parse SNS message
      const snsMessage = JSON.parse(record.Sns.Message);
      const smsData = parseSNSMessage(snsMessage);

      if (!smsData || !smsData.originationNumber) {
        console.error('❌ Invalid SMS data:', snsMessage);
        continue;
      }

      const phoneNumber = smsData.originationNumber;
      const ourNumber   = smsData.destinationNumber; // Our AWS-managed number
      const messageBody = (smsData.messageBody || '').trim().toUpperCase();

      // ── Handle STOP / UNSUBSCRIBE keywords (REQUIRED by TCPA) ────────────
      if (
        messageBody === 'STOP' ||
        messageBody === 'STOPALL' ||
        messageBody === 'UNSUBSCRIBE' ||
        messageBody === 'CANCEL' ||
        messageBody === 'END' ||
        messageBody === 'QUIT'
      ) {
        // 1. Record opt-out in database first (TCPA-critical)
        await addOptOut(phoneNumber);

        // 2. Switch the user's 2FA method from SMS → email so they stay
        //    able to log in after opting out.
        await downgradeToEmailIfSMS(phoneNumber);

        // 3. Send branded STOP confirmation message
        await sendReply(phoneNumber, STOP_REPLY, ourNumber);

        // 4. Audit log
        await logInboundSMS(smsData, 'STOP');
      }

      // ── Handle START / SUBSCRIBE keywords (opt back in) ──────────────────
      else if (
        messageBody === 'START' ||
        messageBody === 'SUBSCRIBE' ||
        messageBody === 'YES' ||
        messageBody === 'UNSTOP'
      ) {
        await removeOptOut(phoneNumber);
        await logInboundSMS(smsData, 'START');
      }

      // ── Handle HELP / INFO keywords (informational) ───────────────────────
      else if (messageBody === 'HELP' || messageBody === 'INFO') {
        // Send branded HELP response with program info and support contact
        await sendReply(phoneNumber, HELP_REPLY, ourNumber);

        await logInboundSMS(smsData, 'HELP');
      }

      // ── Ignore other messages ─────────────────────────────────────────────
      else {
        await logInboundSMS(smsData, 'IGNORED');
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'SMS processed successfully' })
    };

  } catch (error) {
    console.error('❌ Error processing SMS:', error);
    
    // Return success to SNS even on error to avoid retries
    // We don't want SNS to keep retrying failed messages
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Error logged',
        error: error.message 
      })
    };
  }
};
