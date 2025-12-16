-- ============================================================================
-- MIGRATION: Encrypt Stripe Customer ID
-- Purpose: Prevent exposure of Stripe customer identifiers
-- Impact: Critical PII/sensitive data protection
-- ============================================================================
SET app.encryption_key TO 'your-actual-key-from-.env';
-- Step 1: Add encrypted column
ALTER TABLE user_personal_info 
ADD COLUMN IF NOT EXISTS stripe_customer_id_encrypted BYTEA;

-- Step 2: Encrypt existing stripe_customer_ids
-- NOTE: This requires ENCRYPTION_KEY to be set in PostgreSQL session
-- Before running this, set: SET app.encryption_key TO 'your-key';
UPDATE user_personal_info 
SET stripe_customer_id_encrypted = pgp_sym_encrypt(
  stripe_customer_id, 
  current_setting('app.encryption_key')
)
WHERE stripe_customer_id IS NOT NULL 
  AND stripe_customer_id_encrypted IS NULL;

-- Step 3: Verify encryption was successful
-- This should return the count of encrypted records
SELECT COUNT(*) as stripe_ids_encrypted 
FROM user_personal_info 
WHERE stripe_customer_id_encrypted IS NOT NULL;

-- Step 4: Drop old plaintext column (AFTER VERIFICATION)
-- Uncomment after confirming all data is encrypted:
-- ALTER TABLE user_personal_info DROP COLUMN stripe_customer_id;
-- ALTER TABLE user_personal_info DROP INDEX IF EXISTS idx_user_personal_info_stripe_id;
