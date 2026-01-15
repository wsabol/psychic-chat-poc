import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let client = null;

try {
  if (accountSid && authToken) {
    client = twilio(accountSid, authToken);
  }
} catch (err) {
}

/**
 * Send SMS verification code via Twilio
 */
export async function sendSMS(toPhoneNumber, code) {
  try {
    if (!client || !twilioPhoneNumber) {
      return {
        success: true,
        sid: 'MOCK-' + code,
        message: 'SMS sent (mock - SMS service not configured)'
      };
    }

    const message = await client.messages.create({
      body: `Your verification code is: ${code}. This code will expire in 10 minutes.`,
      from: twilioPhoneNumber,
      to: toPhoneNumber
    });

    return {
      success: true,
      messageId: message.sid
    };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'Error handling');
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send SMS for password reset
 */
export async function sendPasswordResetSMS(toPhoneNumber, code) {
  try {
    if (!client || !twilioPhoneNumber) {
      return {
        success: true,
        sid: 'MOCK-' + code,
        message: 'SMS sent (mock - SMS service not configured)'
      };
    }

    const message = await client.messages.create({
      body: `Your password reset code is: ${code}. This code will expire in 15 minutes. If you did not request this, please ignore.`,
      from: twilioPhoneNumber,
      to: toPhoneNumber
    });

    return {
      success: true,
      messageId: message.sid
    };
  } catch (error) {
    logErrorFromCatch(error, 'app', 'Error handling');
    return {
      success: false,
      error: error.message
    };
  }
}

