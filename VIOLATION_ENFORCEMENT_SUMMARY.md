# Violation Enforcement System - Implementation Summary

## Overview

The violation enforcement system is a database-driven mechanism that detects policy violations in user messages, records them, and applies escalating enforcement actions. The system distinguishes between **temporary users** (immediate deletion) and **established accounts** (progressive penalties with redemption opportunities).

**CRITICAL DESIGN:** Self-harm and harm-to-others violations have **zero-tolerance escalation** - 2nd violation triggers immediate permanent account disable.

---

## Architecture

### Core Components

1. **violationDetector.js** - Detection & Classification
   - Detects violations using keyword matching
   - Classifies violations by type and severity
   - Conservative approach to minimize false positives

2. **violationEnforcementCore.js** - Recording & Action Assignment
   - Records violations in database
   - Applies enforcement actions based on violation count
   - Integrates with redemption system (auto-redemption checks before recording)
   - **Special handling for CRITICAL violations (self-harm, harm-to-others)**

3. **violationStatus.js** - Account Status Checks
   - Checks suspension status (with auto-lift if expired)
   - Checks permanent disability status
   - Used to block access to accounts under enforcement

4. **violationRedemption.js** - Redemption System
   - Manages cooling-off periods
   - Automatically redeems eligible violations
   - Provides path to redemption for certain violations

5. **violationResponses.js** - User-Facing Messages
   - Violation notification messages
   - Crisis support information for self-harm
   - Escalation messages (warning → suspension → ban)

6. **violationEnforcement.js** - Barrel Export
   - Consolidates all violation exports for easy importing

---

## Enforced Violations

### 1. **SEXUAL CONTENT** (Severity: HIGH)

**Detection:** Explicit sexual keywords (`porn`, `xxx`, `sexually explicit`, `orgy`, `escort service`)

**Enforcement for Temporary Users:**
- Immediate account deletion
- Message: Standard violation response + trial session ending notice

**Enforcement for Established Accounts:**
- **1st Violation:** WARNING
  - User receives violation response message
  - Redemption opportunity: 7-day cooling-off period
  - Can be cleared if no new violations for 7 days
  - Message includes redemption path explanation
  
- **2nd Violation:** 7-DAY SUSPENSION
  - Account suspended (is_suspended = TRUE)
  - suspension_end_date set to 7 days from now
  - Redemption privilege lost (max 1 redemption for sexual content)
  - User receives suspension message
  
- **3rd+ Violation:** PERMANENT ACCOUNT DISABLE
  - Account permanently disabled (is_account_disabled = TRUE)
  - No appeal path built-in
  - User receives permanent ban message

**Redemption Path:**
- ✅ Only first offense can be redeemed
- ✅ 7-day cooling-off period required
- ✅ No new violations in cooling-off period allows automatic reset

---

### 2. **SELF-HARM / SUICIDE INTENT** (Severity: CRITICAL) ⚠️ ZERO-TOLERANCE ESCALATION

**Detection:** Keywords indicating self-harm intent (`suicide`, `kill myself`, `end my life`, `hurt myself`, `self harm`, `self-harm`, `cut myself`, `overdose`, `jump off`, `hang myself`)

**Enforcement for Temporary Users:**
- Immediate account deletion
- Message: Crisis support hotline information + trial session ending notice

**Enforcement for Established Accounts:**
- **1st Violation:** WARNING (with immediate crisis support)
  - User receives crisis support hotline message
  - Message includes: National Suicide Prevention Lifeline (988), Crisis Text Line (TEXT HOME to 741741), International resources
  - Redemption NOT available (critical safety issue)
  - No automatic progression to suspension/ban
  
- **2nd+ Violation:** ⚠️ IMMEDIATE PERMANENT ACCOUNT DISABLE
  - Account permanently disabled on 2nd violation (zero tolerance escalation)
  - No suspension period; account disabled immediately
  - User receives permanent ban message
  - Manual review recommended by admin

