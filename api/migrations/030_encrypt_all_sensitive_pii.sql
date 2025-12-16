-- ============================================
-- PHASE 3.0: ENCRYPT ALL SENSITIVE PII
-- Date: December 2025
-- Critical: Encrypt all remaining plaintext sensitive data
-- ============================================

-- Ensure pgcrypto is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- STEP 1: ADD HASH COLUMNS FOR user_id (11 tables)
-- ============================================

ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS user_id_hash VARCHAR(64);
ALTER TABLE login_attempts ADD COLUMN IF NOT EXISTS user_id_hash VARCHAR(64);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS user_id_hash VARCHAR(64);
ALTER TABLE pending_migrations ADD COLUMN IF NOT EXISTS temp_user_id_hash VARCHAR(64);
ALTER TABLE user_account_lockouts ADD COLUMN IF NOT EXISTS user_id_hash VARCHAR(64);
ALTER TABLE user_consents ADD COLUMN IF NOT EXISTS user_id_hash VARCHAR(64);
ALTER TABLE user_login_attempts ADD COLUMN IF NOT EXISTS user_id_hash VARCHAR(64);
ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS user_id_hash VARCHAR(64);

-- ============================================
-- STEP 2: ADD ENCRYPTED COLUMNS FOR SENSITIVE DATA
-- ============================================

-- account_deletion_audit
ALTER TABLE account_deletion_audit 
  ADD COLUMN IF NOT EXISTS user_id_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS ip_address_encrypted BYTEA;

-- security (4 sensitive fields)
ALTER TABLE security 
  ADD COLUMN IF NOT EXISTS phone_number_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS recovery_email_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS recovery_phone_encrypted BYTEA;

-- security_sessions (firebase_token is sensitive - 1024 chars)
ALTER TABLE security_sessions 
  ADD COLUMN IF NOT EXISTS firebase_token_encrypted BYTEA;

-- user_sessions (session_token is critical auth data)
ALTER TABLE user_sessions 
  ADD COLUMN IF NOT EXISTS session_token_encrypted BYTEA;

-- ============================================
-- STEP 3: CREATE HELPER FUNCTION FOR HASHING
-- ============================================

