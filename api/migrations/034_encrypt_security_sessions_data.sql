-- ============================================
-- Migration 034: Encrypt security_sessions data
-- Purpose: Encrypt plaintext device_name and ip_address in security_sessions
-- Date: 2025-12-20
-- ============================================

-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ========== STEP 1: VERIFY DATA EXISTS ==========

DO $$
DECLARE
    v_plaintext_devices INT;
    v_plaintext_ips INT;
    v_encrypted_devices INT;
    v_encrypted_ips INT;
BEGIN
    SELECT COUNT(*) INTO v_plaintext_devices FROM security_sessions 
    WHERE device_name IS NOT NULL AND device_name != '';
    
    SELECT COUNT(*) INTO v_plaintext_ips FROM security_sessions 
    WHERE ip_address IS NOT NULL AND ip_address != '';
    
    SELECT COUNT(*) INTO v_encrypted_devices FROM security_sessions 
    WHERE device_name_encrypted IS NOT NULL;
    
    SELECT COUNT(*) INTO v_encrypted_ips FROM security_sessions 
    WHERE ip_address_encrypted IS NOT NULL;
    
    RAISE NOTICE '[MIGRATION 034] Current state:';
    RAISE NOTICE '  - Plaintext device_names: %', v_plaintext_devices;
    RAISE NOTICE '  - Plaintext ip_addresses: %', v_plaintext_ips;
    RAISE NOTICE '  - Encrypted device_names: %', v_encrypted_devices;
    RAISE NOTICE '  - Encrypted ip_addresses: %', v_encrypted_ips;
END $$;

-- ========== STEP 2: ENCRYPT PLAINTEXT DATA ==========
-- NOTE: This migration must be run with the application providing ENCRYPTION_KEY
-- The application will handle the actual encryption via a separate script

-- Create helper function to encrypt with environment key
CREATE OR REPLACE FUNCTION encrypt_device_session_data(
    encryption_key VARCHAR
)
RETURNS TABLE (encrypted_count INT) AS $$
DECLARE
    v_count INT := 0;
BEGIN
    -- Encrypt device_name
    UPDATE security_sessions 
    SET device_name_encrypted = pgp_sym_encrypt(
        COALESCE(device_name, ''), 
        encryption_key
    )
    WHERE device_name IS NOT NULL AND device_name != '' AND device_name_encrypted IS NULL;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '[MIGRATION 034] Encrypted % device_names', v_count;
    
    -- Encrypt ip_address
    UPDATE security_sessions 
    SET ip_address_encrypted = pgp_sym_encrypt(
        COALESCE(ip_address, ''), 
        encryption_key
    )
    WHERE ip_address IS NOT NULL AND ip_address != '' AND ip_address_encrypted IS NULL;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '[MIGRATION 034] Encrypted % ip_addresses', v_count;
    
    RETURN QUERY SELECT COUNT(*) FROM security_sessions WHERE device_name_encrypted IS NOT NULL OR ip_address_encrypted IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- ========== STEP 3: VERIFY MIGRATION SUCCESS ==========

DO $$
DECLARE
    v_total INT;
    v_encrypted_devices INT;
    v_encrypted_ips INT;
    v_plaintext_devices INT;
BEGIN
    SELECT COUNT(*) INTO v_total FROM security_sessions;
    SELECT COUNT(*) INTO v_encrypted_devices FROM security_sessions WHERE device_name_encrypted IS NOT NULL;
    SELECT COUNT(*) INTO v_encrypted_ips FROM security_sessions WHERE ip_address_encrypted IS NOT NULL;
    SELECT COUNT(*) INTO v_plaintext_devices FROM security_sessions WHERE device_name IS NOT NULL AND device_name != '';
    
    RAISE NOTICE '[MIGRATION 034] ✅ Migration verification:';
    RAISE NOTICE '  - Total records: %', v_total;
    RAISE NOTICE '  - Encrypted device_names: %', v_encrypted_devices;
    RAISE NOTICE '  - Encrypted ip_addresses: %', v_encrypted_ips;
    RAISE NOTICE '  - Remaining plaintext device_names: %', v_plaintext_devices;
    RAISE NOTICE '[MIGRATION 034] NOTE: Run application encryption script to populate encrypted columns';
END $$;

-- ========== DOCUMENTATION ==========

COMMENT ON FUNCTION encrypt_device_session_data(VARCHAR) IS 'Encrypt plaintext security_sessions data using provided encryption key. Call from application with: SELECT encrypt_device_session_data(encryption_key)';

-- ========== STATUS ==========

SELECT '[MIGRATION 034] ✅ Security sessions encryption migration created. Ready for application-driven encryption.' as status;
