-- ============================================================================
-- Fix: Reset onboarding_step for user stuathome87@gmail.com
-- user_id: kKNcC3qXDoPZvrjPO02zr6qTF1P2
--
-- Problem: The user's onboarding_step was reset to an early step (e.g. 'create_account')
-- even though their subscription is active and they previously completed onboarding.
-- This caused them to be stuck on the Subscription screen during onboarding.
--
-- Fix: Set onboarding_step = 'welcome' and onboarding_completed = true
-- so the API considers onboarding fully complete and routes directly to the app.
--
-- Usage:
--   Via SSH tunnel: psql -h localhost -p 5433 -U <user> -d <dbname> -f fix-stuck-user-onboarding.sql
--   Via ECS exec:  psql $DATABASE_URL -f fix-stuck-user-onboarding.sql
-- ============================================================================

-- Step 1: Preview the current state before making changes
SELECT
  user_id,
  onboarding_step,
  onboarding_completed,
  onboarding_completed_at,
  subscription_status,
  billing_platform,
  updated_at
FROM user_personal_info
WHERE user_id = 'kKNcC3qXDoPZvrjPO02zr6qTF1P2';

-- Step 2: Apply the fix
UPDATE user_personal_info
SET
  onboarding_step         = 'welcome',
  onboarding_completed    = true,
  onboarding_completed_at = COALESCE(onboarding_completed_at, NOW()),
  updated_at              = NOW()
WHERE user_id = 'kKNcC3qXDoPZvrjPO02zr6qTF1P2';

-- Step 3: Confirm the fix was applied
SELECT
  user_id,
  onboarding_step,
  onboarding_completed,
  onboarding_completed_at,
  subscription_status,
  billing_platform,
  updated_at
FROM user_personal_info
WHERE user_id = 'kKNcC3qXDoPZvrjPO02zr6qTF1P2';
