-- Migration 001: Add Encryption to Sensitive Data
-- This migration adds encrypted columns to user_personal_info table
-- and migrates data from plaintext to encrypted format

-- Step 1: Enable pgcrypto extension (MUST BE DONE FIRST)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 2: Add encrypted columns (BYTEA type for encrypted data)
ALTER TABLE user_personal_info
ADD COLUMN IF NOT EXISTS email_encrypted BYTEA,
ADD COLUMN IF NOT EXISTS birth_date_encrypted BYTEA,
ADD COLUMN IF NOT EXISTS birth_city_encrypted BYTEA,
ADD COLUMN IF NOT EXISTS birth_timezone_encrypted BYTEA,
ADD COLUMN IF NOT EXISTS first_name_encrypted BYTEA,
ADD COLUMN IF NOT EXISTS last_name_encrypted BYTEA,
ADD COLUMN IF NOT EXISTS birth_country_encrypted BYTEA,
ADD COLUMN IF NOT EXISTS birth_province_encrypted BYTEA;

-- Step 3: Migrate existing plaintext data to encrypted columns
-- IMPORTANT: Use a strong encryption key. In production, this should be:
-- - Generated once and stored securely
-- - NOT hardcoded in migration
-- - Retrieved from environment variable

-- For now, using placeholder: you'll replace with your actual key
UPDATE user_personal_info
SET
  email_encrypted = pgp_sym_encrypt(COALESCE(email, ''), 'your_encryption_key_here'),
  birth_date_encrypted = pgp_sym_encrypt(COALESCE(CAST(birth_date AS VARCHAR), ''), 'your_encryption_key_here'),
  birth_city_encrypted = pgp_sym_encrypt(COALESCE(birth_city, ''), 'your_encryption_key_here'),
  birth_timezone_encrypted = pgp_sym_encrypt(COALESCE(birth_timezone, ''), 'your_encryption_key_here'),
  first_name_encrypted = pgp_sym_encrypt(COALESCE(first_name, ''), 'your_encryption_key_here'),
  last_name_encrypted = pgp_sym_encrypt(COALESCE(last_name, ''), 'your_encryption_key_here'),
  birth_country_encrypted = pgp_sym_encrypt(COALESCE(birth_country, ''), 'your_encryption_key_here'),
  birth_province_encrypted = pgp_sym_encrypt(COALESCE(birth_province, ''), 'your_encryption_key_here')
WHERE email IS NOT NULL OR birth_date IS NOT NULL OR birth_city IS NOT NULL;

-- Step 4: Verify encryption worked (check that encrypted columns are not empty)
SELECT COUNT(*) as encrypted_records
FROM user_personal_info
WHERE email_encrypted IS NOT NULL;

-- Step 5: Create helper function to decrypt data (for queries)
CREATE OR REPLACE FUNCTION decrypt_email(encrypted BYTEA)
RETURNS VARCHAR AS $$
BEGIN
  IF encrypted IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN pgp_sym_decrypt(encrypted, 'your_encryption_key_here');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION decrypt_birth_date(encrypted BYTEA)
RETURNS DATE AS $$
BEGIN
  IF encrypted IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN CAST(pgp_sym_decrypt(encrypted, 'your_encryption_key_here') AS DATE);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION decrypt_text(encrypted BYTEA)
RETURNS VARCHAR AS $$
BEGIN
  IF encrypted IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN pgp_sym_decrypt(encrypted, 'your_encryption_key_here');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 6: Test decryption
SELECT 
  user_id,
  decrypt_email(email_encrypted) as email,
  decrypt_birth_date(birth_date_encrypted) as birth_date,
  decrypt_text(birth_city_encrypted) as birth_city
FROM user_personal_info
LIMIT 5;

-- NOTE: Do NOT drop plaintext columns yet!
-- Wait until you verify API is working with encrypted data
-- Then run migration 002-remove-plaintext.sql
