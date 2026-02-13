# AWS SMS Registration Guide - 2FA Authentication

## 📋 Registration Information Required

This document provides all necessary information to complete AWS SMS registration for 2FA authentication.

---

## 1. ✅ OPT-IN WORKFLOW DESCRIPTION

### Company Name
**Starship Psychics**

### Use Case
Two-Factor Authentication (2FA) for account security

### Detailed Opt-In Process

Users explicitly opt-in to receive SMS messages through the following workflow:

1. **Initial Account Creation**
   - User creates an account using email/password or social login
   - Account is created with email-only authentication

2. **Security Settings Access**
   - User navigates to Settings → Security page after login
   - User sees "Two-Factor Authentication" section

3. **Phone Number Entry (Required for SMS 2FA)**
   - User clicks "Add Phone Number" or "Verify Phone Number"
   - A modal/form appears requesting phone number in international format
   - Clear disclosure states: "By providing your phone number and enabling SMS verification, you consent to receive verification codes via SMS from Starship Psychics for account security purposes."
   - User enters phone number and clicks "Verify Phone Number"

4. **Initial Verification**
   - System sends first verification code via SMS
   - User enters code to verify phone number ownership
   - Phone number is marked as "verified" in the system

5. **Enabling 2FA with SMS**
   - After phone verification, user can enable 2FA
   - User toggles "Enable Two-Factor Authentication" switch
   - User selects "SMS" as verification method
   - Clear confirmation message: "When enabled, you'll receive a verification code via SMS each time you log in from a new device or location."
   - User confirms activation

6. **Ongoing Usage**
   - SMS codes are ONLY sent when user initiates login
   - Each code is user-requested through the login flow
   - User can disable SMS 2FA at any time in Security Settings

### Important Compliance Notes
- SMS messages are NEVER promotional
- SMS messages are ONLY for authentication/security
- Users must verify phone ownership before SMS codes are sent
- Users can opt-out at any time by disabling 2FA in settings
- Maximum message frequency: 2-3 per login session
- No recurring messages - only sent on-demand during login attempts

---

## 2. 📱 OPT-IN WORKFLOW IMAGE

### What to Provide

You need to create screenshots or mockups showing:

**Image 1: Security Settings Page - Phone Number Entry**
- Show the Security Settings page
- Highlight the "Phone Number" section
- Include the phone input field
- Show the consent language clearly visible
- Mark the "Verify Phone Number" button

**Image 2: Phone Verification Modal**
- Show the verification code entry screen
- Display where user enters the 6-digit code
- Show example text: "Enter the code sent to +1 (555) 000-0000"

**Image 3: 2FA Settings Panel**
- Show the 2FA toggle/enable switch
- Display SMS as selected method
- Show clear description of what user is consenting to
- Include the "Enable 2FA" button

**Image 4: Login 2FA Screen**
- Show the 2FA code entry during login
- Display "Enter verification code sent to your phone"
- Show branded header with "Starship Psychics" or your logo

### How to Create Images

**Option A: Take Screenshots**
1. Open your application at: `http://localhost:3000` or your live site
2. Navigate to Settings → Security
3. Take screenshot of each step mentioned above
4. Annotate images with arrows/highlights if needed

**Option B: Create Mockups**
1. Use Figma, Sketch, or similar tool
2. Create mockups showing the opt-in flow
3. Include branding (logo, app name)
4. Show clear consent language

### Image Requirements
- Format: PNG or JPG
- Resolution: At least 1280x720 pixels
- Show your branding clearly (app name, logo)
- Include the consent/disclosure text visibly
- Label each image (e.g., "Step 1: Phone Entry", "Step 2: Verification")

---

## 3. 📧 MESSAGE EXAMPLES

### Current Message Format (UNBRANDED - NEEDS UPDATE)

**Current:**
```
Your verification code is: 123456

This code expires in 10 minutes. Do not share this code with anyone.
```

### ✅ RECOMMENDED BRANDED MESSAGE FORMATS