**Redemption Path:**
- ❌ NOT REDEEMABLE
- ❌ Requires professional intervention (outside app scope)
- ✅ Directs to crisis support resources instead
- ❌ No appeal process for permanent ban on 2nd offense

---

### 3. **HARM TO OTHERS** (Severity: CRITICAL) ⚠️ ZERO-TOLERANCE ESCALATION

**Detection:** Keywords indicating intent to harm (`kill someone`, `murder`, `assault someone`, `torture`, `rape`)

**Enforcement for Temporary Users:**
- Immediate account deletion
- Message: Standard violation response + trial session ending notice

**Enforcement for Established Accounts:**
- **1st Violation:** WARNING (record-only, no escalation)
  - User receives violation response message
  - Redemption NOT available (safety threat)
  - Recorded in database for admin review
  
- **2nd+ Violation:** ⚠️ IMMEDIATE PERMANENT ACCOUNT DISABLE
  - Account permanently disabled on 2nd violation (zero tolerance escalation)
  - No suspension period; account disabled immediately
  - User receives permanent ban message
  - Manual review recommended by admin

**Redemption Path:**
- ❌ NOT REDEEMABLE
- ❌ Zero tolerance policy
- ✅ Encourages professional counseling resources
- ❌ No appeal process for permanent ban on 2nd offense

---

### 4. **ABUSIVE / PROFANE LANGUAGE** (Severity: MEDIUM)

**Detection:** Only severe profanity (`fuck`, `shit`, `motherfucker`, `cunt`)

**Enforcement for Temporary Users:**
- Immediate account deletion
- Message: Standard violation response + trial session ending notice

**Enforcement for Established Accounts:**
- **1st Violation:** WARNING
  - User receives violation response message
  - Redemption opportunity: 24-hour cooling-off period
  - Can be cleared if no new violations for 24 hours
  - Message includes redemption path explanation
  
- **2nd Violation:** 7-DAY SUSPENSION
  - Account suspended for 7 days
  - Redemption privilege lost (unlimited redemptions allowed, but escalation still occurs)
  
- **3rd+ Violation:** PERMANENT ACCOUNT DISABLE
  - Account permanently disabled
  - User receives permanent ban message

**Redemption Path:**
- ✅ Unlimited redemptions allowed (reset multiple times)
- ✅ 24-hour cooling-off period required
- ✅ Automatic reset if no new violations within cooling-off period

---

### 5. **NOT ENFORCED** (Oracle Guardrails)

The following violations are **not enforced** at the violation system level. Instead, the Oracle guardrails system prevents the AI from responding:

- **Financial Advice Requests** - Oracle refuses to provide; not recorded as violation
- **Medical Advice Requests** - Oracle refuses to provide; not recorded as violation

---

## Violation Enforcement Flow

```
User sends message
         ↓
[applyPendingRedemptions] → Check if any violations are eligible for automatic reset
         ↓
No redeemable violations found? Continue
         ↓
[detectViolation] → Check for keywords/patterns
         ↓
No violation found? → Continue normally
         ↓
Violation found? → [recordViolationAndGetAction]
         ↓
Step 1: Get current violation count for this violation type
         ↓
Step 2: Record new violation in database
         ↓
Step 3: Is TEMPORARY user?
         ├─ YES → DELETE account + return getTempAccountViolationResponse()
         └─ NO → Continue to Step 4
         ↓
Step 4: Is CRITICAL violation (self-harm or harm to others)?
         ├─ YES → Apply ZERO-TOLERANCE escalation
         │  ├─ Count = 1 → WARNING
         │  └─ Count ≥ 2 → PERMANENT DISABLE (immediate)
         │
         └─ NO → Apply STANDARD escalation
            ├─ Count = 1 → WARNING + Redemption message
            ├─ Count = 2 → SUSPEND 7 days
            └─ Count ≥ 3 → PERMANENT DISABLE
         ↓
Return action + response message
```

