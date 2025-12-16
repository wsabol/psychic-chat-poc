# Files That Need Encryption Updates

## TIER 1: CRITICAL - AUTH TOKENS (Do First!)

### High Priority: Session Tokens
- **Location**: `WHERE user_sessions IS CREATED OR VALIDATED`
- **Current Issue**: session_token stored in PLAINTEXT ⚠️
- **Action**: 
  - Find where sessions are INSERT/SELECT
  - Use `encryptedQueries.insertUserSession()` for writes
  - Use `encryptedQueries.getUserSession()` for reads
- **Risk**: CRITICAL - Every API call uses sessions
- **Files to Search**: 
  - [ ] `api/routes/auth-endpoints/login.js`
  - [ ] `api/routes/auth-endpoints/account.js`
  - [ ] `api/middleware/auth.js`
  - [ ] Any file with "user_sessions"

### High Priority: Firebase Tokens
- **Location**: `WHERE security_sessions IS CREATED OR ACCESSED`
- **Current Issue**: firebase_token stored in PLAINTEXT ⚠️
- **Action**: 
  - Find where firebase tokens are INSERT/SELECT
  - Use `encryptedQueries.insertSecuritySession()` for writes
  - Use `encryptedQueries.getSecuritySessions()` for reads
- **Risk**: CRITICAL - Firebase authentication
- **Files to Search**: 
  - [ ] `api/routes/auth-endpoints/login.js`
  - [ ] `api/routes/security.js`
  - [ ] Any file with "security_sessions" or "firebase_token"

---

## TIER 2: USER IDENTIFICATION (High Priority)

### Messages Table
- **Location**: `api/routes/chat.js` (likely)
- **Issue**: user_id in plaintext
- **Fix**: Use `encryptedQueries.getUserMessages()` for SELECT
- **Pattern**: 
  ```javascript
  import { getUserMessages } from '../../shared/encryptedQueries.js';
  const result = await getUserMessages(db, userId, limit);
  ```

### Audit Log - Verify
- **Location**: `api/shared/auditLog.js`
- **Status**: ✅ Already uses `user_id_hash` and `ip_address_encrypted`
- **Action**: VERIFY IT'S NOT READING PLAINTEXT user_id
- **Check**: 
  - [ ] All SELECTs use `user_id_hash`
  - [ ] No plaintext user_id reads

### User Login Attempts
- **Location**: `api/routes/auth-endpoints/helpers/accountLockout.js`
- **Status**: ✅ PARTIALLY UPDATED
- **Action**: 
  - [ ] Verify all `user_id_hash` parameters are used
  - [ ] Check no plaintext user_id queries

### User Account Lockouts
- **Location**: `api/routes/auth-endpoints/helpers/accountLockout.js`
- **Status**: ✅ UPDATED
- **Action**: Already using `user_id_hash`

---

## TIER 3: REGISTRATION/SETUP (Medium Priority)

### Verification Codes (Email/SMS)
- **Location**: `api/routes/auth-endpoints/register.js` or similar
- **Issue**: user_id, email, phone_number in plaintext
- **Fix**: Use `encryptedQueries.insertVerificationCode()` for INSERT
- **Pattern**:
  ```javascript
  import { insertVerificationCode } from '../../shared/encryptedQueries.js';
  await insertVerificationCode(db, userId, email, phone, code, 'email');
  ```
- **Also Update**: Any SELECT from verification_codes
  ```javascript
  import { getVerificationCode } from '../../shared/encryptedQueries.js';
  const result = await getVerificationCode(db, userId, code);
  ```

### Pending Migrations
- **Location**: `api/routes/migration.js`
- **Issue**: temp_user_id in plaintext
- **Fix**: Hash temp_user_id before queries
- **Pattern**:
  ```javascript
  import { hashTempUserId } from '../../shared/hashUtils.js';
  const tempUserIdHash = hashTempUserId(tempUserId);
  const result = await db.query(
    `SELECT * FROM pending_migrations WHERE temp_user_id_hash = $1`,
    [tempUserIdHash]
  );
  ```

### User Consents
- **Location**: `api/routes/consent.js` or similar
- **Issue**: user_id in plaintext
- **Fix**: Hash user_id before queries
- **Pattern**: (same as pending_migrations above)

### 2FA Routes
- **Location**: `api/routes/auth-endpoints/2fa.js`
- **Issue**: user_id, phone_number in plaintext
- **Fix**: 
  - Use `hashUserId()` for user_id
  - Use `encryptedQueries.insertVerificationCode()` for codes

---

## TIER 4: PROFILE/SETTINGS (Medium Priority)

### Security Settings (Phone, Recovery Email/Phone)
- **Location**: `api/routes/security.js` or profile routes
- **Issue**: phone_number, recovery_email, recovery_phone in plaintext
- **Fix**: 
  - For INSERT/UPDATE: Use `encryptedQueries.insertSecurityRecord()`
  - For SELECT: Use `encryptedQueries.getSecurityRecord()`