**Option 1 (Recommended - 156 chars):**
```
Starship Psychics Security Code: 123456

Your verification code expires in 10 minutes. Do not share this code.

Reply STOP to opt out.
```

**Option 2 (Shorter - 132 chars):**
```
Starship Psychics: Your code is 123456 (expires in 10 min). Never share this code. Reply STOP to opt out.
```

**Option 3 (Very Short - 94 chars):**
```
Starship Psychics code: 123456
Expires in 10 min. Don't share.
Reply STOP to opt out.
```

### Message Requirements for AWS
- ✅ Include company/app name (Starship Psychics)
- ✅ Include opt-out instructions (Reply STOP)
- ✅ State code expiration clearly
- ✅ Keep under 160 characters if possible (to avoid split messages)
- ✅ Use "Transactional" SMS type (already set in code)

---

## 4. 🔧 CODE UPDATES NEEDED

### Update SMS Message in `api/shared/smsService-aws.js`

**Find this code (around line 135):**
```javascript
const message = `Your verification code is: ${code}\n\nThis code expires in 10 minutes. Do not share this code with anyone.`;
```

**Replace with (Option 2 - fits in 160 chars):**
```javascript
const message = `Starship Psychics: Your code is ${code} (expires in 10 min). Never share this code. Reply STOP to opt out.`;
```

---

## 5. 📝 AWS REGISTRATION FORM - HOW TO FILL IT OUT

### Section 1: Use Case
- **Use Case Type:** Two-Factor Authentication (2FA)
- **Description:** "SMS-based two-factor authentication codes for secure user login"

### Section 2: Opt-In Workflow Description
Copy the text from **Section 1** above - the "Detailed Opt-In Process"

### Section 3: Opt-In Workflow Images
Upload the screenshots/mockups from **Section 2** above

### Section 4: Message Examples
Provide ONE of the BRANDED message examples from **Section 3** above (I recommend Option 2)

### Section 5: Website/Application URL
- **Production URL:** `https://starshippsychics.com` (or your actual domain)
- **Terms of Service:** Link to your terms page
- **Privacy Policy:** Link to your privacy policy page

### Section 6: Compliance
- ✅ TCPA Compliant (user explicitly opts in)
- ✅ CTIA Guidelines (transactional messages only)
- ✅ SMS is only for authentication (not marketing)
- ✅ Users can opt-out any time (disable 2FA in settings)

### Section 7: Company Information
- **Company Name:** Starship Psychics (or your legal entity name)
- **Website:** Your domain
- **Contact Email:** Your support email
- **Contact Phone:** Your business phone

---

## 6. 🚀 IMPLEMENTATION CHECKLIST

### Before Resubmitting to AWS:

- [ ] **Update SMS message to include branding** (see code update below)
- [ ] **Add opt-out handling** (see Section 7)
- [ ] **Take screenshots of opt-in flow** (see Section 2)
- [ ] **Ensure consent language is visible in UI**
  - Add text: "By verifying your phone, you consent to receive SMS authentication codes from Starship Psychics"
- [ ] **Review Terms of Service** - Ensure it mentions SMS for 2FA
- [ ] **Review Privacy Policy** - Ensure it mentions phone number storage and SMS usage

### AWS Registration Steps:

1. **Log in to AWS Console**
2. **Navigate to:** Pinpoint → Settings → SMS and voice → 10DLC registration
   - OR: SNS → Text messaging (SMS) → Register phone number
3. **Create new registration** or **Edit existing registration**
4. **Fill out all sections** using information from this guide
5. **Upload images** showing opt-in workflow
6. **Submit for review**

### Expected Timeline:
- Registration review: 1-3 business days
- If approved: SMS registration active immediately
- If denied: Review feedback and resubmit with corrections

---

## 7. 📞 IMPORTANT: STOP HANDLING

AWS requires you to handle STOP responses. Add this functionality:

### Required Database Table
```sql
CREATE TABLE IF NOT EXISTS sms_opt_outs (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    opted_out_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_opt_outs_phone 
ON sms_opt_outs(phone_number);
```