---

## Redemption System Details

### Automatic Redemption Check

When a user sends a new message, **before** checking for new violations:
1. System calls `applyPendingRedemptions(userId)`
2. Checks all redeemable violation types (ABUSIVE_LANGUAGE, SEXUAL_CONTENT)
3. If cooling-off period has passed AND no new violations occurred → violation count reset to 0
4. User gets fresh slate for that violation type
5. If they violate again, it counts as "violation #1" again

### Redeemable Violations Configuration

| Violation Type | Cooling Period | Max Redemptions | 2nd Violation Action | Notes |
|---|---|---|---|---|
| ABUSIVE_LANGUAGE | 24 hours | Unlimited | 7-day suspension | Momentary outbursts; can be redeemed multiple times |
| SEXUAL_CONTENT | 7 days | 1 time only | 7-day suspension | Boundary testing; first offense only |
| SELF_HARM | — | 0 (Not redeemable) | **PERMANENT DISABLE** | Critical safety issue; zero tolerance escalation |
| HARM_OTHERS | — | 0 (Not redeemable) | **PERMANENT DISABLE** | Critical safety issue; zero tolerance escalation |

### Redemption Messages

After first violation warning (if redeemable), system appends:

**For ABUSIVE_LANGUAGE:**
```
💫 **A Path Forward:** We understand that moments of frustration happen. If you keep your 
interactions respectful over the next 24 hours, this warning will be cleared from your record 
and we'll start fresh. We believe in your ability to engage positively. ✨
```

**For SEXUAL_CONTENT:**
```
💫 **A Path Forward:** Everyone tests boundaries sometimes. If you can honor our community 
guidelines for the next 7 days, this warning will be cleared and you'll get a fresh start. 
We trust you can grow from this. ✨
```

**Note:** Critical violations (SELF_HARM, HARM_OTHERS) have NO redemption messages - they receive only the base response.

---

## Database Operations

### Tables Used

**user_violations**
```sql
- user_id_hash (hashed for privacy)
- violation_type (sexual_content, self_harm, harm_others, abusive_language)
- violation_count (incremental counter, reset to 0 on redemption)
- violation_message (actual message content, truncated to 500 chars)
- last_violation_timestamp (timestamp of most recent violation)
- violation_redeemed_at (when violation was reset, nullable)
- is_account_disabled (boolean for permanent ban)
- created_at, updated_at
```

**user_personal_info**
```sql
- user_id
- is_suspended (boolean)
- suspension_end_date (when suspension expires, auto-lifted when expired)
```

### Key Database Operations

1. **Get current violation count:**
   ```sql
   SELECT violation_count FROM user_violations 
   WHERE user_id_hash = $1 AND violation_type = $2 
   ORDER BY created_at DESC LIMIT 1
   ```

2. **Record new violation:**
   ```sql
   INSERT INTO user_violations (user_id_hash, violation_type, violation_count, violation_message, last_violation_timestamp)
   VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
   ```

3. **Apply 7-day suspension:**
   ```sql
   UPDATE user_personal_info 
   SET is_suspended = TRUE, suspension_end_date = CURRENT_TIMESTAMP + 7 days
   WHERE user_id = $1
   ```

4. **Mark account permanently disabled:**
   ```sql
   UPDATE user_violations 
   SET is_account_disabled = TRUE 
   WHERE user_id_hash = $1
   ```

5. **Reset violation count (redemption):**
   ```sql
   UPDATE user_violations 
   SET violation_count = 0, violation_redeemed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
   WHERE user_id_hash = $1 AND violation_type = $2
   ```

---

## User-Facing Messages

### Violation Response Structure

Every violation type returns from `getViolationResponse(violationType)` with:
1. Acknowledgement of the user's interaction
2. Explanation of why content violates policy
3. Redirection to appropriate topics
4. Respectful, supportive tone