- **Pattern**:
  ```javascript
  import { getSecurityRecord } from '../../shared/encryptedQueries.js';
  const security = await getSecurityRecord(db, userId);
  // security.rows[0].phone_number - auto-decrypted
  ```

---

## TIER 5: AUDIT/MONITORING (Lower Priority)

### Account Deletion Audit
- **Location**: Wherever account deletion is logged
- **Issue**: user_id, ip_address in plaintext
- **Fix**: 
  - Hash user_id
  - Encrypt ip_address

### User Login Attempts (Separate from account_lockout)
- **Location**: `api/routes/auth-endpoints/helpers/accountLockout.js`
- **Status**: ✅ ALREADY UPDATED
- **Action**: VERIFY

### Other Tables
- [ ] `user_astrology` - user_id
- [ ] `user_violations` - user_id
- [ ] `user_2fa_settings` - user_id, phone_number, backup_phone
- [ ] `user_2fa_codes` - user_id
- [ ] `user_sessions` - Already handled in TIER 1

---

## Search Commands to Find Files

```bash
# Find all files that query user_sessions
grep -r "user_sessions" api/ --include="*.js"

# Find all files that query security_sessions
grep -r "security_sessions" api/ --include="*.js"

# Find all files that SELECT user_id without hash
grep -r "WHERE user_id =" api/ --include="*.js"

# Find all plaintext email/phone queries
grep -r "WHERE.*email|WHERE.*phone" api/ --include="*.js"
```

---

## Files by Tier

### TIER 1 (AUTH - CRITICAL)
```
❌ api/routes/auth-endpoints/login.js
❌ api/routes/auth-endpoints/account.js
❌ api/middleware/auth.js
❌ [FIND] Where user_sessions is used
❌ [FIND] Where security_sessions is used
```

### TIER 2 (USER ID)
```
✅ api/routes/auth-endpoints/helpers/accountLockout.js - DONE
❌ api/routes/chat.js - Check messages table
❌ [FIND] Any file that queries by user_id
```

### TIER 3 (SETUP)
```
❌ api/routes/auth-endpoints/register.js
❌ api/routes/auth-endpoints/2fa.js
❌ api/routes/migration.js
❌ api/routes/consent.js
```

### TIER 4 (PROFILE)
```
❌ api/routes/security.js
❌ api/routes/user-profile.js
```

### TIER 5 (AUDIT)
```
❌ [FIND] Account deletion logging
❌ [VERIFY] Account lockout helpers
```

---

## Testing Each Update

After updating each file:

```javascript
// 1. Check compilation
node --check api/routes/auth-endpoints/login.js

// 2. Verify hash function is used
grep -n "hashUserId\|encryptedQueries" api/routes/auth-endpoints/login.js

// 3. Verify encryption is used
grep -n "pgp_sym_encrypt\|_encrypted" api/routes/auth-endpoints/login.js

// 4. Run tests if available
npm test

// 5. Check database for populated hash/encrypted columns
psql -U postgres -d chatbot -c "
  SELECT user_id_hash, COUNT(*) FROM user_login_attempts 
  WHERE user_id_hash IS NOT NULL GROUP BY user_id_hash;
"
```

---

## Completion Checklist

### Phase 1: Auth Tokens
- [ ] Find user_sessions INSERT location
- [ ] Use `encryptedQueries.insertUserSession()`
- [ ] Find user_sessions SELECT location
- [ ] Use `encryptedQueries.getUserSession()`
- [ ] Find security_sessions INSERT location
- [ ] Use `encryptedQueries.insertSecuritySession()`
- [ ] Find security_sessions SELECT location
- [ ] Use `encryptedQueries.getSecuritySessions()`
- [ ] Test: Login and verify encrypted data
- [ ] Test: Session validation works

### Phase 2: User IDs
- [ ] Update messages table queries
- [ ] Verify audit_log uses user_id_hash
- [ ] Verify account_lockout uses user_id_hash
- [ ] Update any other plaintext user_id queries
- [ ] Test: Queries return correct data

### Phase 3: Registration
- [ ] Update verification_codes writes
- [ ] Update verification_codes reads
- [ ] Update pending_migrations queries
- [ ] Update user_consents queries
- [ ] Update 2FA endpoints
- [ ] Test: Registration flow works

### Phase 4: Profile
- [ ] Update security table reads/writes
- [ ] Update user_2fa_settings
- [ ] Update other profile-related tables
- [ ] Test: Profile updates work

### Phase 5: Cleanup
- [ ] Monitor production for 2+ weeks
- [ ] Verify no code reads plaintext columns
- [ ] Delete plaintext columns from database
- [ ] Remove old code paths

---

## Priority Summary

**DO THIS FIRST** (Session + Firebase tokens):
1. Find session creation code
2. Use encryptedQueries.insertUserSession()
3. Find firebase token code
4. Use encryptedQueries.insertSecuritySession()

**THEN** (User IDs):
- Hash all user_id queries

**THEN** (Everything else):
- Follow TIER 3, 4, 5

