-- Migration: Add oracle_language column to user_preferences
-- Purpose: Allow users to select oracle language variant (en-US, en-GB, es-MX, etc.)
-- while keeping page language at base level (en-US, es-ES, fr-FR)

ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS oracle_language VARCHAR(10) DEFAULT 'en-US';

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_oracle_language ON user_preferences(oracle_language);

-- Add comment for documentation
COMMENT ON COLUMN user_preferences.oracle_language IS 
'Oracle response language (e.g., en-US, en-GB, es-MX, es-DO, fr-CA). Allows regional variants for oracle responses.';
