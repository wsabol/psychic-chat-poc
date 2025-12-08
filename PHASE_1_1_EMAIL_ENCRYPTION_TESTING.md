# Phase 1.1: Email Encryption Migration - Testing Checklist

**Status**: Ready for Testing  
**Date**: November 23, 2025  
**Migration Target**: All plaintext emails → encrypted emails_encrypted column  

---

## PRE-MIGRATION VERIFICATION

Before running the migration, verify your setup:

### Database Prerequisites
- [ ] PostgreSQL pgcrypto extension is installed: `CREATE EXTENSION IF NOT EXISTS pgcrypto;`
- [ ] `ENCRYPTION_KEY` environment variable is set in `.env`
- [ ] Database backup taken (safety first!)
- [ ] You have psql access to run migration scripts

### Code Prerequisites
- [ ] `api/routes/auth.js` updated (6 email query changes) ✅
- [ ] `worker/modules/oracle.js` updated (2 email query changes) ✅
- [ ] No other files contain email queries (verified via grep)
- [ ] Changes are committed to git

---

## MIGRATION EXECUTION STEPS

### Step 1: Connect to Database and Add Encrypted Column
```bash
# Open psql or database management tool
psql -h your-host -U your-user -d your-database

# Set the encryption key for this session
SET app.encryption_key = 'your-actual-encryption-key';

# Run migration Step 1
ALTER TABLE user_personal_info ADD COLUMN email_encrypted BYTEA;

# Verify column was added
\d user_personal_info
# Should show: email_encrypted | bytea
```

### Step 2: Encrypt All Existing Emails
```sql
-- Still in psql with app.encryption_key set

UPDATE user_personal_info 
SET email_encrypted = pgp_sym_encrypt(email, current_setting('app.encryption_key'))
WHERE email_encrypted IS NULL AND email IS NOT NULL;

-- Example output: UPDATE 5 (if you have 5 users)
-- If no users yet, will show: UPDATE 0
```

### Step 3: Verify Encryption Success
```sql
-- Check encrypted emails exist
SELECT COUNT(*) as encrypted_count FROM user_personal_info 
WHERE email_encrypted IS NOT NULL;

-- Should return: encrypted_count = (number of users)

-- Verify no data loss (should be empty)
SELECT COUNT(*) as unencrypted_count FROM user_personal_info 
WHERE email IS NOT NULL AND email_encrypted IS NULL;

-- Should return: unencrypted_count = 0
```

### Step 4: Decrypt a Sample Email to Verify It Works
```sql
-- Test decryption works (with ENCRYPTION_KEY still set)
SELECT 
  user_id,
  pgp_sym_decrypt(email_encrypted, current_setting('app.encryption_key')) as decrypted_email,
  email as plaintext_email
FROM user_personal_info 
WHERE email IS NOT NULL 
LIMIT 1;

-- Both decrypted_email and plaintext_email should match
-- This confirms encryption/decryption works correctly
```

### Step 5: Drop Plaintext Email Column (IRREVERSIBLE)
```sql
-- ONLY proceed if Steps 3-4 verified successfully!
-- This is the point of no return

ALTER TABLE user_personal_info DROP COLUMN email;

-- Verify column is gone
\d user_personal_info
# Should NOT show email column anymore
```

### Step 6: Verify No Plaintext Remains
```sql
-- Final safety check - should return 0 rows
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'user_personal_info' 
AND column_name = 'email' 
AND table_schema = 'public';

-- If empty, plaintext email is completely gone ✓
```

---

## APPLICATION TESTING

### Test 1: Firebase User Registration
**Endpoint**: `POST /auth/register-firebase-user`

```bash
curl -X POST http://localhost:3001/auth/register-firebase-user \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-firebase-user-123",
    "email": "firebase@example.com"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "User database record created",
  "userId": "test-firebase-user-123"
}
```

**Verification**:
- [ ] Response is 201
- [ ] User record created in database
- [ ] Email in database is encrypted (bytea, not readable)
- [ ] Verify decrypted email matches: `SELECT pgp_sym_decrypt(email_encrypted, 'KEY') FROM user_personal_info WHERE user_id = 'test-firebase-user-123';`

---

### Test 2: Password Registration
**Endpoint**: `POST /auth/register`

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass123!",
    "phoneNumber": "+1-555-123-4567"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "userId": "uuid-here",
  "message": "Registration successful...",
  "requiresEmailVerification": true
}
```

**Verification**:
- [ ] Response is 201
- [ ] User created with encrypted email
- [ ] No plaintext email in response
- [ ] No plaintext email in database
- [ ] Test with special characters: `test+tag@example.com`, `user.name@sub.domain.co.uk`

---

### Test 3: Login with Encrypted Email (CRITICAL)
**Endpoint**: `POST /auth/login`

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass123!"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "userId": "uuid-here",
  "token": "jwt-token-here",
  "refreshToken": "jwt-refresh-token-here",
  "requires2FA": false,
  "message": "Login successful"
}
```

