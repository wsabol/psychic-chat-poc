import dotenv from 'dotenv';
dotenv.config();

console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? 'SET' : 'NOT SET');
console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? 'SET' : 'NOT SET');
console.log('TWILIO_VERIFY_SERVICE_SID:', process.env.TWILIO_VERIFY_SERVICE_SID);

// Test Twilio directly without using smsService
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

console.log('\n--- Testing Twilio Client Directly ---');
try {
  const client = twilio(accountSid, authToken);
  console.log('✅ Twilio client created successfully');
  
  const verification = await client.verify.v2
    .services(verifyServiceSid)
    .verifications
    .create({ to: '+18324936779', channel: 'sms' });
  
  console.log('✅ SMS SENT!');
  console.log('Verification:', verification);
} catch (error) {
  console.log('❌ ERROR:', error.message);
  console.log('Error code:', error.code);
  console.log('Error status:', error.status);
}
