-- Encrypt existing plain text emails in audit_log
-- This migration moves emails from details JSONB to encrypted email_encrypted column

-- Step 1: Find all rows with emails in details and encrypt them
UPDATE audit_log
SET email_encrypted = pgp_sym_encrypt(
  details->>'email',  -- Extract email from JSONB as text
  current_setting('app.encryption_key')  -- Use encryption key from app config
)
WHERE details ? 'email'  -- Only rows that have 'email' key in details JSONB
  AND details->>'email' IS NOT NULL
  AND email_encrypted IS NULL;  -- Don't re-encrypt already encrypted rows

-- Step 2: Verify encryption worked
-- SELECT COUNT(*) as encrypted_count FROM audit_log WHERE email_encrypted IS NOT NULL;

-- Step 3: Optional - Remove plain text emails from details JSONB (be careful with this!)
-- Uncomment only if you want to remove the plain text emails from JSONB
-- UPDATE audit_log
-- SET details = details - 'email'
-- WHERE details ? 'email'
--   AND email_encrypted IS NOT NULL;