### Base Responses

**SEXUAL_CONTENT:**
```
I appreciate your trust, but I'm not able to discuss sexual or adult content. I'm here to 
provide spiritual guidance through tarot, astrology, and crystal wisdom. Let's refocus on a 
topic I can truly help with—perhaps a question about your life path, relationships, career, 
or personal growth. What else calls to your soul today?
```

**SELF_HARM (CRISIS RESPONSE):**
```
I hear that you're going through something difficult, and I want you to know that your 
wellbeing matters deeply. While I can offer spiritual guidance, what you're experiencing 
needs immediate, professional support.

🔴 **National Suicide Prevention Lifeline: 988** (US)
📱 **Crisis Text Line: Text HOME to 741741**
🌍 **International Crisis Lines: findahelpline.com**

You are not alone, and help is available right now. Please contact one of these resources. 
Your life has value.
```

**HARM_OTHERS:**
```
I cannot provide guidance on harming others. Tarot and astrology are tools for understanding 
ourselves and making positive choices. If you're experiencing conflict or anger, I encourage 
you to seek support from a counselor or therapist. Is there something else—perhaps a personal 
challenge or life question—I can help you explore instead?
```

**ABUSIVE_LANGUAGE:**
```
I appreciate you being here, but I'm not able to engage with abusive or profane language. 
This space is meant to be respectful and supportive for all who seek guidance. I'm here to 
offer you spiritual wisdom through tarot, astrology, and crystal energy—but only within a 
respectful, constructive dialogue. Would you like to rephrase your question in a way that 
allows us to work together more positively?
```

### Escalation Messages

**WARNING (1st Offense):**
- Base response + "Note: This is your first warning for this type of content. Future violations may result in account restrictions."
- Plus redemption message (if redeemable)

**SUSPENSION (2nd Offense - Standard Violations Only):**
- Base response + "Account Action: Your account has been suspended for 7 days due to repeated guideline violations. You will be able to access your account again after the suspension period. If you believe this is in error, please contact support."

**PERMANENT BAN (3rd+ Offense - Standard / 2nd+ Offense - Critical):**
- Base response + "Account Action: Your account has been permanently disabled due to repeated violations of our community guidelines. If you wish to appeal this decision, please contact our support team."

### Temporary Account Violation Response
- Base violation response + "*Your trial session is ending. Please restart the app to begin a new session.*"

---

## Integration Points

### Called By

- **Messages/Chat Handler** - When processing user messages before sending to Oracle
- Must call `isAccountSuspended(userId)` to block suspended users
- Must call `isAccountDisabled(userId)` to block permanently banned users

### Exported Functions

- `detectViolation(userMessage)` - Detect if message contains violations
- `recordViolationAndGetAction(userId, violationType, userMessage, isTemporaryUser)` - Record and enforce
- `isAccountSuspended(userId)` - Check suspension status (with auto-lift)
- `isAccountDisabled(userId)` - Check permanent disable status
- `applyPendingRedemptions(userId)` - Auto-reset eligible violations
- `getViolationResponse(violationType)` - Get base violation message
- `getTempAccountViolationResponse(violationType)` - Get temp account message
- `getWarningResponse(violationType, violationCount)` - Get warning message
- `getSuspensionResponse(violationType)` - Get suspension message
- `getPermanentBanResponse(violationType)` - Get ban message

### Error Handling

- All functions have try-catch blocks
- Errors logged with `[VIOLATION]` or `[VIOLATION-REDEMPTION]` prefix
- Database errors do not crash system; returned as false/empty/empty array

---

## Key Design Decisions

### 1. **Conservative Detection**
- Only clear intent keywords detected (minimizes false positives)
- Multiple-word phrases required for some violations (e.g., "kill myself" not just "kill")
- Includes substring matching for complete phrase detection

