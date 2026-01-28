/**
 * Verify Phone in AWS SNS Sandbox
 * Run this after receiving the SMS verification code
 * Usage: node api/verify-sns-phone.js YOUR_CODE_HERE
 */

import { SNSClient, VerifySMSSandboxPhoneNumberCommand } from '@aws-sdk/client-sns';
import dotenv from 'dotenv';
dotenv.config();

const snsClient = new SNSClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

async function verifyPhone() {
  const phoneNumber = '+18324936779';
  const code = process.argv[2];
  
  if (!code) {
    console.log('\n❌ Error: No verification code provided');
    console.log('Usage: node api/verify-sns-phone.js YOUR_CODE_HERE\n');
    process.exit(1);
  }
  
  console.log('\n🔐 Verifying phone in AWS SNS Sandbox...');
  console.log(`📱 Phone: ${phoneNumber}`);
  console.log(`🔢 Code: ${code}\n`);
  
  try {
    const command = new VerifySMSSandboxPhoneNumberCommand({
      PhoneNumber: phoneNumber,
      OneTimePassword: code
    });
    
    const response = await snsClient.send(command);
    
    console.log('✅ SUCCESS! Phone verified!');
    console.log('\n🎉 Your phone is now in the AWS SNS sandbox verified list');
    console.log('📲 SMS will now be delivered to this number');
    console.log('\n📋 Test it now:');
    console.log('   node api/test-aws-sns.js\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('Invalid')) {
      console.log('\n💡 The code might be:');
      console.log('   - Incorrect (check the SMS again)');
      console.log('   - Expired (codes expire after 10 minutes)');
      console.log('\n   If expired, run: node api/add-phone-to-sns-sandbox.js');
    } else if (error.message.includes('not found')) {
      console.log('\n💡 Phone not added yet.');
      console.log('   Run: node api/add-phone-to-sns-sandbox.js');
    } else {
      console.log('\n📋 Full error:', error);
    }
  }
}

verifyPhone();
