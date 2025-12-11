-- ============================================
-- Migration: Fix Plaintext PII Exposure
-- Purpose: Encrypt/hash sensitive data in:
--   - security.phone_number
--   - login_attempts.email_attempted
--   - user_sessions.session_token
--   - verification_codes (ensure encrypted columns used)
--   - security_sessions.firebase_token (hash)
-- Date: December 11, 2025
-- Phase: Security Hardening
-- ============================================

-- ============================================
-- 1. SECURITY.PHONE_NUMBER → ENCRYPT
-- ============================================
ALTER TABLE security ADD COLUMN IF NOT EXISTS phone_number_encrypted BYTEA;
ALTER TABLE security ADD COLUMN IF NOT EXISTS recovery_phone_encrypted BYTEA;
ALTER TABLE security ADD COLUMN IF NOT EXISTS recovery_email_encrypted BYTEA;

-- Encrypt existing phone numbers
UPDATE security 
SET phone_number_encrypted = pgp_sym_encrypt(phone_number::text, current_setting('app.encryption_key'))
WHERE phone_number IS NOT NULL 
  AND phone_number_encrypted IS NULL;

-- Encrypt recovery phones
UPDATE security 
SET recovery_phone_encrypted = pgp_sym_encrypt(recovery_phone::text, current_setting('app.encryption_key'))
WHERE recovery_phone IS NOT NULL 
  AND recovery_phone_encrypted IS NULL;

-- Encrypt recovery emails
UPDATE security 
SET recovery_email_encrypted = pgp_sym_encrypt(recovery_email::text, current_setting('app.encryption_key'))
WHERE recovery_email IS NOT NULL 
  AND recovery_email_encrypted IS NULL;

-- Log migration status
SELECT 'security.phone_number encrypted' as status,
  COUNT(*) as encrypted_count 
FROM security 
WHERE phone_number_encrypted IS NOT NULL;

---

-- ============================================
-- 2. LOGIN_ATTEMPTS.EMAIL_ATTEMPTED → ENCRYPT
-- ============================================
ALTER TABLE login_attempts ADD COLUMN IF NOT EXISTS email_attempted_encrypted BYTEA;

-- Encrypt existing emails
UPDATE login_attempts 
SET email_attempted_encrypted = pgp_sym_encrypt(email_attempted, current_setting('app.encryption_key'))
WHERE email_attempted IS NOT NULL 
  AND email_attempted_encrypted IS NULL;

-- Log migration status
SELECT 'login_attempts.email_attempted encrypted' as status,
  COUNT(*) as encrypted_count 
FROM login_attempts 
WHERE email_attempted_encrypted IS NOT NULL;

---

-- ============================================
-- 3. USER_SESSIONS.SESSION_TOKEN → HASH
-- ============================================
-- Add hash column for tokens (tokens should be hashed, not encrypted)
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS session_token_hash VARCHAR(255);

-- Hash existing tokens (SHA-256)
-- WARNING: This will invalidate active sessions - table should be empty
UPDATE user_sessions 
SET session_token_hash = encode(digest(session_token, 'sha256'), 'hex')
WHERE session_token IS NOT NULL 
  AND session_token_hash IS NULL;

-- Verify migration
SELECT 'user_sessions.session_token hashed' as status,
  COUNT(*) as hashed_count 
FROM user_sessions 
WHERE session_token_hash IS NOT NULL;

---

-- ============================================
-- 4. SECURITY_SESSIONS.FIREBASE_TOKEN → HASH
-- ============================================
ALTER TABLE security_sessions ADD COLUMN IF NOT EXISTS firebase_token_hash VARCHAR(255);

-- Hash existing Firebase tokens
UPDATE security_sessions 
SET firebase_token_hash = encode(digest(firebase_token, 'sha256'), 'hex')
WHERE firebase_token IS NOT NULL 
  AND firebase_token_hash IS NULL;

-- Verify migration
SELECT 'security_sessions.firebase_token hashed' as status,
  COUNT(*) as hashed_count 
FROM security_sessions 
WHERE firebase_token_hash IS NOT NULL;

---

-- ============================================
-- 5. VERIFICATION_CODES - ENSURE ENCRYPTED COLUMNS
-- ============================================
-- Add encrypted columns if they don't exist
ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS email_encrypted BYTEA;
ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS phone_number_encrypted BYTEA;

-- Encrypt existing emails
UPDATE verification_codes 
SET email_encrypted = pgp_sym_encrypt(email, current_setting('app.encryption_key'))
WHERE email IS NOT NULL 
  AND email_encrypted IS NULL;

