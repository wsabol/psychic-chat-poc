# Violation Enforcement System - Implementation Summary

## Overview

The violation enforcement system is a database-driven mechanism that detects policy violations in user messages, records them, and applies escalating enforcement actions. The system distinguishes between **temporary users** (immediate deletion) and **established accounts** (progressive penalties with redemption opportunities).

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
   - Integrates with redemption system

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

---

## Enforced Violations

### 1. **SEXUAL CONTENT** (Severity: HIGH)
**Detection:** Explicit sexual keywords (porn, xxx, sexually explicit, orgy, escort service)

**Enforcement for Temporary Users:**
- Immediate account deletion
- Message: Standard violation response + trial session ending notice

**Enforcement for Established Accounts:**
- **1st Violation:** WARNING
  - User receives violation response message
  - Redemption opportunity: 7-day cooling-off period
  - Can be cleared if no new violations for 7 days
  
- **2nd Violation:** 7-DAY SUSPENSION
  - Account suspended (is_suspended = TRUE)
  - suspension_end_date set to 7 days from now
  - Redemption privilege lost (max 1 redemption)
  - User receives suspension message
  
- **3rd+ Violation:** PERMANENT ACCOUNT DISABLE
  - Account permanently disabled (is_account_disabled = TRUE)
  - No appeal path built-in
  - User receives permanent ban message

**Redemption Path:**
- ✅ Only first offense can be redeemed
- ✅ 7-day cooling-off period required
- ✅ No new violations in cooling-off period allows reset

---

### 2. **SELF-HARM / SUICIDE INTENT** (Severity: CRITICAL)
**Detection:** Keywords indicating self-harm intent (suicide, kill myself, end my life, hurt myself, self harm, cut myself, overdose, jump off, hang myself)

**Enforcement for Temporary Users:**
- Immediate account deletion
- Message: Crisis support hotline information + trial session ending notice

**Enforcement for Established Accounts:**
- **1st Violation:** WARNING (with immediate crisis support)
  - User receives crisis support hotline message
  - Message includes: National Suicide Prevention Lifeline (988), Crisis Text Line (TEXT HOME to 741741), International resources
  - Redemption NOT available (critical safety issue)
  - No automatic progression to suspension/ban
  
- **2nd+ Violation:** ACCOUNT REVIEW (implicit - system records but no automatic escalation)
  - Account continues to function but receives same crisis response
  - Manual review recommended by admin

**Redemption Path:**
- ❌ NOT REDEEMABLE
- ❌ Requires professional intervention (outside app scope)
- ✅ Directs to crisis support resources instead

---

### 3. **HARM TO OTHERS** (Severity: CRITICAL)
**Detection:** Keywords indicating intent to harm (kill someone, murder, assault someone, torture, rape)

**Enforcement for Temporary Users:**
- Immediate account deletion
- Message: Standard violation response + trial session ending notice

**Enforcement for Established Accounts:**
- **1st Violation:** WARNING (record-only, no escalation)
  - User receives violation response message
  - Redemption NOT available (safety threat)
  - Recorded in database for admin review
  
- **2nd+ Violation:** ACCOUNT REVIEW (implicit)
  - System records violation but no automatic suspension/ban
  - Manual admin review recommended

**Redemption Path:**
- ❌ NOT REDEEMABLE
- ❌ Zero tolerance policy
- ✅ Encourages professional counseling resources

---

### 4. **ABUSIVE / PROFANE LANGUAGE** (Severity: MEDIUM)
**Detection:** Only severe profanity (fuck, shit, motherfucker, cunt)

**Enforcement for Temporary Users:**
- Immediate account deletion
- Message: Standard violation response + trial session ending notice

**Enforcement for Established Accounts:**
- **1st Violation:** WARNING
  - User receives violation response message
  - Redemption opportunity: 24-hour cooling-off period
  - Can be cleared if no new violations for 24 hours
  
- **2nd Violation:** 7-DAY SUSPENSION
  - Account suspended for 7 days
  - Redemption privilege lost (unlimited redemptions in theory, but 2nd offense triggers suspension)
  
- **3rd+ Violation:** PERMANENT ACCOUNT DISABLE
  - Account permanently disabled
  - User receives permanent ban message

**Redemption Path:**
- ✅ Unlimited redemptions allowed
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
[detectViolation] → Check for keywords/patterns
         ↓
No violation found? → Continue normally
         ↓
Violation found? → [recordViolationAndGetAction]
         ↓
Step 1: applyPendingRedemptions() → Check if any violations are eligible for reset
         ↓
Step 2: Get current violation count for this violation type
         ↓
Step 3: Record new violation in database
         ↓
Step 4: Is TEMPORARY user?
         ├─ YES → DELETE account + return getTempAccountViolationResponse()
         └─ NO → Continue to Step 5
         ↓
Step 5: Apply enforcement based on violation count
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
1. System checks all redeemable violation types (ABUSIVE_LANGUAGE, SEXUAL_CONTENT)
2. If cooling-off period has passed AND no new violations occurred → violation count reset to 0
3. User gets fresh slate for that violation type
4. If they violate again, it counts as "violation #1" again

