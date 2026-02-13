# Twilio Phone Number Setup Guide

Complete guide for setting up Twilio phone numbers for SMS verification in Starship Psychics.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Create Twilio Account](#step-1-create-twilio-account)
3. [Step 2: Purchase a Phone Number](#step-2-purchase-a-phone-number)
4. [Step 3: Set Up Twilio Verify Service](#step-3-set-up-twilio-verify-service)
5. [Step 4: Configure Environment Variables](#step-4-configure-environment-variables)
6. [Step 5: Test Your Setup](#step-5-test-your-setup)
7. [Troubleshooting](#troubleshooting)
8. [Cost Comparison](#cost-comparison)
9. [Migration from AWS SNS](#migration-from-aws-sns)

---

## Prerequisites

✅ **What You Need:**
- Credit card or payment method
- Phone number for account verification
- Business email address
- Access to your application's environment variables

💰 **Expected Costs:**
- Phone number: ~$1.15/month (US local number)
- SMS messages: $0.0079 per message (US)
- Twilio Verify API: $0.05 per verification attempt

---

## Step 1: Create Twilio Account

### 1.1 Sign Up for Twilio

1. **Go to Twilio:**
   ```
   https://www.twilio.com/try-twilio
   ```

2. **Fill out the registration form:**
   - First Name: Your name
   - Last Name: Your last name
   - Email: Your business email
   - Password: Create a strong password

3. **Verify your email:**
   - Check your email inbox
   - Click the verification link

4. **Complete phone verification:**
   - Enter your phone number
   - Enter the verification code sent to your phone

### 1.2 Complete Profile Setup

1. **Answer Twilio's questions:**
   - **Which Twilio product are you here to use?**  
     Select: "SMS"
   
   - **What do you plan to build?**  
     Select: "2FA & Notifications"
   
   - **How do you want to build with Twilio?**  
     Select: "With code"
   
   - **What's your preferred language?**  
     Select: "Node.js"

2. **Get your free trial credit:**
   - Twilio provides $15.50 in free trial credit
   - No credit card required for trial

### 1.3 Get Your Account Credentials

1. **Navigate to Console Dashboard:**
   ```
   https://console.twilio.com/
   ```

2. **Find your credentials (top right):**
   - **Account SID**: Starts with "AC..."
   - **Auth Token**: Click "Show" to reveal

3. **Copy these values** - you'll need them for environment variables

---

## Step 2: Purchase a Phone Number

### 2.1 Buy a Phone Number

1. **Navigate to Phone Numbers:**
   ```
   Console → Develop → Phone Numbers → Manage → Buy a number
   ```
   Direct link: https://console.twilio.com/us1/develop/phone-numbers/manage/search

2. **Configure your search:**
   - **Country:** United States (+1)
   - **Capabilities:** Check "SMS"
   - **Number type:** Local
   - *Optional:* Enter area code if you want a specific region

3. **Click "Search"**

4. **Select a number:**
   - Choose a number from the results
   - Click "Buy" button
   - Confirm purchase (~$1.15/month)

### 2.2 Configure Your Phone Number

1. **Navigate to your phone number:**
   ```
   Console → Phone Numbers → Manage → Active numbers → Click your number
   ```

2. **Configure Messaging:**
   
   **A webhook URL** (for receiving replies like "STOP"):
   - Under "Messaging Configuration"
   - **A Message Comes In:** 
     ```
     https://your-api-domain.com/api/sms-webhook
     ```
   - **HTTP Method:** POST

3. **Save configuration**

### 2.3 Get Your Phone Number

- Copy your purchased phone number (format: +15555555555)
- You'll need this for `TWILIO_PHONE_NUMBER` environment variable

---

## Step 3: Set Up Twilio Verify Service

Twilio Verify is a managed service for 2FA that handles:
- Code generation
- Code expiration (10 minutes)
- Rate limiting
- Delivery optimization

### 3.1 Create a Verify Service

1. **Navigate to Verify:**
   ```
   Console → Develop → Verify → Services
   ```
   Direct link: https://console.twilio.com/us1/develop/verify/services

2. **Click "Create new Service"**

3. **Configure the service:**
   - **Friendly Name:** `Starship Psychics 2FA`
   - **Code Length:** 6 digits
   - **Code Expiration:** 10 minutes
   - **Do Not Disturb:** Enabled (respects quiet hours)

4. **Click "Create"**

### 3.2 Get Your Verify Service SID

1. After creation, you'll see your service
2. **Copy the Service SID** (starts with "VA...")
3. You'll need this for `TWILIO_VERIFY_SERVICE_SID`

### 3.3 Configure Verify Settings

1. **Click on your service name**
2. **Settings tab:**
   - Enable "Friendly Name" in messages
   - Configure rate limits (recommended: 5 attempts per number per hour)
   - Enable "Do Not Disturb" to respect quiet hours

---

## Step 4: Configure Environment Variables

### 4.1 Add Twilio Variables to .env

Add these to your `.env` file (in API directory):

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15555555555
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 4.2 Add to AWS Secrets Manager (Production)

For production deployment on AWS:

```bash
# Create Twilio secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name prod/starship-psychics/twilio \
  --secret-string '{
    "TWILIO_ACCOUNT_SID": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "TWILIO_AUTH_TOKEN": "your_auth_token_here",
    "TWILIO_PHONE_NUMBER": "+15555555555",
    "TWILIO_VERIFY_SERVICE_SID": "VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  }'
```

### 4.3 Update ECS Task Definition

Add to your task definition environment variables or secrets:

```json
{
  "name": "TWILIO_ACCOUNT_SID",
  "valueFrom": "arn:aws:secretsmanager:region:account-id:secret:prod/starship-psychics/twilio:TWILIO_ACCOUNT_SID::"
}
```

---

## Step 5: Test Your Setup

### 5.1 Test from Console (Quick Test)

1. **Go to Verify Service:**
   ```
   Console → Verify → Services → Your Service
   ```

2. **Click "Try it out" or "Send test verification"**

3. **Enter your phone number** (with country code: +15555555555)

4. **Click "Send Code"**

5. **Check your phone** for the verification code

6. **Enter the code** to verify it works

### 5.2 Test from Your Application

#### Option A: Using Test Script

Create a test file `test-twilio.js`:

```javascript
import twilio from 'twilio';
import 'dotenv/config';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function testTwilio() {
  try {
    console.log('Testing Twilio Verify...');
    
    // Replace with your phone number
    const phoneNumber = '+15555555555';
    
    // Send verification code
    console.log(`Sending code to ${phoneNumber}...`);
    const verification = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications
      .create({ to: phoneNumber, channel: 'sms' });
    
    console.log('✅ Code sent!');
    console.log('Status:', verification.status);
    console.log('SID:', verification.sid);
    
    // Prompt for code (you'll need to modify this for actual input)
    const code = '123456'; // Replace with actual code from SMS
    
    // Verify code
    console.log(`\nVerifying code ${code}...`);
    const verificationCheck = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks
      .create({ to: phoneNumber, code: code });
    
    console.log('✅ Verification complete!');
    console.log('Status:', verificationCheck.status);
    console.log('Valid:', verificationCheck.valid);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Code:', error.code);
  }
}

testTwilio();
```

Run it:
```bash
cd api
node test-twilio.js
```

#### Option B: Test Through Your Application

1. **Start your application:**
   ```bash
   npm run dev
   ```

2. **Navigate to Security Settings:**
   ```
   http://localhost:3000/settings/security
   ```

3. **Add phone number and verify:**
   - Enter your phone number
   - Click "Verify Phone Number"
   - Enter the code you receive
   - Confirm it works!

### 5.3 Test SMS Webhook (STOP Handling)

1. **Text "STOP" to your Twilio number**
2. **Check your webhook endpoint** receives the request
3. **Verify opt-out is recorded** in database

---

## Troubleshooting

### ❌ Error: "Unable to create record: Permission denied"

**Problem:** Trial account limitations

**Solution:**
1. Upgrade to paid account
2. Or verify phone numbers in Twilio Console first:
   ```
   Console → Phone Numbers → Manage → Verified Caller IDs
   ```

### ❌ Error: "The message From/To pair violates a blacklist rule"

**Problem:** Number is on Twilio's blacklist (opted out)

**Solution:**
1. Remove from blacklist:
   ```
   Console → Messaging → Settings → Opt-Out Management
   ```

### ❌ Error: "Authenticate"

**Problem:** Wrong Account SID or Auth Token

**Solution:**
1. Double-check credentials in `.env`
2. Ensure no extra spaces or quotes
3. Regenerate Auth Token if needed:
   ```
   Console → Account → API keys & tokens → Auth tokens
   ```

### ❌ Error: "Service SID not found"

**Problem:** Wrong Verify Service SID

**Solution:**
1. Check Service SID:
   ```
   Console → Verify → Services
   ```
2. Copy the correct SID (starts with "VA")

### ❌ Messages Not Sending

**Problem:** Various causes

**Check:**
1. **Phone number format:** Must be E.164 (+15555555555)
2. **Account status:** Is your account suspended?
3. **Balance:** Do you have credit?
4. **Geographic permissions:**
   ```
   Console → Messaging → Settings → Geo permissions
   ```
5. **Message logs:**
   ```
   Console → Monitor → Logs → Messaging logs
   ```

### ❌ Rate Limit Errors

**Problem:** Too many requests

**Solution:**
1. Check Verify rate limits:
   ```
   Console → Verify → Services → Settings
   ```
2. Implement rate limiting in your app (already done in `smsService.js`)
3. Increase limits (paid accounts only)

---

## Cost Comparison

### AWS SNS vs. Twilio

| Feature | AWS SNS | Twilio Verify |
|---------|---------|---------------|
| **SMS Cost (US)** | $0.00645/msg | $0.0079/msg |
| **Setup Cost** | Free | ~$1.15/month (phone) |
| **Verification** | $0.00645/msg | $0.05/verification |
| **Free Tier** | 100 msgs/month forever | $15.50 trial credit |
| **Rate Limits** | 20 msg/sec | 5-10 verifications/min |
| **Code Management** | Manual (you handle) | Automatic (Twilio handles) |
| **Delivery Reports** | Basic | Detailed + insights |
| **Geographic Coverage** | 240+ countries | 200+ countries |
| **10DLC Registration** | Required for volume | Required for volume |

### Cost Example: 1,000 verifications/month

**AWS SNS:**
- 1,000 SMS × $0.00645 = **$6.45/month**
- You manage codes, expiration, rate limits

**Twilio Verify:**
- 1,000 verifications × $0.05 = **$50/month**
- Phone number: $1.15/month
- **Total: $51.15/month**
- Twilio manages everything

### Recommendation

- **Low volume (<100/month):** Use Twilio (easier setup, better DX)
- **High volume (>1000/month):** Use AWS SNS (much cheaper)
- **Medium volume:** Either works, depends on your preference

---

## Migration from AWS SNS

If you want to switch from AWS SNS to Twilio:

### Step 1: Install Twilio SDK

```bash
cd api
npm install twilio
```

### Step 2: Switch SMS Service

In files that use SMS, change the import:

**From:**
```javascript
import { sendSMS, verifySMSCode } from './shared/smsService-aws.js';
```

**To:**
```javascript
import { sendSMS, verifySMSCode } from './shared/smsService.js';
```

### Step 3: Update Environment Variables

Add Twilio variables (see Step 4 above)

### Step 4: Test Thoroughly

Test all SMS flows:
- Phone verification
- 2FA login
- Password reset
- Opt-out handling

### Files That Use SMS Service:

```
api/services/security/phoneService.js
api/services/security/verificationCodeService.js
api/routes/auth-endpoints/*.js
```

Use global search to find all imports:
```bash
grep -r "smsService" api/
```

---

## Using Both Services (Hybrid Approach)

You can use both AWS and Twilio with fallback logic:

```javascript
import { sendSMS as sendSMS_AWS } from './shared/smsService-aws.js';
import { sendSMS as sendSMS_Twilio } from './shared/smsService.js';

async function sendSMSWithFallback(phoneNumber) {
  // Try AWS first (cheaper)
  let result = await sendSMS_AWS(phoneNumber);
  
  // Fallback to Twilio if AWS fails
  if (!result.success) {
    console.log('AWS SNS failed, trying Twilio...');
    result = await sendSMS_Twilio(phoneNumber);
  }
  
  return result;
}
```

---

## Additional Resources

- [Twilio Verify Documentation](https://www.twilio.com/docs/verify/api)
- [Twilio Console](https://console.twilio.com/)
- [Twilio Status Page](https://status.twilio.com/)
- [Twilio SMS Best Practices](https://www.twilio.com/docs/sms/send-messages#best-practices)
- [10DLC Registration](https://www.twilio.com/docs/sms/a2p-10dlc)

---

## Quick Reference

### Environment Variables

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15555555555
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Twilio Console Links

- **Dashboard:** https://console.twilio.com/
- **Phone Numbers:** https://console.twilio.com/us1/develop/phone-numbers/manage/search
- **Verify Services:** https://console.twilio.com/us1/develop/verify/services
- **Message Logs:** https://console.twilio.com/us1/monitor/logs/sms
- **Billing:** https://console.twilio.com/us1/billing

### Support

- **Twilio Support:** https://support.twilio.com/
- **Community Forum:** https://www.twilio.com/community
- **Status Updates:** https://status.twilio.com/

---

**Last Updated:** February 12, 2026  
**Application:** Starship Psychics - Psychic Chat POC  
**Use Case:** Two-Factor Authentication (2FA)
