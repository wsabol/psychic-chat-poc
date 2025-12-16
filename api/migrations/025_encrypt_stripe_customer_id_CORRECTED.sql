-- ============================================================================
-- MIGRATION: Encrypt Stripe Customer ID
-- Purpose: Prevent exposure of Stripe customer identifiers
-- Impact: Critical PII/sensitive data protection
-- ============================================================================
--
-- ✅ CRITICAL FIX: This version validates that ENCRYPTION_KEY is set
--    BEFORE attempting to encrypt any data
--
-- USAGE (choose one):
--
-- Option 1: Via environment variable (RECOMMENDED)
--   export ENCRYPTION_KEY="your-actual-encryption-key-from-.env-file"
--   psql -U postgres -d chatbot -c "SET app.encryption_key TO '$ENCRYPTION_KEY';" \
--        -f api/migrations/025_encrypt_stripe_customer_id_CORRECTED.sql
--
-- Option 2: Via psql interactively
--   psql -U postgres -d chatbot
--   chatbot=# SET app.encryption_key TO 'your-actual-encryption-key-from-.env-file';
--   chatbot=# \i api/migrations/025_encrypt_stripe_customer_id_CORRECTED.sql
--
-- Option 3: Via Docker (if running in container)
--   docker exec -e ENCRYPTION_KEY="$ENCRYPTION_KEY" psychic-chat-poc-db-1 \
--     psql -U postgres -d chatbot \
--     -c "SET app.encryption_key TO '$ENCRYPTION_KEY';" \
--     -f /path/to/migration.sql
-- ============================================================================

-- ============================================================================
-- STEP 0: VALIDATE ENCRYPTION KEY IS SET (FAIL FAST IF NOT!)
-- ============================================================================
-- This MUST run first to prevent encrypting data with NULL/wrong key
-- If this fails, the entire migration stops (correct behavior)
-- ============================================================================

DO $$
DECLARE
  encryption_key TEXT;
BEGIN
  -- Get the encryption key from PostgreSQL session variable
  encryption_key := current_setting('app.encryption_key', true);
  
  -- ⚠️ CRITICAL CHECK: Reject the placeholder default key
  IF encryption_key = 'default-encryption-key-change-in-production' THEN
    RAISE EXCEPTION 
      'CRITICAL MIGRATION FAILURE: You are using the PLACEHOLDER encryption key!' || E'\n' ||
      'This is the default from docker-compose.yml, NOT your real encryption key.' || E'\n' ||
      'You MUST use the actual ENCRYPTION_KEY from your .env file.' || E'\n\n' ||
      'To proceed:' || E'\n' ||
      '1. Get your real ENCRYPTION_KEY from .env file' || E'\n' ||
      '2. In psql, execute: SET app.encryption_key TO ''<your-actual-key-from-.env>'';' || E'\n' ||
      '3. Then run this migration again' || E'\n\n' ||
      'Using the placeholder key will encrypt data that CANNOT be decrypted later!';
  END IF;
  
  -- Check if key is NULL or empty
  IF encryption_key IS NULL OR encryption_key = '' OR LENGTH(TRIM(encryption_key)) = 0 THEN
    RAISE EXCEPTION 
      'CRITICAL MIGRATION FAILURE: ENCRYPTION_KEY is not set in PostgreSQL session!' || E'\n' ||
      'You must set the encryption key BEFORE running this migration.' || E'\n' ||
      'Execute this in psql first:' || E'\n' ||
      '  SET app.encryption_key TO ''your-actual-encryption-key-from-.env-file'';' || E'\n' ||
      'Then run this migration again.' || E'\n\n' ||
      'The encryption key MUST BE the same ENCRYPTION_KEY from your .env file.';
  END IF;
  
  -- Check if key is strong enough (at least 16 characters)
  IF LENGTH(encryption_key) < 16 THEN
    RAISE EXCEPTION 
      'CRITICAL MIGRATION FAILURE: ENCRYPTION_KEY is too weak!' || E'\n' ||
      'Key length: %s characters (minimum 32 required)' || E'\n' ||
      'Generate a strong key with: openssl rand -base64 32',
      LENGTH(encryption_key);
  END IF;
  
  -- ✅ Key is valid - proceed with encryption
  RAISE NOTICE 'ENCRYPTION_KEY validation: ✓ Key is set and strong (%s characters)', LENGTH(encryption_key);
END $$;

