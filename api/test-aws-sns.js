import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import dotenv from 'dotenv';
dotenv.config();

const snsClient = new SNSClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

async function testSMS() {
  console.log('\n🧪 Testing AWS SNS SMS...\n');
  
  const command = new PublishCommand({
    PhoneNumber: '+18324936779',
    Message: 'AWS SNS Test: Your code is 123456',
    MessageAttributes: {
      'AWS.SNS.SMS.SMSType': {
        DataType: 'String',
        StringValue: 'Transactional'
      }
    }
  });

  try {
    const response = await snsClient.send(command);
    console.log('✅ SUCCESS! SMS sent!');
    console.log('📱 Message ID:', response.MessageId);
    console.log('\n💬 Check your phone for the message!\n');
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    console.error('📋 Error Code:', error.name);
    console.error('\n');
    
    // Specific guidance based on error
    if (error.message.includes('InvalidParameter')) {
      console.log('🔴 Issue: Phone number format or sandbox restriction');
      console.log('💡 Try: Use E.164 format (+1XXXXXXXXXX)');
    } else if (error.message.includes('AuthorizationError')) {
      console.log('🔴 Issue: Access key missing SNS permissions');
      console.log('💡 Fix: Add AmazonSNSFullAccess policy to your IAM user');
    } else if (error.message.includes('OptedOut')) {
      console.log('🔴 Issue: This phone number opted out of AWS SMS');
      console.log('💡 Fix: Text "START" to any AWS SMS to re-enable');
    }
  }
}

testSMS();