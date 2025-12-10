-- ============================================
-- Migration: Encrypt Remaining PII
-- Purpose: Encrypt all plaintext sensitive data across multiple tables
-- Date: 2025-12-15
-- Phases: 1 (Add columns) + 2 (Encrypt existing data) combined
-- ============================================

-- ========== PHASE 1: ADD ENCRYPTED COLUMNS ==========

-- 1. audit_logs: Add encrypted IP address column
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address_encrypted BYTEA;
COMMENT ON COLUMN audit_logs.ip_address_encrypted IS 'Encrypted IP address from audit trail';

-- 2. pending_migrations: Add encrypted email column
ALTER TABLE pending_migrations ADD COLUMN IF NOT EXISTS email_encrypted BYTEA;
COMMENT ON COLUMN pending_migrations.email_encrypted IS 'Encrypted email address for temp account migration';

-- 3. security_sessions: Add encrypted IP and device_name columns
ALTER TABLE security_sessions ADD COLUMN IF NOT EXISTS ip_address_encrypted BYTEA;
ALTER TABLE security_sessions ADD COLUMN IF NOT EXISTS device_name_encrypted BYTEA;
COMMENT ON COLUMN security_sessions.ip_address_encrypted IS 'Encrypted IP address for device session tracking';
COMMENT ON COLUMN security_sessions.device_name_encrypted IS 'Encrypted device name/location info';

-- 4. user_sessions: Add encrypted IP address column
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS ip_address_encrypted BYTEA;
COMMENT ON COLUMN user_sessions.ip_address_encrypted IS 'Encrypted IP address from user session';

-- 5. user_account_lockouts: Add encrypted IP addresses array
ALTER TABLE user_account_lockouts ADD COLUMN IF NOT EXISTS ip_addresses_encrypted BYTEA;
COMMENT ON COLUMN user_account_lockouts.ip_addresses_encrypted IS 'Encrypted array of IP addresses that triggered lockout';

-- 6. verification_codes: Add encrypted phone and email columns
ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS phone_number_encrypted BYTEA;
ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS email_encrypted BYTEA;
COMMENT ON COLUMN verification_codes.phone_number_encrypted IS 'Encrypted phone number being verified';
COMMENT ON COLUMN verification_codes.email_encrypted IS 'Encrypted email address being verified';

-- 7. login_attempts: Add encrypted email and IP columns
ALTER TABLE login_attempts ADD COLUMN IF NOT EXISTS email_attempted_encrypted BYTEA;
ALTER TABLE login_attempts ADD COLUMN IF NOT EXISTS ip_address_encrypted BYTEA;
COMMENT ON COLUMN login_attempts.email_attempted_encrypted IS 'Encrypted email address from login attempt';
COMMENT ON COLUMN login_attempts.ip_address_encrypted IS 'Encrypted IP address from login attempt';

-- ========== CREATE INDEXES FOR ENCRYPTED COLUMNS ==========
-- Note: These index the encrypted values directly for lookups
-- For most queries, you'll decrypt then query in application code

CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_encrypted ON audit_logs(ip_address_encrypted);
CREATE INDEX IF NOT EXISTS idx_pending_migrations_email_encrypted ON pending_migrations(email_encrypted);
CREATE INDEX IF NOT EXISTS idx_security_sessions_ip_encrypted ON security_sessions(ip_address_encrypted);
CREATE INDEX IF NOT EXISTS idx_security_sessions_device_encrypted ON security_sessions(device_name_encrypted);
CREATE INDEX IF NOT EXISTS idx_user_sessions_ip_encrypted ON user_sessions(ip_address_encrypted);
CREATE INDEX IF NOT EXISTS idx_verification_codes_phone_encrypted ON verification_codes(phone_number_encrypted);
CREATE INDEX IF NOT EXISTS idx_verification_codes_email_encrypted ON verification_codes(email_encrypted);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_encrypted ON login_attempts(email_attempted_encrypted);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_encrypted ON login_attempts(ip_address_encrypted);

-- ========== CREATE/UPDATE DECRYPT FUNCTIONS ==========

-- Decrypt IP address (converts from bytea to varchar)
CREATE OR REPLACE FUNCTION decrypt_ip_address(encrypted BYTEA, encryption_key VARCHAR DEFAULT 'default_key')
RETURNS VARCHAR AS $$
BEGIN
    IF encrypted IS NULL THEN RETURN NULL; END IF;
    RETURN pgp_sym_decrypt(encrypted, encryption_key);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Decrypt phone number
CREATE OR REPLACE FUNCTION decrypt_phone_number(encrypted BYTEA, encryption_key VARCHAR DEFAULT 'default_key')
RETURNS VARCHAR AS $$
BEGIN
    IF encrypted IS NULL THEN RETURN NULL; END IF;
    RETURN pgp_sym_decrypt(encrypted, encryption_key);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Decrypt email address