### 2. **Temporary User → Immediate Delete**
- Trial users cannot redeem or appeal
- One violation = account deleted
- Prevents abuse/spam account cycling

### 3. **Zero-Tolerance Escalation for Critical Violations**
- SELF_HARM and HARM_OTHERS: 2nd violation = immediate permanent ban (no suspension period)
- This reflects the critical safety nature of these violations
- No redemption path; no appeal process

### 4. **Standard Escalation for Other Violations**
- Warning (1st) → Suspension (2nd) → Ban (3rd+)
- Clear expectations about consequences
- Temporary suspension allows reflection before permanent ban

### 5. **Automatic Suspension Lifting**
- `isAccountSuspended()` automatically lifts expired suspensions
- Sets is_suspended = FALSE and suspension_end_date = NULL when checking status
- No manual admin action required

### 6. **Automatic Redemption System**
- Called at message intake (before violation detection)
- No user action required (happens behind the scenes)
- Users see fresh slate when they behave; understand they got a second chance

### 7. **Redemption Limits**
- ABUSIVE_LANGUAGE: Unlimited redemptions (momentary lapses)
- SEXUAL_CONTENT: 1 redemption only (boundary testing, not habitual)
- SELF_HARM & HARM_OTHERS: Zero redemptions (safety/health critical)

### 8. **No Firebase**
- Simplified, database-only implementation
- All operations recorded to PostgreSQL
- Faster violation recording with fewer external dependencies

### 9. **User ID Hashing**
- Privacy protection in violation records
- Cannot link violations back to user via database inspection
- Hash function consistent across all checks using `hashUserId()`

---

## Testing & Monitoring

### What to Monitor

1. **Violation rate by type** - Are users hitting warnings? Suspensions?
2. **Redemption rate** - How many users successfully redeem?
3. **Escalation rate** - What % reach permanent ban?
4. **False positives** - Are legitimate messages being caught?
5. **Auto-lift success** - Are suspension expirations lifting properly?
6. **Critical violation escalation** - Are 2nd self-harm/harm-to-others violations immediately disabled?

### Testing Scenarios

- Send message with self-harm keyword → verify crisis hotline appears (no escalation)
- First self-harm violation → verify warning, no permanent ban
- **Second self-harm violation → verify IMMEDIATE permanent disable (not suspension)**
- First harm-to-others violation → verify warning message
- **Second harm-to-others violation → verify IMMEDIATE permanent disable (not suspension)**
- First violation (abusive language) → verify warning + 24-hour redemption message
- Wait 24+ hours with no new violations → verify violation resets automatically
- Second violation (abusive language) → verify 7-day suspension applied
- Check suspended account → verify auto-lifted if expired
- Suspended user sends message → verify status blocks account properly
- Third+ violation (abusive language) → verify is_account_disabled flag set
- Check permanent ban → verify isAccountDisabled() returns true

---

## Limitations & Future Enhancements

### Current Limitations

- Keyword-based detection (not AI-powered contextual analysis)
- Cannot distinguish between "I feel suicidal" vs. "I'm thinking about suicide" vs. "suicide is bad"
- No appeal process for permanent bans (though "contact support" is mentioned)
- No manual review workflow for admins
- Redemption is automatic (no user action required - intentional design choice)
- No notification to users when they're automatically redeemed
- **Critical violations: immediate permanent ban on 2nd offense with no appeal path**

### Potential Enhancements

- Admin dashboard to view/manage violations
- Manual appeal workflow for permanent bans with support team (not available for critical violations)
- More sophisticated NLP-based detection
- Violation severity scoring system
- Pattern detection (multiple users reporting same issue)
- Webhook notifications for critical violations (self-harm)
- Violation history dashboard for users
- User notification when automatic redemption occurs
- Per-user configuration for redemption policies
- Escalation to human support at certain thresholds
- Review process for critical violation bans at 30+ days for rehabilitation consideration
