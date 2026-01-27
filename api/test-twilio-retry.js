import dotenv from 'dotenv';
dotenv.config();

import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

// Exponential backoff as Twilio recommends
async function sendWithRetry(phone, maxRetries = 5) {
  const client = twilio(accountSid, authToken);
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`\nAttempt ${attempt + 1}/${maxRetries}...`);
      
      const verification = await client.verify.v2
        .services(verifyServiceSid)
        .verifications
        .create({ to: phone, channel: 'sms' });
      
      console.log('✅ SUCCESS! SMS SENT!');
      console.log('Verification SID:', verification.sid);
      console.log('Status:', verification.status);
      return verification;
      
    } catch (error) {
      if (error.code === 20429) {
        // Calculate exponential backoff: 2^attempt seconds
        const waitSeconds = Math.pow(2, attempt);
        console.log(`❌ Rate limited (429). Waiting ${waitSeconds} seconds before retry...`);
        
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
        } else {
          console.log('\n❌ Max retries reached. Rate limit still active.');
          throw error;
        }
      } else {
        console.log('❌ Different error:', error.message);
        throw error;
      }
    }
  }
}

console.log('Testing Twilio with exponential backoff...');
console.log('Phone:', '+18324936779');
console.log('Service SID:', verifyServiceSid);

sendWithRetry('+18324936779')
  .then(() => {
    console.log('\n✅ TEST COMPLETE - Check your phone for SMS!');
    process.exit(0);
  })
  .catch(err => {
    console.log('\n❌ TEST FAILED');
    process.exit(1);
  });
