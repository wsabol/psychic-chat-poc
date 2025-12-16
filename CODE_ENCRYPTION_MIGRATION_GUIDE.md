# Code Migration Guide: Using Encrypted Columns

## Overview
After running the SQL migration (`030_encrypt_all_sensitive_pii.sql`), all encrypted/hash columns are now in the database. Code must be updated to:
1. **Write** to encrypted columns instead of plaintext
2. **Read** from encrypted columns (decrypting when needed)
3. **Query** by hashed user_id instead of plaintext

---

## New Utility: `encryptedQueries.js`

A new file `api/shared/encryptedQueries.js` provides helper functions for all common operations with encrypted data. **Use these instead of writing raw SQL.**

### Benefits:
- ✅ Automatically handles encryption/decryption
- ✅ Automatically handles hashing user_id
- ✅ Consistent encryption key handling
- ✅ Type-safe parameter binding
- ✅ Prevents SQL injection

---

## Migration Pattern by Table

### 1. **audit_log** ✅ ALREADY DONE
**File**: `api/shared/auditLog.js`
- ✅ Writes to `user_id_hash` 
- ✅ Writes to `ip_address_encrypted`
- ✅ Queries by `user_id_hash`

**Status**: **NO CHANGES NEEDED** - Already using encrypted columns

---

### 2. **security** (phone, recovery email/phone)
**Currently**: Plaintext columns still used
**Action**: Update all routes that read/write security info

**Before**:
```javascript
const result = await db.query(
  `SELECT phone_number, recovery_email FROM security WHERE user_id = $1`,
  [userId]
);
```

**After**:
```javascript
import { getSecurityRecord } from '../../shared/encryptedQueries.js';

const result = await getSecurityRecord(db, userId);
// result.rows[0].phone_number - automatically decrypted
// result.rows[0].recovery_email - automatically decrypted
```

**Files to Update**:
- `api/routes/user-profile.js` - if it reads security info
- `api/routes/security.js` - if it exists and manages security settings
- Any route that calls `UPDATE security SET phone_number = ...`

---

### 3. **user_sessions** (session_token - CRITICAL!)
**Currently**: Plaintext session tokens in database ⚠️
**Action**: Update session creation and validation

**Before**:
```javascript
await db.query(
  `INSERT INTO user_sessions (user_id, session_token) VALUES ($1, $2)`,
  [userId, token]
);
```

**After**:
```javascript
import { insertUserSession } from '../../shared/encryptedQueries.js';

await insertUserSession(
  db, 
  userId, 
  sessionToken, 
  req.ip, 
  req.get('user-agent'), 
  expiryDate
);
```

**Files to Update**:
- Any session/auth middleware that creates user_sessions
- Any code that queries user_sessions for validation

---

### 4. **security_sessions** (firebase_token - CRITICAL!)
**Currently**: Plaintext firebase tokens in database ⚠️
**Action**: Update token storage and retrieval

**Before**:
```javascript
await db.query(
  `INSERT INTO security_sessions (user_id, firebase_token) VALUES ($1, $2)`,
  [userId, firebaseToken]
);
```

**After**:
```javascript
import { insertSecuritySession } from '../../shared/encryptedQueries.js';

await insertSecuritySession(
  db,
  userId,
  firebaseToken,
  deviceName,
  req.ip,
  req.get('user-agent')
);
```

**Files to Update**:
- `api/routes/auth-endpoints/login.js` - token storage
- Any security session management code

---

### 5. **login_attempts** (user_id, email)
**Currently**: Plaintext user_id and email
**Action**: Use hash for user_id, encrypt email

**Before**:
```javascript
await db.query(
  `INSERT INTO login_attempts (user_id, email_attempted) VALUES ($1, $2)`,
  [userId, email]
);
```

**After**:
```javascript
import { recordLoginAttempt } from '../../shared/encryptedQueries.js';

await recordLoginAttempt(
  db,
  userId,
  email,
  success,
  req.ip,
  req.get('user-agent')
);
```

**Files to Update**:
- `api/routes/auth-endpoints/helpers/accountLockout.js`
- Any route that logs login attempts

---

### 6. **messages** (user_id)
**Currently**: Plaintext user_id
**Action**: Use user_id_hash for queries

**Before**:
```javascript
const result = await db.query(
  `SELECT * FROM messages WHERE user_id = $1 ORDER BY created_at DESC`,
  [userId]
);
```

**After**:
```javascript
import { getUserMessages } from '../../shared/encryptedQueries.js';

const result = await getUserMessages(db, userId, limit);
```