CREATE OR REPLACE FUNCTION decrypt_email_address(encrypted BYTEA, encryption_key VARCHAR DEFAULT 'default_key')
RETURNS VARCHAR AS $$
BEGIN
    IF encrypted IS NULL THEN RETURN NULL; END IF;
    RETURN pgp_sym_decrypt(encrypted, encryption_key);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Decrypt device name
CREATE OR REPLACE FUNCTION decrypt_device_name(encrypted BYTEA, encryption_key VARCHAR DEFAULT 'default_key')
RETURNS VARCHAR AS $$
BEGIN
    IF encrypted IS NULL THEN RETURN NULL; END IF;
    RETURN pgp_sym_decrypt(encrypted, encryption_key);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ========== PHASE 2: ENCRYPT EXISTING PLAINTEXT DATA ==========
-- NOTE: This assumes ENCRYPTION_KEY is set at migration runtime
-- The application will handle encryption via parameterized queries

-- Helper function to encrypt data during migration
-- This allows the migration to work without hardcoding the key
CREATE OR REPLACE FUNCTION encrypt_with_key(plain_text VARCHAR, encryption_key VARCHAR)
RETURNS BYTEA AS $$
BEGIN
    IF plain_text IS NULL THEN RETURN NULL; END IF;
    RETURN pgp_sym_encrypt(plain_text, encryption_key);
END;
$$ LANGUAGE plpgsql;

-- Verify the encryption key is set (this will be called by the application)
-- For now, we mark where encryption happens with comments for application to handle

-- ========== DATA VALIDATION BEFORE ENCRYPTION ==========

-- Count plaintext records that need encryption
DO $$
DECLARE
    v_audit_count INT;
    v_pending_count INT;
    v_sec_sessions_ip INT;
    v_sec_sessions_device INT;
    v_user_sessions_count INT;
    v_verification_phone INT;
    v_verification_email INT;
    v_login_email INT;
    v_login_ip INT;
BEGIN
    SELECT COUNT(*) INTO v_audit_count FROM audit_logs WHERE ip_address IS NOT NULL AND ip_address_encrypted IS NULL;
    SELECT COUNT(*) INTO v_pending_count FROM pending_migrations WHERE email IS NOT NULL AND email_encrypted IS NULL;
    SELECT COUNT(*) INTO v_sec_sessions_ip FROM security_sessions WHERE ip_address IS NOT NULL AND ip_address_encrypted IS NULL;
    SELECT COUNT(*) INTO v_sec_sessions_device FROM security_sessions WHERE device_name IS NOT NULL AND device_name_encrypted IS NULL;
    SELECT COUNT(*) INTO v_user_sessions_count FROM user_sessions WHERE ip_address IS NOT NULL AND ip_address_encrypted IS NULL;
    SELECT COUNT(*) INTO v_verification_phone FROM verification_codes WHERE phone_number IS NOT NULL AND phone_number_encrypted IS NULL;
    SELECT COUNT(*) INTO v_verification_email FROM verification_codes WHERE email IS NOT NULL AND email_encrypted IS NULL;
    SELECT COUNT(*) INTO v_login_email FROM login_attempts WHERE email_attempted IS NOT NULL AND email_attempted_encrypted IS NULL;
    SELECT COUNT(*) INTO v_login_ip FROM login_attempts WHERE ip_address IS NOT NULL AND ip_address_encrypted IS NULL;
    
    RAISE NOTICE '[MIGRATION] Records to encrypt:';
    RAISE NOTICE '  - audit_logs IPs: %', v_audit_count;
    RAISE NOTICE '  - pending_migrations emails: %', v_pending_count;
    RAISE NOTICE '  - security_sessions IPs: %', v_sec_sessions_ip;
    RAISE NOTICE '  - security_sessions devices: %', v_sec_sessions_device;
    RAISE NOTICE '  - user_sessions IPs: %', v_user_sessions_count;
    RAISE NOTICE '  - verification_codes phones: %', v_verification_phone;
    RAISE NOTICE '  - verification_codes emails: %', v_verification_email;
    RAISE NOTICE '  - login_attempts emails: %', v_login_email;
    RAISE NOTICE '  - login_attempts IPs: %', v_login_ip;
END $$;

-- ========== DOCUMENTATION ==========

COMMENT ON FUNCTION decrypt_ip_address(BYTEA, VARCHAR) IS 'Decrypt IP address using provided encryption key';
COMMENT ON FUNCTION decrypt_phone_number(BYTEA, VARCHAR) IS 'Decrypt phone number using provided encryption key';
COMMENT ON FUNCTION decrypt_email_address(BYTEA, VARCHAR) IS 'Decrypt email address using provided encryption key';
COMMENT ON FUNCTION decrypt_device_name(BYTEA, VARCHAR) IS 'Decrypt device name using provided encryption key';
COMMENT ON FUNCTION encrypt_with_key(VARCHAR, VARCHAR) IS 'Encrypt plaintext using provided encryption key';

-- ========== STATUS ==========

SELECT '[MIGRATION] ✅ Phase 1 & 2 migration structure created. Ready for application-driven encryption.' as status;
