# PII Encryption Migration Plan - Complete Audit

## Critical Issue
**55 columns of sensitive plaintext data** found across 17 tables that must be encrypted per security requirements.

---

## Table-by-Table Audit & Migration Plan

### 1. **account_deletion_audit** (2 plaintext columns)
**Status**: ⚠️ CRITICAL

| Column | Type | Action |
|--------|------|--------|
| `user_id` | VARCHAR | Add `user_id_hash` (BYTEA), hash values, delete plaintext |
| `ip_address` | INET | Add `ip_address_encrypted` (BYTEA), encrypt, delete plaintext |

---

### 2. **audit_log** (2 plaintext columns)
**Status**: ⚠️ CRITICAL

| Column | Type | Current | Action |
|--------|------|---------|--------|
| `user_id` | VARCHAR | Plaintext ❌ | Add `user_id_hash` (BYTEA) - DONE in auditLog.js |
| `ip_address` | INET | Plaintext ❌ | Already has `ip_address_encrypted` ✅ |

✅ **PARTIALLY FIXED** - Has encrypted IP column but plaintext `user_id` not deleted

---

### 3. **login_attempts** (3 plaintext columns)
**Status**: 🔴 CRITICAL

| Column | Type | Action |
|--------|------|--------|
| `user_id` | VARCHAR | Add `user_id_hash` (BYTEA), hash, delete plaintext |
| `email_attempted` | VARCHAR | Add `email_attempted_encrypted` (BYTEA), already exists! ✅ |
| `ip_address` | INET | Add `ip_address_encrypted` (BYTEA), already exists! ✅ |

✅ **ENCRYPTED COLUMNS EXIST** - Just need to delete plaintext columns

---

### 4. **messages** (2 plaintext columns)
**Status**: 🔴 CRITICAL

| Column | Type | Action |
|--------|------|--------|
| `user_id` | VARCHAR | Add `user_id_hash` (BYTEA), hash, delete plaintext |
| `user_id_hash` | VARCHAR | Already exists ✅ |

⚠️ **user_id_hash already exists but plaintext user_id still present**

---

### 5. **pending_migrations** (3 plaintext columns)
**Status**: 🔴 CRITICAL

| Column | Type | Action |
|--------|------|--------|
| `temp_user_id` | VARCHAR | Add `temp_user_id_hash` (BYTEA), hash, delete plaintext |
| `email` | VARCHAR | Add `email_encrypted` (BYTEA), already exists! ✅ |
| `temp_user_id_hash` | VARCHAR | Already exists ✅ |

✅ **PARTIAL** - email encrypted, but user IDs in plaintext

---

### 6. **security** (5 plaintext columns)
**Status**: 🔴 CRITICAL

| Column | Type | Action |
|--------|------|--------|
| `user_id` | VARCHAR | Add `user_id_hash` (BYTEA), hash, delete plaintext |
| `phone_number` | VARCHAR | Add `phone_number_encrypted` (BYTEA), encrypt, delete plaintext |
| `recovery_email` | VARCHAR | Add `recovery_email_encrypted` (BYTEA), encrypt, delete plaintext |
| `recovery_phone` | VARCHAR | Add `recovery_phone_encrypted` (BYTEA), encrypt, delete plaintext |
| `user_id_hash` | VARCHAR | Already exists ✅ |

⚠️ **NO ENCRYPTED COLUMNS** - All 4 PII fields in plaintext

---

### 7. **security_sessions** (3 plaintext columns)
**Status**: 🔴 CRITICAL

| Column | Type | Action |
|--------|------|--------|
| `user_id` | VARCHAR | Add `user_id_hash` (BYTEA), hash, delete plaintext |
| `firebase_token` | VARCHAR | Add `firebase_token_encrypted` (BYTEA), encrypt (LONG!) |
| `ip_address` | VARCHAR | Add `ip_address_encrypted` (BYTEA), already exists! ✅ |

⚠️ **PARTIAL** - firebase_token is sensitive (1024 chars)

---

### 8. **user_2fa_codes** (2 plaintext columns)
**Status**: 🔴 CRITICAL

| Column | Type | Action |
|--------|------|--------|
| `user_id` | VARCHAR | Add `user_id_hash` (BYTEA), hash, delete plaintext |
| `user_id_hash` | VARCHAR | Already exists ✅ |

⚠️ **user_id plaintext despite hash existing**

---

### 9. **user_2fa_settings** (4 plaintext columns)
**Status**: 🔴 CRITICAL