### Redeemable Violations Configuration

| Violation Type | Cooling Period | Max Redemptions | Notes |
|---|---|---|---|
| ABUSIVE_LANGUAGE | 24 hours | Unlimited | Momentary outbursts; can be redeemed multiple times |
| SEXUAL_CONTENT | 7 days | 1 time only | Boundary testing; first offense only |
| SELF_HARM | — | 0 (Not redeemable) | Requires professional help |
| HARM_OTHERS | — | 0 (Not redeemable) | Zero tolerance; safety threat |

### Redemption Message
After first violation warning (if redeemable):
- Explains cooling-off period length
- Frames redemption as positive path forward
- Emphasizes trust and second chance
- Example: "If you keep your interactions respectful over the next 24 hours, this warning will be cleared"

---

## Database Operations

### Tables Used

**user_violations**
```sql
- user_id_hash (hashed for privacy)
- violation_type (sexual_content, self_harm, harm_others, abusive_language)
- violation_count (incremental counter)
- violation_message (actual message content, truncated to 500 chars)
- last_violation_timestamp
- violation_redeemed_at (when violation was reset)
- is_account_disabled (boolean for permanent ban)
- created_at, updated_at
```

**user_personal_info**
```sql
- user_id
- is_suspended (boolean)
- suspension_end_date (when suspension expires)
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
   INSERT INTO user_violations (...) VALUES (...)
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
   SET violation_count = 0, violation_redeemed_at = CURRENT_TIMESTAMP
   WHERE user_id_hash = $1 AND violation_type = $2
   ```

---

## User-Facing Messages

### Standard Violation Response
Every violation type has a base response that:
1. Acknowledges the user's interaction
2. Explains why the content violates policy
3. Redirects to appropriate topics
4. Maintains respectful, supportive tone

### Escalation Messages
- **1st Violation:** "This is your first warning"
- **2nd Violation (Suspension):** "Your account has been suspended for 7 days"
- **3rd+ Violation (Permanent):** "Your account has been permanently disabled"

### Crisis Messages (Self-Harm Only)
- Immediate crisis hotlines
- Reassurance that help is available
- International resource links
- NOT formatted as warning/suspension/ban

---

## Integration Points

### Called By
- **API Layer** (when processing user messages)
- Must check `isAccountSuspended()` before allowing message processing
- Must check `isAccountDisabled()` to block account access

### Calls Out To
- **Database** (PostgreSQL) for all record operations
- **hashUtils** for user ID hashing (privacy protection)
- **Oracle Guardrails** (separate system; violations not passed to it)

### Error Handling
- All functions have try-catch blocks
- Errors logged with [VIOLATION] prefix
- Database errors do not crash system; returned as false/empty

---

## Key Design Decisions

### 1. **Conservative Detection**
- Only clear intent keywords detected (minimizes false positives)
- Single words not enough for profanity (context matters)
- Includes substring matching (e.g., "kill myself" catches it anywhere)

### 2. **Temporary User → Immediate Delete**
- Trial users cannot redeem or appeal
- One violation = account deleted
- Prevents abuse/spam account cycling

### 3. **Escalating Penalties**
- Warning (1st) → Suspension (2nd) → Ban (3rd)
- Clear expectations about consequences
- Temporary suspension allows for reflection before permanent ban

### 4. **Redemption for "Passion Not Intent" Violations**
- ABUSIVE_LANGUAGE & SEXUAL_CONTENT can be redeemed
- Assumed to be momentary lapses vs. actual safety threats
- SELF_HARM & HARM_OTHERS cannot be redeemed (actual safety/health issues)

### 5. **No Firebase**
- Simplified, database-only implementation
- Eliminated third-party dependency
- Faster violation recording

### 6. **User ID Hashing**
- Privacy protection in violation records
- Cannot link violations back to user via database inspection
- Hash function consistent across all checks

---

## Testing & Monitoring

### What to Monitor
1. **Violation rate by type** - Are users hitting warnings? Suspensions?
2. **Redemption rate** - How many users successfully redeem?
3. **Escalation rate** - What % reach permanent ban?
4. **False positives** - Are legitimate messages being caught?

### Testing Scenarios
- Send message with self-harm keyword → verify crisis hotline appears
- First violation → verify warning + redemption message
- Wait 24 hours → verify violation resets (ABUSIVE_LANGUAGE)
- Second violation → verify suspension applied
- Suspended user sends message → verify account still blocked

---

## Limitations & Future Enhancements

### Current Limitations
- Keyword-based detection (not AI-powered contextual analysis)
- Cannot distinguish between "I feel suicidal" vs. "I'm thinking about suicide" vs. "suicide is bad"
- No appeal process for permanent bans
- No manual review workflow for admins
- Redemption is automatic (no user action required)

### Potential Enhancements
- Admin dashboard to view/manage violations
- Manual appeal workflow for permanent bans
- More sophisticated NLP-based detection
- Violation severity scoring
- Pattern detection (multiple users reporting same issue)
- Webhook notifications for critical violations (self-harm)
- Violation history dashboard for users