**Files to Update**:
- `api/routes/chat.js` - if it queries messages

---

### 7. **verification_codes** (user_id, email, phone)
**Currently**: Plaintext user_id
**Action**: Hash user_id, encrypt email/phone

**Before**:
```javascript
await db.query(
  `INSERT INTO verification_codes (user_id, email, code) VALUES ($1, $2, $3)`,
  [userId, email, code]
);
```

**After**:
```javascript
import { insertVerificationCode } from '../../shared/encryptedQueries.js';

await insertVerificationCode(
  db,
  userId,
  email,
  phoneNumber,
  code,
  codeType // 'email' or 'sms'
);
```

**Files to Update**:
- `api/routes/auth-endpoints/register.js` - email verification
- `api/routes/auth-endpoints/2fa.js` - SMS/email codes

---

### 8. **pending_migrations** (temp_user_id, email)
**Currently**: temp_user_id plaintext
**Action**: Hash temp_user_id

**Before**:
```javascript
const result = await db.query(
  `SELECT temp_user_id FROM pending_migrations WHERE temp_user_id = $1`,
  [tempUserId]
);
```

**After**:
```javascript
import { hashTempUserId } from '../../shared/hashUtils.js';

const tempUserIdHash = hashTempUserId(tempUserId);
const result = await db.query(
  `SELECT * FROM pending_migrations WHERE temp_user_id_hash = $1`,
  [tempUserIdHash]
);
```

**Files to Update**:
- `api/routes/migration.js` - migration lookups

---

### 9. Other Tables Needing Updates

**account_deletion_audit** (user_id, ip_address):
- Add user_id_hash filtering
- Encrypt ip_address

**user_account_lockouts** (user_id):
- Use user_id_hash for queries

**user_consents** (user_id):
- Use user_id_hash for queries

**user_login_attempts** (user_id):
- Use user_id_hash for queries

---

## Querying by Hashed user_id

When you need to query by user_id (without a helper function):

```javascript
import { hashUserId } from '../../shared/hashUtils.js';

const userIdHash = hashUserId(userId);
const result = await db.query(
  `SELECT * FROM some_table WHERE user_id_hash = $1`,
  [userIdHash]
);
```

---

## Decrypting Sensitive Data

When you need to decrypt data in your queries:

```javascript
import { getEncryptionKey } from '../../shared/decryptionHelper.js';

const ENCRYPTION_KEY = getEncryptionKey();
const result = await db.query(
  `SELECT pgp_sym_decrypt(phone_number_encrypted, $1) as phone_number
   FROM security WHERE user_id = $2`,
  [ENCRYPTION_KEY, userId]
);
```

---

## Summary of Files to Update

### **CRITICAL (Auth tokens):**
1. ⚠️ Auth token creation/validation (security_sessions.firebase_token)
2. ⚠️ Session management (user_sessions.session_token)

### **HIGH (User identification):**
3. audit_log queries/writes
4. messages queries by user_id
5. login_attempts queries/writes
6. account_lockout queries/writes

### **MEDIUM (Setup/registration):**
7. verification_codes writes (email, SMS)
8. pending_migrations queries
9. security info reads/writes
10. user_consents queries

### **LOW (Not frequently used):**
11. account_deletion_audit
12. user_login_attempts

---

## Testing Checklist

After updating each file:
- [ ] Code compiles without errors
- [ ] Tests pass (if applicable)
- [ ] No SQL syntax errors
- [ ] Encrypted/hash columns populated
- [ ] Plaintext data not logged in console
- [ ] API still returns same data structure

---

## Cleanup Phase (FUTURE - After Code Verified)

Once all code is updated and tested in production for 2+ weeks:
```sql
-- Delete plaintext columns (only after code uses encrypted only)
ALTER TABLE user_sessions DROP COLUMN IF EXISTS session_token;
ALTER TABLE security_sessions DROP COLUMN IF EXISTS firebase_token;
ALTER TABLE security DROP COLUMN IF EXISTS phone_number;
ALTER TABLE security DROP COLUMN IF EXISTS recovery_email;
ALTER TABLE security DROP COLUMN IF EXISTS recovery_phone;
-- ... etc for all plaintext columns
```

---

## Questions?

1. **"Can I query plaintext and encrypted together?"** No, use encrypted only going forward
2. **"What if I need the plaintext?"** Decrypt using `pgp_sym_decrypt()` in query
3. **"How long to update all code?"** Estimated 4-6 hours depending on codebase size
4. **"Should I update all at once?"** Recommended: Update high-risk files first (auth), then others

