-- Migration 002: Remove Plaintext Columns
-- ONLY RUN THIS AFTER VERIFYING API WORKS WITH ENCRYPTED DATA
-- This removes the original plaintext columns for security

-- Safety check: Ensure encrypted columns have data
DO $$
DECLARE
  plaintext_count INT;
  encrypted_count INT;
BEGIN
  SELECT COUNT(*) INTO plaintext_count
  FROM user_personal_info
  WHERE email IS NOT NULL;
  
  SELECT COUNT(*) INTO encrypted_count
  FROM user_personal_info
  WHERE email_encrypted IS NOT NULL;
  
  IF plaintext_count != encrypted_count THEN
    RAISE EXCEPTION 'Mismatch: % plaintext records vs % encrypted records. ABORT!',
      plaintext_count, encrypted_count;
  END IF;
  
  RAISE NOTICE 'Safety check passed: % records encrypted', encrypted_count;
END$$;

-- Step 1: Remove plaintext columns
ALTER TABLE user_personal_info
DROP COLUMN IF EXISTS email,
DROP COLUMN IF EXISTS birth_date,
DROP COLUMN IF EXISTS birth_city,
DROP COLUMN IF EXISTS birth_timezone,
DROP COLUMN IF EXISTS first_name,
DROP COLUMN IF EXISTS last_name,
DROP COLUMN IF EXISTS birth_country,
DROP COLUMN IF EXISTS birth_province;

-- Step 2: Rename encrypted columns to original names (optional but cleaner)
-- This makes the API code simpler - you query 'email' not 'email_encrypted'
ALTER TABLE user_personal_info
RENAME COLUMN email_encrypted TO email,
RENAME COLUMN birth_date_encrypted TO birth_date,
RENAME COLUMN birth_city_encrypted TO birth_city,
RENAME COLUMN birth_timezone_encrypted TO birth_timezone,
RENAME COLUMN first_name_encrypted TO first_name,
RENAME COLUMN last_name_encrypted TO last_name,
RENAME COLUMN birth_country_encrypted TO birth_country,
RENAME COLUMN birth_province_encrypted TO birth_province;

Raise NOTICE 'Plaintext columns removed and encrypted columns renamed. Done!';
