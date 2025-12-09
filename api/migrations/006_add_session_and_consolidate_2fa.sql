-- ============================================
-- Migration: Add persistent session preference
-- Purpose: Support "Stay Logged In" feature
-- Date: 2025
-- ============================================

-- Add persistent_session to user_2fa_settings
-- Controls JWT token expiry: true = 30 days, false = browser close
ALTER TABLE user_2fa_settings 
ADD COLUMN IF NOT EXISTS persistent_session BOOLEAN DEFAULT FALSE;

-- Add comment for clarity
COMMENT ON COLUMN user_2fa_settings.persistent_session IS 
  'true = stay logged in for 30 days, false = logout when browser closes';

-- Create index for faster session preference lookups
CREATE INDEX IF NOT EXISTS idx_user_2fa_settings_persistent ON user_2fa_settings(persistent_session);