| Column | Type | Action |
|--------|------|--------|
| `user_id` | VARCHAR | Add `user_id_hash` (BYTEA), hash, delete plaintext |
| `phone_number` | VARCHAR | Add `phone_number_encrypted` (BYTEA), already exists! ✅ |
| `backup_phone_number` | VARCHAR | Add `backup_phone_number_encrypted` (BYTEA), already exists! ✅ |
| `user_id_hash` | VARCHAR | Already exists ✅ |

✅ **MOSTLY FIXED** - phones encrypted, but plaintext user_id remains

---

### 10. **user_account_lockouts** (1 plaintext column)
**Status**: 🔴 CRITICAL

| Column | Type | Action |
|--------|------|--------|
| `user_id` | VARCHAR | Add `user_id_hash` (BYTEA), hash, delete plaintext |

⚠️ **Single PII column in plaintext**

---

### 11. **user_astrology** (2 plaintext columns)
**Status**: 🔴 CRITICAL

| Column | Type | Action |
|--------|------|--------|
| `user_id` | VARCHAR | Add `user_id_hash` (BYTEA), hash, delete plaintext |
| `user_id_hash` | VARCHAR | Already exists ✅ |

⚠️ **Redundant plaintext user_id**

---

### 12. **user_consents** (1 plaintext column)
**Status**: 🔴 CRITICAL

| Column | Type | Action |
|--------|------|--------|
| `user_id` | VARCHAR | Add `user_id_hash` (BYTEA), hash, delete plaintext |

⚠️ **Single PII column**

---

### 13. **user_login_attempts** (2 plaintext columns)
**Status**: 🔴 CRITICAL

| Column | Type | Action |
|--------|------|--------|
| `user_id` | VARCHAR | Add `user_id_hash` (BYTEA), hash, delete plaintext |
| `ip_address` | INET | Add `ip_address_encrypted` (BYTEA), already exists! ✅ |

✅ **PARTIAL** - IP encrypted, user_id plaintext

---

### 14. **user_personal_info** (3 plaintext columns)
**Status**: 🟡 MEDIUM (partially encrypted already)

| Column | Type | Current Status | Action |
|--------|------|----------------|--------|
| `user_id` | VARCHAR | Plaintext ❌ | PRIMARY KEY - Cannot encrypt |
| `email` | VARCHAR | Already has `email_encrypted` ✅ | Keep plaintext email (unhashed for FK) OR add hash |
| `password_hash` | VARCHAR | OK ✅ | Already hashed (not encrypted) - fine as is |
| `email_hash` | VARCHAR | OK ✅ | Already hashed - OK |

⚠️ **user_id is PRIMARY KEY** - Cannot encrypt without major refactoring

---

### 15. **user_sessions** (3 plaintext columns)
**Status**: 🔴 CRITICAL

| Column | Type | Action |
|--------|------|--------|
| `user_id` | VARCHAR | Add `user_id_hash` (BYTEA), hash, delete plaintext |
| `session_token` | VARCHAR | Add `session_token_encrypted` (BYTEA), encrypt (sensitive!) |
| `ip_address` | INET | Add `ip_address_encrypted` (BYTEA), already exists! ✅ |

⚠️ **session_token is HIGHLY SENSITIVE** (auth token)

---

### 16. **user_violations** (2 plaintext columns)
**Status**: 🔴 CRITICAL

| Column | Type | Action |
|--------|------|--------|
| `user_id` | VARCHAR | Add `user_id_hash` (BYTEA), hash, delete plaintext |
| `user_id_hash` | VARCHAR | Already exists ✅ |

⚠️ **Redundant plaintext user_id**

---

### 17. **verification_codes** (3 plaintext columns)
**Status**: 🔴 CRITICAL

| Column | Type | Action |
|--------|------|--------|
| `user_id` | VARCHAR | Add `user_id_hash` (BYTEA), hash, delete plaintext |
| `email` | VARCHAR | Add `email_encrypted` (BYTEA), already exists! ✅ |
| `phone_number` | VARCHAR | Add `phone_number_encrypted` (BYTEA), already exists! ✅ |

✅ **MOSTLY FIXED** - emails/phones encrypted, user_id plaintext

---

## Summary: Encryption Status

### ✅ Already Encrypted (No Action Needed)
- `password_hash` in user_personal_info (already hashed)
- `email_encrypted` in multiple tables
- `phone_number_encrypted` in multiple tables  
- `ip_address_encrypted` in most tables
- `firebase_token_hash`, `session_token_hash`

