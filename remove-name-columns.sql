-- ============================================================
-- Migration: Remove first_name and last_name from user_personal_info
-- 
-- Reason: First and last names are not required by the application.
-- The oracle uses familiar_name_encrypted (addressPreference) for
-- personalization, falling back to "Seeker" if no name is provided.
-- Email is stored as email_hash + email_encrypted from the verified
-- Firebase auth token — it is no longer collected via the form.
--
-- Run this in HeidiSQL or pgAdmin BEFORE deploying the updated code.
-- ============================================================

ALTER TABLE user_personal_info
  DROP COLUMN IF EXISTS first_name_encrypted,
  DROP COLUMN IF EXISTS last_name_encrypted;

-- Verify the columns are gone (run after the ALTER TABLE):
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'user_personal_info'
-- ORDER BY ordinal_position;
