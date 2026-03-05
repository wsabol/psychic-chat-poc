-- ============================================================
-- Cleanup: Orphaned user_consents Records
-- ============================================================
-- Removes consent records that have no matching user_personal_info row.
-- This is what caused the compliance dashboard to show 3 users when
-- the database only has 2 actual users.
--
-- Root cause: When a user account is deleted (or a registration is
-- abandoned mid-flow), the user_consents row is left behind because
-- there is no ON DELETE CASCADE foreign key from user_consents to
-- user_personal_info.
--
-- Safe to run: the DELETE only removes orphaned rows that cannot
-- belong to any active user. Real user consent records are protected
-- because their user_id_hash exists in user_personal_info.
-- ============================================================

-- Step 1: Preview what will be deleted (run this first to verify)
SELECT
  uc.user_id_hash,
  uc.terms_version,
  uc.terms_accepted,
  uc.privacy_version,
  uc.privacy_accepted,
  uc.requires_consent_update,
  uc.created_at,
  uc.updated_at
FROM user_consents uc
LEFT JOIN user_personal_info upi ON uc.user_id_hash = upi.user_id_hash
WHERE upi.user_id_hash IS NULL;

-- Step 2: Delete the orphaned records
-- (Uncomment and run after reviewing the preview above)
/*
DELETE FROM user_consents
WHERE user_id_hash IN (
  SELECT uc.user_id_hash
  FROM user_consents uc
  LEFT JOIN user_personal_info upi ON uc.user_id_hash = upi.user_id_hash
  WHERE upi.user_id_hash IS NULL
);
*/

-- Step 3: Verify counts match after cleanup
SELECT
  (SELECT COUNT(*) FROM user_personal_info) AS total_users,
  (SELECT COUNT(*) FROM user_consents)       AS total_consent_records,
  (SELECT COUNT(*)
   FROM user_consents uc
   LEFT JOIN user_personal_info upi ON uc.user_id_hash = upi.user_id_hash
   WHERE upi.user_id_hash IS NULL)           AS orphaned_consent_records;