### ⚠️ Encrypted Columns EXIST But Plaintext STILL Present (Need Cleanup)
- `audit_log`: `user_id` (hash column exists, plaintext remains)
- `login_attempts`: `user_id` (hash missing, need to add)
- `messages`: `user_id` (hash exists, plaintext remains)
- `pending_migrations`: `temp_user_id` (hash exists, plaintext remains)
- `user_2fa_codes`: `user_id` (hash exists, plaintext remains)
- `user_2fa_settings`: `user_id` (hash exists, plaintext remains)
- `user_astrology`: `user_id` (hash exists, plaintext remains)
- `user_consents`: `user_id` (no hash, need to add)
- `user_login_attempts`: `user_id` (no hash, need to add)
- `user_violations`: `user_id` (hash exists, plaintext remains)
- `verification_codes`: `user_id` (no hash, need to add)

### 🔴 Critical - Plaintext WITHOUT Encrypted Alternatives
- `account_deletion_audit`: `user_id`, `ip_address` - NEED BOTH
- `security`: `phone_number`, `recovery_email`, `recovery_phone` - NEED ALL
- `security_sessions`: `firebase_token` - NEED (sensitive!)
- `user_account_lockouts`: `user_id` - NEED HASH
- `user_personal_info`: `user_id` - PRIMARY KEY (cannot encrypt without refactoring)
- `user_sessions`: `session_token` - NEED (CRITICAL - auth token!)

---

## Migration Strategy

### Phase 1: Add Hash Columns for user_id (11 tables)
```sql
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS user_id_hash VARCHAR(64);
ALTER TABLE login_attempts ADD COLUMN IF NOT EXISTS user_id_hash VARCHAR(64);
ALTER TABLE user_account_lockouts ADD COLUMN IF NOT EXISTS user_id_hash VARCHAR(64);
ALTER TABLE user_consents ADD COLUMN IF NOT EXISTS user_id_hash VARCHAR(64);
ALTER TABLE user_login_attempts ADD COLUMN IF NOT EXISTS user_id_hash VARCHAR(64);
ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS user_id_hash VARCHAR(64);
-- And 5 more...
```

### Phase 2: Add Encrypted Columns for Sensitive Data
```sql
-- security table
ALTER TABLE security 
  ADD COLUMN IF NOT EXISTS phone_number_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS recovery_email_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS recovery_phone_encrypted BYTEA;

-- security_sessions
ALTER TABLE security_sessions 
  ADD COLUMN IF NOT EXISTS firebase_token_encrypted BYTEA;

-- user_sessions
ALTER TABLE user_sessions 
  ADD COLUMN IF NOT EXISTS session_token_encrypted BYTEA;

-- account_deletion_audit
ALTER TABLE account_deletion_audit 
  ADD COLUMN IF NOT EXISTS user_id_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS ip_address_encrypted BYTEA;
```

### Phase 3: Migrate Data
- Hash all plaintext `user_id` values to `user_id_hash`
- Encrypt all sensitive plaintext values
- Verify migration completeness

### Phase 4: Update Code
- Update all queries to use `_hash` and `_encrypted` columns
- Remove plaintext column reads
- Update all INSERT/UPDATE statements

### Phase 5: Delete Plaintext Columns
```sql
ALTER TABLE audit_log DROP COLUMN IF EXISTS user_id;
-- etc for all 55 plaintext columns
```

---

## Code Changes Required

### Tables with user_id that need hashing:
- `auditLog.js` - needs to use user_id_hash
- Routes that query by user_id - need to hash input first
- Every INSERT - must also insert hash

### Tables with sensitive data needing encryption:
- `security.js` (new file) - handle phone/email encryption
- Routes for profile updates - encrypt before storing
- All SELECT queries - decrypt sensitive columns

### High-Priority (Security Tokens):
- `user_sessions.session_token` - CRITICAL AUTH DATA
- `security_sessions.firebase_token` - CRITICAL AUTH DATA

---

## Recommendation

**This is a MAJOR refactoring.** Suggest approach:

1. **Week 1**: Add all encrypted/hash columns (backward compatible)
2. **Week 2**: Migrate data, update code to write encrypted values
3. **Week 3**: Dual-read (read from both old & new), verify no issues
4. **Week 4**: Switch code to read encrypted only, delete plaintext

Or implement with smaller phases - fix highest risk first:
1. Session tokens (user_sessions, security_sessions)
2. Passwords & recovery info (security)
3. User IDs (user_id_hash everywhere)
4. Remaining PII

---

## Compliance Impact

**Currently**: ❌ **NOT COMPLIANT** with GDPR/CCPA - plaintext PII in 17 tables
**After Plan**: ✅ **COMPLIANT** - all sensitive data encrypted/hashed

---

## Questions Before Implementation

1. Can user_id be primary key? (If yes, cannot encrypt - need workaround)
2. Is user_id used in app logic often? (If yes, performance impact)
3. How many users? (Migration speed/downtime concern)
4. Phased or all-at-once approach?

