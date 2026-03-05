-- ============================================================
-- Migration: global multi-currency billing (Phase 6.0)
-- Run against production via SSH tunnel:
--
--   psql -h localhost -p 5433 -U masteradmin -d psychic_chat -f migrate-global-billing.sql
--
-- Safe to run multiple times (all statements are idempotent).
-- ============================================================

-- 1. Add country_code column (ISO 3166-1 alpha-2, e.g. 'BR', 'DE')
--    Stores the customer's billing address country.
--    Not PII — stored plain for fast lookup.
ALTER TABLE user_personal_info
  ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);

-- 2. Add subscription_currency column (ISO 4217, e.g. 'usd', 'brl', 'eur')
--    Stores the currency used when the active subscription was created.
--    Cannot be changed without cancelling and re-creating the subscription.
ALTER TABLE user_personal_info
  ADD COLUMN IF NOT EXISTS subscription_currency VARCHAR(3);

-- 3. Index: country_code (sparse — only rows that have a value)
CREATE INDEX IF NOT EXISTS idx_user_country_code
  ON user_personal_info(country_code)
  WHERE country_code IS NOT NULL;

-- 4. Index: subscription_currency (sparse)
CREATE INDEX IF NOT EXISTS idx_user_subscription_currency
  ON user_personal_info(subscription_currency)
  WHERE subscription_currency IS NOT NULL;

-- 5. Verify
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_personal_info'
  AND column_name IN ('country_code', 'subscription_currency')
ORDER BY column_name;
