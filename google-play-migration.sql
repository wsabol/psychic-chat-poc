-- Migration: add-google-play-billing
-- Run via: psql -h localhost -p 5433 -U masteradmin -d psychic_chat -f google-play-migration.sql
-- (psql will prompt for password securely)

ALTER TABLE user_personal_info
  ADD COLUMN IF NOT EXISTS billing_platform VARCHAR(20) DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS google_play_purchase_token TEXT,
  ADD COLUMN IF NOT EXISTS google_play_product_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS google_play_order_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_google_play_purchase_token
  ON user_personal_info(google_play_purchase_token)
  WHERE google_play_purchase_token IS NOT NULL;

-- Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_personal_info'
  AND column_name IN (
    'billing_platform',
    'google_play_purchase_token',
    'google_play_product_id',
    'google_play_order_id'
  )
ORDER BY column_name;