CREATE OR REPLACE FUNCTION hash_user_id(user_id VARCHAR)
RETURNS VARCHAR(64) AS $$
BEGIN
  RETURN encode(digest(user_id, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- STEP 4: POPULATE HASH COLUMNS
-- ============================================

UPDATE audit_log SET user_id_hash = hash_user_id(user_id) WHERE user_id IS NOT NULL AND user_id_hash IS NULL;
UPDATE account_deletion_audit SET user_id_hash = hash_user_id(user_id) WHERE user_id IS NOT NULL AND user_id_hash IS NULL;
UPDATE login_attempts SET user_id_hash = hash_user_id(user_id) WHERE user_id IS NOT NULL AND user_id_hash IS NULL;
UPDATE messages SET user_id_hash = hash_user_id(user_id) WHERE user_id IS NOT NULL AND user_id_hash IS NULL;
UPDATE pending_migrations SET temp_user_id_hash = hash_user_id(temp_user_id) WHERE temp_user_id IS NOT NULL AND temp_user_id_hash IS NULL;
UPDATE user_account_lockouts SET user_id_hash = hash_user_id(user_id) WHERE user_id IS NOT NULL AND user_id_hash IS NULL;
UPDATE user_consents SET user_id_hash = hash_user_id(user_id) WHERE user_id IS NOT NULL AND user_id_hash IS NULL;
UPDATE user_login_attempts SET user_id_hash = hash_user_id(user_id) WHERE user_id IS NOT NULL AND user_id_hash IS NULL;
UPDATE verification_codes SET user_id_hash = hash_user_id(user_id) WHERE user_id IS NOT NULL AND user_id_hash IS NULL;

-- ============================================
-- STEP 5: POPULATE ENCRYPTED COLUMNS
-- ============================================

-- Get encryption key from environment (will be set by application)
-- For now, using placeholder - application must ensure key is set
DO $$
DECLARE
  v_encryption_key TEXT;
BEGIN
  -- Try to get from environment, fallback to app setting
  v_encryption_key := current_setting('app.encryption_key', true);
  
  IF v_encryption_key IS NULL THEN
    RAISE WARNING 'app.encryption_key not set. Encryption will fail. Set it with: SET app.encryption_key = ''your-key'';';
    RETURN;
  END IF;

  -- account_deletion_audit: encrypt ip_address
  UPDATE account_deletion_audit 
  SET ip_address_encrypted = pgp_sym_encrypt(host(ip_address)::text, v_encryption_key)
  WHERE ip_address IS NOT NULL AND ip_address_encrypted IS NULL;

  -- security: encrypt phone and email fields
  UPDATE security 
  SET phone_number_encrypted = pgp_sym_encrypt(COALESCE(phone_number, ''), v_encryption_key)
  WHERE phone_number IS NOT NULL AND phone_number_encrypted IS NULL;

  UPDATE security 
  SET recovery_email_encrypted = pgp_sym_encrypt(COALESCE(recovery_email, ''), v_encryption_key)
  WHERE recovery_email IS NOT NULL AND recovery_email_encrypted IS NULL;

  UPDATE security 
  SET recovery_phone_encrypted = pgp_sym_encrypt(COALESCE(recovery_phone, ''), v_encryption_key)
  WHERE recovery_phone IS NOT NULL AND recovery_phone_encrypted IS NULL;

  -- security_sessions: encrypt firebase_token (1024 chars - be careful!)
  UPDATE security_sessions 
  SET firebase_token_encrypted = pgp_sym_encrypt(COALESCE(firebase_token, ''), v_encryption_key)
  WHERE firebase_token IS NOT NULL AND firebase_token_encrypted IS NULL;

  -- user_sessions: encrypt session_token (CRITICAL AUTH DATA)
  UPDATE user_sessions 
  SET session_token_encrypted = pgp_sym_encrypt(COALESCE(session_token, ''), v_encryption_key)
  WHERE session_token IS NOT NULL AND session_token_encrypted IS NULL;

END $$;

-- ============================================
-- STEP 6: CREATE INDEXES ON HASH COLUMNS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id_hash ON audit_log(user_id_hash);
CREATE INDEX IF NOT EXISTS idx_account_deletion_audit_user_id_hash ON account_deletion_audit(user_id_hash);
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id_hash ON login_attempts(user_id_hash);
CREATE INDEX IF NOT EXISTS idx_messages_user_id_hash ON messages(user_id_hash);
CREATE INDEX IF NOT EXISTS idx_pending_migrations_temp_user_id_hash ON pending_migrations(temp_user_id_hash);
CREATE INDEX IF NOT EXISTS idx_user_account_lockouts_user_id_hash ON user_account_lockouts(user_id_hash);
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id_hash ON user_consents(user_id_hash);
CREATE INDEX IF NOT EXISTS idx_user_login_attempts_user_id_hash ON user_login_attempts(user_id_hash);
CREATE INDEX IF NOT EXISTS idx_verification_codes_user_id_hash ON verification_codes(user_id_hash);

-- ============================================
-- STEP 7: VERIFY MIGRATION
-- ============================================

-- Check that data was encrypted/hashed successfully
SELECT 'audit_log' AS table_name, 
       COUNT(CASE WHEN user_id_hash IS NOT NULL THEN 1 END) AS hashed_count,
       COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) AS plaintext_count
FROM audit_log
UNION ALL
SELECT 'security', 
       COUNT(CASE WHEN phone_number_encrypted IS NOT NULL THEN 1 END),
       COUNT(CASE WHEN phone_number IS NOT NULL THEN 1 END)
FROM security
UNION ALL
SELECT 'security_sessions', 
       COUNT(CASE WHEN firebase_token_encrypted IS NOT NULL THEN 1 END),
       COUNT(CASE WHEN firebase_token IS NOT NULL THEN 1 END)
FROM security_sessions
UNION ALL
SELECT 'user_sessions', 
       COUNT(CASE WHEN session_token_encrypted IS NOT NULL THEN 1 END),
       COUNT(CASE WHEN session_token IS NOT NULL THEN 1 END)
FROM user_sessions;

-- ============================================
-- IMPORTANT NOTES
-- ============================================
-- 1. Plaintext columns are NOT deleted yet - kept for backward compatibility
-- 2. Application code must be updated to:
--    - Write to encrypted columns
--    - Read from encrypted columns
--    - Use hash function for user_id lookups
-- 3. Once code is updated and verified, run:
--    ALTER TABLE table_name DROP COLUMN IF EXISTS plaintext_column;
-- 4. This migration MUST be run with app.encryption_key set in environment
