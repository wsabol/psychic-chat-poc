/**
 * Add Phone to AWS SNS Sandbox
 * This sends a ONE-TIME verification SMS that WILL arrive
 */

import { SNSClient, CreateSMSSandboxPhoneNumberCommand } from '@aws-sdk/client-sns';
import dotenv from 'dotenv';
dotenv.config();

const snsClient = new SNSClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

async function addPhoneToSandbox() {
  const phoneNumber = '+18324936779';
  
  console.log('\n🔧 Adding phone to AWS SNS Sandbox...');
  console.log(`📱 Phone: ${phoneNumber}\n`);
  
  try {
    const command = new CreateSMSSandboxPhoneNumberCommand({
      PhoneNumber: phoneNumber,
      LanguageCode: 'en-US'
    });
    
    const response = await snsClient.send(command);
    
    console.log('✅ SUCCESS!');
    console.log('📨 AWS is sending a verification code to your phone RIGHT NOW');
    console.log('\n⏰ Wait for the SMS (may take 30-60 seconds)');
    console.log('\n📋 Once you receive it, run this command:');
    console.log(`   node api/verify-sns-phone.js YOUR_CODE_HERE\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('already exists')) {
      console.log('\n✅ Phone already added to sandbox!');
      console.log('   If not verified yet, check for SMS or run verify command.');
    } else if (error.message.includes('credentials')) {
      console.log('\n💡 Fix: Check your AWS credentials in .env');
    } else {
      console.log('\n📋 Full error:', error);
    }
  }
}

addPhoneToSandbox();
