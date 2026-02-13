/**
 * SMS Inbound Handler Lambda
 * Processes incoming SMS messages (STOP/START/HELP) for TCPA compliance
 * Triggered by SNS topic: starship-psychics-sms-inbound
 */

import pg from 'pg';
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

/**
 * Parse AWS SNS message for SMS data
 * @param {Object} snsMessage - SNS message object
 * @returns {Object} Parsed SMS data
 */
function parseSNSMessage(snsMessage) {
  try {
    // AWS sends SMS data in this format
    return {
      originationNumber: snsMessage.originationNumber, // E.164 format
      destinationNumber: snsMessage.destinationNumber,
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
    });
  } catch (error) {
    // Non-critical - just log
    console.error('Error logging inbound SMS:', error);
  }
}

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
      const messageBody = (smsData.messageBody || '').trim().toUpperCase();

      // Handle STOP/UNSUBSCRIBE keywords (REQUIRED by TCPA)
      if (messageBody === 'STOP' || 
          messageBody === 'STOPALL' || 
          messageBody === 'UNSUBSCRIBE' || 
          messageBody === 'CANCEL' || 
          messageBody === 'END' || 
          messageBody === 'QUIT') {
        
        await addOptOut(phoneNumber);
        await logInboundSMS(smsData, 'STOP');
      }
      
      // Handle START/SUBSCRIBE keywords (opt back in)
      else if (messageBody === 'START' || 
               messageBody === 'SUBSCRIBE' || 
               messageBody === 'YES' || 
               messageBody === 'UNSTOP') {
        
        await removeOptOut(phoneNumber);
        await logInboundSMS(smsData, 'START');
      }
      
      // Handle HELP keyword (informational)
      else if (messageBody === 'HELP' || messageBody === 'INFO') {
        await logInboundSMS(smsData, 'HELP');
        // Note: AWS will automatically send a HELP response if configured
        // Or you can send a custom response using SNS here
      }
      
      // Ignore other messages
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