-- Encrypt existing phone numbers
UPDATE verification_codes 
SET phone_number_encrypted = pgp_sym_encrypt(phone_number, current_setting('app.encryption_key'))
WHERE phone_number IS NOT NULL 
  AND phone_number_encrypted IS NULL;

-- Log migration status
SELECT 'verification_codes encrypted' as status,
  COUNT(*) as encrypted_count 
FROM verification_codes 
WHERE email_encrypted IS NOT NULL OR phone_number_encrypted IS NOT NULL;

---

-- ============================================
-- 6. PENDING_MIGRATIONS - ADD ENCRYPTED COLUMN
-- ============================================
ALTER TABLE pending_migrations ADD COLUMN IF NOT EXISTS email_encrypted BYTEA;

-- Encrypt existing emails
UPDATE pending_migrations 
SET email_encrypted = pgp_sym_encrypt(email, current_setting('app.encryption_key'))
WHERE email IS NOT NULL 
  AND email_encrypted IS NULL;

-- Log migration status
SELECT 'pending_migrations.email encrypted' as status,
  COUNT(*) as encrypted_count 
FROM pending_migrations 
WHERE email_encrypted IS NOT NULL;

---

-- ============================================
-- 7. ADD FUNCTIONS FOR CLEANUP & EXPIRATION
-- ============================================

-- Clean up expired verification codes (older than 10 minutes)
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM verification_codes
  WHERE expires_at < NOW();
  
  -- Log the cleanup
  RAISE NOTICE 'Cleaned up expired verification codes';
END;
$$ LANGUAGE plpgsql;

-- Clean up old login attempts (older than 90 days, for privacy)
CREATE OR REPLACE FUNCTION cleanup_old_login_attempts()
RETURNS void AS $$
BEGIN
  DELETE FROM login_attempts
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Log the cleanup
  RAISE NOTICE 'Cleaned up old login attempts';
END;
$$ LANGUAGE plpgsql;

-- Clean up expired sessions (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_user_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM user_sessions
  WHERE expires_at < NOW() - INTERVAL '7 days';
  
  -- Log the cleanup
  RAISE NOTICE 'Cleaned up old user sessions';
END;
$$ LANGUAGE plpgsql;

---

-- ============================================
-- 8. FINAL VERIFICATION
-- ============================================

-- Check for remaining plaintext PII
SELECT 'SECURITY CHECK - Plaintext PII Still Exposed:' as check_type;

SELECT 'security.phone_number (plaintext)' as column_name, COUNT(*) as count
FROM security WHERE phone_number IS NOT NULL
UNION ALL
SELECT 'login_attempts.email_attempted (plaintext)', COUNT(*)
FROM login_attempts WHERE email_attempted IS NOT NULL
UNION ALL
SELECT 'verification_codes.email (plaintext)', COUNT(*)
FROM verification_codes WHERE email IS NOT NULL
UNION ALL
SELECT 'verification_codes.phone_number (plaintext)', COUNT(*)
FROM verification_codes WHERE phone_number IS NOT NULL
UNION ALL
SELECT 'pending_migrations.email (plaintext)', COUNT(*)
FROM pending_migrations WHERE email IS NOT NULL;

-- Expected result: All counts should be 0 after encrypted columns populated

-- Check encrypted data is present
SELECT 'SECURITY CHECK - Encrypted/Hashed Data Present:' as check_type;

SELECT 'security.phone_number_encrypted' as column_name, COUNT(*) as count
FROM security WHERE phone_number_encrypted IS NOT NULL
UNION ALL
SELECT 'login_attempts.email_attempted_encrypted', COUNT(*)
FROM login_attempts WHERE email_attempted_encrypted IS NOT NULL
UNION ALL
SELECT 'user_sessions.session_token_hash', COUNT(*)
FROM user_sessions WHERE session_token_hash IS NOT NULL
UNION ALL
SELECT 'security_sessions.firebase_token_hash', COUNT(*)
FROM security_sessions WHERE firebase_token_hash IS NOT NULL
UNION ALL
SELECT 'verification_codes.email_encrypted', COUNT(*)
FROM verification_codes WHERE email_encrypted IS NOT NULL
UNION ALL
SELECT 'verification_codes.phone_number_encrypted', COUNT(*)
FROM verification_codes WHERE phone_number_encrypted IS NOT NULL
UNION ALL
SELECT 'pending_migrations.email_encrypted', COUNT(*)
FROM pending_migrations WHERE email_encrypted IS NOT NULL;

SELECT 'Migration completed successfully' as status;
