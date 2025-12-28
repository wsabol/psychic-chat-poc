-- Migration: Add voice selection and language to user_preferences
-- Date: 2025

-- Add voice_selected column to user_preferences
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS voice_selected VARCHAR(50) DEFAULT 'sophia';

-- Add language column if it doesn't exist
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en-US';

-- Create index on voice_selected
CREATE INDEX IF NOT EXISTS idx_user_preferences_voice ON user_preferences(voice_selected);

-- Create index on language
CREATE INDEX IF NOT EXISTS idx_user_preferences_language ON user_preferences(language);