**Verification**:
- [ ] Response is 200
- [ ] Token returned (indicates decryption worked)
- [ ] **NO email field in response** (removed as per security)
- [ ] Can successfully login with encrypted email
- [ ] Login fails with wrong email (query still works)
- [ ] Login fails with wrong password (query still works)
- [ ] Test with email variations:
  - [ ] Lowercase: `newuser@example.com`
  - [ ] Mixed case: `NewUser@Example.com` (should normalize)
  - [ ] Special chars: `test+tag@example.com`
  - [ ] Subdomains: `user@mail.example.co.uk`

---

### Test 4: Password Reset Email Lookup (CRITICAL)
**Endpoint**: `POST /auth/forgot-password`

```bash
curl -X POST http://localhost:3001/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "If email exists, password reset code has been sent to your phone."
}
```

**Verification**:
- [ ] Response is 200
- [ ] Decryption query works (email found in encrypted column)
- [ ] User 2FA phone number is retrieved (not encrypted yet, but will be in Phase 1.2)
- [ ] Message returned even if user doesn't exist (security: don't reveal if email registered)

---

### Test 5: Oracle Temporary User Detection
**Function**: `isTemporaryUser(userId)`

**Manual Test** (in Node):
```javascript
import { isTemporaryUser } from './worker/modules/oracle.js';

// Test with temporary user
const tempUserId = await db.query(
  `INSERT INTO user_personal_info (user_id, email_encrypted, created_at, updated_at)
   VALUES (gen_random_uuid(), pgp_sym_encrypt('tempuser@example.com', $1), NOW(), NOW())
   RETURNING user_id`,
  [process.env.ENCRYPTION_KEY]
);

const isTempUser = await isTemporaryUser(tempUserId.rows[0].user_id);
console.log('Is temp user:', isTempUser); // Should be: true

// Test with regular user
const regularUserId = await db.query(
  `INSERT INTO user_personal_info (user_id, email_encrypted, created_at, updated_at)
   VALUES (gen_random_uuid(), pgp_sym_encrypt('regular@example.com', $1), NOW(), NOW())
   RETURNING user_id`,
  [process.env.ENCRYPTION_KEY]
);

const isRegularUser = await isTemporaryUser(regularUserId.rows[0].user_id);
console.log('Is temp user:', isRegularUser); // Should be: false
```

**Verification**:
- [ ] Oracle correctly identifies temporary users
- [ ] Oracle correctly identifies regular users
- [ ] Decryption works in worker process
- [ ] No plaintext email logs

---

## DATABASE VERIFICATION

### Query 1: No Plaintext Email Remains
```sql
SELECT COUNT(*) as plaintext_emails FROM user_personal_info 
WHERE email IS NOT NULL;

-- Expected result: 0 (all dropped)
```

### Query 2: All Emails Encrypted
```sql
SELECT COUNT(*) as encrypted_count FROM user_personal_info 
WHERE email_encrypted IS NOT NULL;

-- Expected result: (total user count)
```

### Query 3: Verify Decryption Works
```sql
SELECT user_id, pgp_sym_decrypt(email_encrypted, 'YOUR_ENCRYPTION_KEY') as email
FROM user_personal_info 
LIMIT 5;

-- Should show readable emails (requires correct ENCRYPTION_KEY)
```

### Query 4: Plaintext Column Completely Removed
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'user_personal_info' 
AND column_name = 'email';

-- Expected result: Empty (no rows)
```

---

## LOG VERIFICATION

### Check Audit Logs
```bash
# Look for successful login/registration attempts
curl -X GET http://localhost:3001/admin/audit-logs \
  -H "Authorization: Bearer admin-token" \
  -H "Content-Type: application/json"
```

**Verification**:
- [ ] Login attempts logged successfully
- [ ] No plaintext email in audit logs
- [ ] Audit logs show 'SUCCESS' status

---

## ROLLBACK PROCEDURE (IF NEEDED)

If something goes wrong before dropping the plaintext column:

```sql
-- The encrypted column will have data
-- The plaintext column will still exist
-- Can safely revert:

DELETE FROM user_personal_info WHERE email_encrypted IS NOT NULL AND email IS NULL;
-- This removes users created after migration

-- Or restore from backup and try again
```

If plaintext column was already dropped, you MUST restore from database backup.

---

## COMPLETION CHECKLIST

Once all tests pass:

- [ ] All email queries updated (6 in auth.js, 2 in oracle.js)
- [ ] Firebase registration works with encrypted email
- [ ] Password registration works with encrypted email
- [ ] Login works with encrypted email decryption
- [ ] Password reset works with encrypted email lookup
- [ ] Oracle temp user detection works
- [ ] No plaintext email in database
- [ ] No plaintext email in API responses
- [ ] No plaintext email in logs
- [ ] Plaintext email column dropped
- [ ] No other files use plaintext email
- [ ] Tests passed on staging database

---

## FINAL SIGN-OFF

**Tester**: _______________  
**Date**: _______________  
**Result**: ✅ PASSED / ❌ FAILED  

**Notes**:
(Any issues encountered and resolved)

---

## NEXT STEPS

After Phase 1.1 is complete and verified:
1. Update UNIFIED_SECURITY_ROADMAP.md to mark 1.1 as ✅ COMPLETE
2. Begin Phase 1.2: Additional Sensitive Fields Encryption (phone, sex, familiar_name)
3. Commit changes to git