### Add Opt-Out Check Before Sending
Before calling `sendSMS()`, check if user has opted out:
```javascript
const optOutCheck = await db.query(
  'SELECT * FROM sms_opt_outs WHERE phone_number = $1',
  [phoneNumber]
);

if (optOutCheck.rows.length > 0) {
  return {
    success: false,
    error: 'User has opted out of SMS messages'
  };
}
```

---

## 8. 🎯 QUICK START: WHAT TO DO RIGHT NOW

### Step 1: Update the SMS Message (5 minutes)
Run the following command to update your SMS service:

```bash
# Open the file
code api/shared/smsService-aws.js
```

Then find line ~135 and replace the message with the branded version (see Section 4).

### Step 2: Take Screenshots (15 minutes)
1. Start your app: `npm start` (in client folder)
2. Navigate to Settings → Security
3. Take 4 screenshots as described in Section 2

### Step 3: Fill Out AWS Registration (20 minutes)
1. Go to AWS Console
2. Navigate to SNS or Pinpoint
3. Find your SMS registration
4. Update with information from Section 5
5. Upload your screenshots
6. Submit for review

**Total Time: ~40 minutes**

---

## 9. ❓ FAQ

**Q: Why was my registration denied?**
A: AWS detected that your opt-in process wasn't clearly documented, your messages weren't branded, or your images didn't show the opt-in flow.

**Q: Can I use SMS for marketing after approval?**
A: NO! This registration is ONLY for transactional 2FA codes. Marketing SMS requires separate approval (10DLC registration).

**Q: How long until approval?**
A: Typically 1-3 business days. Complex cases may take up to 7 days.

**Q: What if I don't have screenshots?**
A: Create mockups using Figma/Sketch or take screenshots once you implement the opt-in UI.

**Q: Do I need to handle HELP/STOP keywords?**
A: YES! STOP is required by law (TCPA). HELP is recommended but not mandatory.

**Q: What if my message is too long?**
A: Use Option 3 from Section 3 (94 characters) which fits easily in 160 chars.

---

## 10. 📚 ADDITIONAL RESOURCES

- [AWS SNS SMS Best Practices](https://docs.aws.amazon.com/sns/latest/dg/channels-sms-best-practices.html)
- [10DLC Registration Guide](https://docs.aws.amazon.com/pinpoint/latest/userguide/settings-sms-10dlc.html)
- [TCPA Compliance Guide](https://www.fcc.gov/general/telemarketing-and-robocalls)
- [CTIA Messaging Principles](https://www.ctia.org/the-wireless-industry/industry-commitments/messaging-principles-and-best-practices)

---

## 11. 🔍 EXAMPLE AWS REGISTRATION SUBMISSION

Here's exactly what to write in each field:

**Registration Name:** `Starship Psychics 2FA`

**Use Case:** `Two-Factor Authentication`

**Opt-in Workflow Description:**
```
Users opt-in through the following process:
1. User logs into Starship Psychics application
2. User navigates to Settings > Security page
3. User sees option to "Enable Two-Factor Authentication"
4. User clicks "Add Phone Number" button
5. User sees consent message: "By providing your phone number, you consent to receive SMS verification codes from Starship Psychics for authentication purposes"
6. User enters phone number and clicks "Verify"
7. System sends first verification code via SMS
8. User enters code to confirm phone ownership
9. User enables 2FA and selects "SMS" as method
10. User confirms activation

SMS codes are only sent when user initiates login. User can disable SMS 2FA at any time in Security Settings. Messages are never promotional - only transactional authentication codes.
```

**Message Example:**
```
Starship Psychics: Your code is 123456 (expires in 10 min). Never share this code. Reply STOP to opt out.
```

**Website:** `https://starshippsychics.com`

**Opt-out Process:** `Users can reply STOP to any message or disable 2FA in account settings`

---

**Last Updated:** February 12, 2026
**Application:** Starship Psychics - Psychic Chat POC
**Use Case:** Two-Factor Authentication (2FA)
