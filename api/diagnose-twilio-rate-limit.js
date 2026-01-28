/**
 * Twilio Rate Limit Diagnostic Tool
 * 
 * Checks:
 * 1. Existing pending verifications for a phone number
 * 2. Twilio Verify Service configuration
 * 3. Recent verification history
 * 
 * Usage: node api/diagnose-twilio-rate-limit.js +15555555555
 */

import dotenv from 'dotenv';
dotenv.config();

import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

const phoneNumber = process.argv[2];

if (!phoneNumber) {
  console.error('❌ Error: Please provide a phone number');
  console.log('Usage: node api/diagnose-twilio-rate-limit.js +15555555555');
  process.exit(1);
}

async function diagnoseTwilioRateLimit() {
  try {
    const client = twilio(accountSid, authToken);
    
    console.log('\n=================================================');
    console.log('🔍 TWILIO VERIFY RATE LIMIT DIAGNOSTIC');
    console.log('=================================================\n');
    console.log(`Phone Number: ${phoneNumber}`);
    console.log(`Verify Service SID: ${verifyServiceSid}\n`);

    // Step 1: Check for pending verifications
    console.log('📋 Step 1: Checking for pending verifications...\n');
    
    try {
      const verifications = await client.verify.v2
        .services(verifyServiceSid)
        .verifications
        .list({ to: phoneNumber, limit: 10 });

      if (verifications.length === 0) {
        console.log('✅ No recent verifications found for this number\n');
      } else {
        console.log(`⚠️  Found ${verifications.length} recent verification(s):\n`);
        
        verifications.forEach((v, i) => {
          const age = Math.round((Date.now() - new Date(v.dateCreated)) / 1000);
          console.log(`   ${i + 1}. Status: ${v.status}`);
          console.log(`      SID: ${v.sid}`);
          console.log(`      Channel: ${v.channel}`);
          console.log(`      Created: ${v.dateCreated} (${age}s ago)`);
          console.log(`      Valid: ${v.valid || 'N/A'}`);
          
          if (v.status === 'pending') {
            console.log(`      ⚠️  PENDING verification blocks new requests!`);
          }
          console.log('');
        });

        // Check if any are pending
        const pendingCount = verifications.filter(v => v.status === 'pending').length;
        if (pendingCount > 0) {
          console.log(`❌ ISSUE FOUND: ${pendingCount} pending verification(s) exist!`);
          console.log('   Solution: Wait for pending verification to expire (usually 10 minutes)');
          console.log('   OR: Have the user complete the existing verification\n');
        }
      }
    } catch (err) {
      console.log(`❌ Error fetching verifications: ${err.message}\n`);
      if (err.code === 20429) {
        console.log('   This confirms you\'re rate limited!\n');
      }
    }

    // Step 2: Check Verify Service configuration
    console.log('📋 Step 2: Checking Verify Service Rate Limit Configuration...\n');
    
    try {
      const service = await client.verify.v2
        .services(verifyServiceSid)
        .fetch();

      console.log(`   Service Name: ${service.friendlyName}`);
      console.log(`   Code Length: ${service.codeLength}`);
      console.log(`   Lookup Enabled: ${service.lookupEnabled}`);
      console.log(`   Do Not Share Warning: ${service.doNotShareWarningEnabled}`);
      
      // Rate limit info (if available in response)
      if (service.rateLimits) {
        console.log(`\n   ⚙️  Rate Limits:`);
        console.log(`      ${JSON.stringify(service.rateLimits, null, 2)}`);
      } else {
        console.log(`\n   ℹ️  Rate limit details not available in API response`);
        console.log(`      Check Twilio Console > Verify > Services > Rate Limits`);
      }
      console.log('');
    } catch (err) {
      console.log(`❌ Error fetching service config: ${err.message}\n`);
    }

    // Step 3: Test creating a verification (shows exact error)
    console.log('📋 Step 3: Testing verification creation...\n');
    console.log('   Attempting to send verification...\n');
    
    try {
      const verification = await client.verify.v2
        .services(verifyServiceSid)
        .verifications
        .create({ to: phoneNumber, channel: 'sms' });

      console.log('✅ SUCCESS! Verification sent:');
      console.log(`   SID: ${verification.sid}`);
      console.log(`   Status: ${verification.status}`);
      console.log(`   Created: ${verification.dateCreated}\n`);

    } catch (err) {
      console.log(`❌ FAILED! Error code ${err.code}: ${err.message}\n`);
      
      if (err.code === 20429 || err.status === 429) {
        console.log('   🔴 RATE LIMIT ACTIVE\n');
        console.log('   Common Causes:');
        console.log('   1. Too many verifications sent to this phone number recently');
        console.log('   2. Pending verification already exists (must expire first)');
        console.log('   3. Per-service rate limit reached');
        console.log('   4. Per-phone-number daily limit reached\n');
        
        console.log('   Solutions:');
        console.log('   ✓ Wait 10-15 minutes for existing verifications to expire');
        console.log('   ✓ Check Twilio Console > Verify > Logs for detailed info');
        console.log('   ✓ Increase rate limits in Twilio Console > Verify > Settings');
        console.log('   ✓ Check if phone number is blocked/flagged\n');
        
        if (err.moreInfo) {
          console.log(`   More Info: ${err.moreInfo}\n`);
        }
      }
    }

    console.log('=================================================\n');

    // Summary recommendations
    console.log('💡 RECOMMENDATIONS:\n');
    console.log('1. Check Twilio Console > Verify > Logs for this phone number');
    console.log('2. Review rate limit settings: Console > Verify > Services > Rate Limits');
    console.log('3. Consider implementing longer wait times between attempts (5+ minutes)');
    console.log('4. Use webhooks (StatusCallback) instead of polling for status\n');

  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
    console.error(error);
  }
}

diagnoseTwilioRateLimit().then(() => {
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