-- ============================================================================
-- STEP 1: ADD ENCRYPTED COLUMN
-- ============================================================================
ALTER TABLE user_personal_info 
ADD COLUMN IF NOT EXISTS stripe_customer_id_encrypted BYTEA;

RAISE NOTICE 'Step 1 Complete: Added stripe_customer_id_encrypted column';

-- ============================================================================
-- STEP 2: ENCRYPT EXISTING STRIPE CUSTOMER IDs
-- ============================================================================
-- Uses the encryption key that was validated in STEP 0
-- Fails with meaningful error if key is wrong or NULL
-- ============================================================================

UPDATE user_personal_info 
SET stripe_customer_id_encrypted = pgp_sym_encrypt(
  stripe_customer_id, 
  current_setting('app.encryption_key')  -- ✅ Uses validated key from STEP 0
)
WHERE stripe_customer_id IS NOT NULL 
  AND stripe_customer_id_encrypted IS NULL;

GET DIAGNOSTICS record_count = ROW_COUNT;
RAISE NOTICE 'Step 2 Complete: Encrypted % stripe customer IDs', record_count;

-- ============================================================================
-- STEP 3: VERIFY ENCRYPTION WAS SUCCESSFUL
-- ============================================================================
-- If this count is 0 and you had plaintext stripe_customer_ids, something went wrong
-- If this count > 0, encryption succeeded
-- ============================================================================

SELECT COUNT(*) as stripe_ids_encrypted 
FROM user_personal_info 
WHERE stripe_customer_id_encrypted IS NOT NULL;

-- ============================================================================
-- STEP 4: VERIFY DECRYPTION WORKS (SANITY CHECK)
-- ============================================================================
-- Decrypt one record to confirm the key is correct
-- If this fails or returns NULL, the encryption key was wrong!
-- ============================================================================

DO $$
DECLARE
  test_decrypted TEXT;
BEGIN
  -- Try to decrypt one encrypted record
  SELECT pgp_sym_decrypt(stripe_customer_id_encrypted, current_setting('app.encryption_key'))
  INTO test_decrypted
  FROM user_personal_info 
  WHERE stripe_customer_id_encrypted IS NOT NULL 
  LIMIT 1;
  
  IF test_decrypted IS NULL THEN
    RAISE EXCEPTION 
      'CRITICAL: Decryption failed! The ENCRYPTION_KEY you used is WRONG!' || E'\n' ||
      'This means the data was encrypted with the wrong key and cannot be decrypted.' || E'\n' ||
      'You must:' || E'\n' ||
      '1. Restore the database from backup' || E'\n' ||
      '2. Use the CORRECT ENCRYPTION_KEY from your .env file' || E'\n' ||
      '3. Re-run this migration';
  END IF;
  
  RAISE NOTICE 'Step 4 Complete: Decryption verification ✓ Encryption key is correct!';
END $$;

-- ============================================================================
-- FINAL: DROP OLD PLAINTEXT COLUMN (AFTER VERIFICATION PERIOD)
-- ============================================================================
-- IMPORTANT: Only uncomment and run this AFTER:
--   1. Code is deployed and working
--   2. Decryption is verified in production (24+ hours)
--   3. You've backed up the database
--
-- Uncomment these lines ONLY when you're 100% sure encryption worked:
-- ============================================================================

-- ⚠️ WARNING: Only uncomment after verification ⚠️
-- ALTER TABLE user_personal_info DROP COLUMN IF EXISTS stripe_customer_id;
-- ALTER TABLE user_personal_info DROP INDEX IF EXISTS idx_user_personal_info_stripe_id;

RAISE NOTICE '';
RAISE NOTICE '============================================================';
RAISE NOTICE 'MIGRATION COMPLETE!';
RAISE NOTICE '============================================================';
RAISE NOTICE 'Next steps:';
RAISE NOTICE '1. ✓ Encrypted stripe_customer_id_encrypted column created';
RAISE NOTICE '2. ✓ All existing stripe_customer_ids encrypted';
RAISE NOTICE '3. ✓ Decryption verified - encryption key is CORRECT';
RAISE NOTICE '';
RAISE NOTICE 'IMPORTANT: Do NOT drop the plaintext column yet!';
RAISE NOTICE 'Wait 24+ hours to confirm:';
RAISE NOTICE '  - Application code uses encrypted column';
RAISE NOTICE '  - Decryption works in production';
RAISE NOTICE '  - No errors in logs';
RAISE NOTICE '';
RAISE NOTICE 'Then uncomment the DROP COLUMN lines at bottom of this file.';
RAISE NOTICE '============================================================';
