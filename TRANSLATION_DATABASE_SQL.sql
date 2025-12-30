-- ============================================================
-- TRANSLATION SYSTEM - DATABASE SETUP FOR LANGUAGE PREFERENCES
-- ============================================================
-- 
-- CURRENT STATUS: The user_preferences table already has the 
-- required 'language' column. No structural changes needed!
--
-- This file documents the existing setup and provides verification queries.
-- ============================================================

-- ============================================================
-- VERIFICATION: Check if language column exists
-- ============================================================
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_preferences'
ORDER BY ordinal_position;

-- Expected output should include:
-- user_id_hash | text
-- language | character varying (VARCHAR)
-- response_type | character varying (VARCHAR)
-- voice_enabled | boolean
-- voice_selected | character varying (VARCHAR)
-- created_at | timestamp without time zone
-- updated_at | timestamp without time zone


-- ============================================================
-- CONFIRMATION: The language column is already present
-- ============================================================
-- Based on the existing migration file: add_voice_preferences.sql
-- The column was created with:
-- ALTER TABLE user_preferences 
-- ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en-US';

-- The user_preferences table structure already supports:
-- - language: VARCHAR(10) with default 'en-US'
--   Stores: 'en-US', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR', 'ja-JP', 'zh-CN'
-- - voice_selected: VARCHAR(50) - for voice preferences
-- - voice_enabled: BOOLEAN - to toggle voice on/off
-- - response_type: VARCHAR - for 'full' or 'brief' responses


-- ============================================================
-- OPTIONAL: Create indexes if not already present (for optimization)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_user_preferences_language 
ON user_preferences(language);

CREATE INDEX IF NOT EXISTS idx_user_preferences_voice 
ON user_preferences(voice_selected);


-- ============================================================
-- OPTIONAL: Check existing data in user_preferences
-- ============================================================
SELECT user_id_hash, language, voice_selected, response_type, voice_enabled
FROM user_preferences
ORDER BY created_at DESC
LIMIT 10;


-- ============================================================
-- OPTIONAL: Verify language values are in allowed list
-- ============================================================
SELECT DISTINCT language, COUNT(*) as count
FROM user_preferences
GROUP BY language
ORDER BY count DESC;

-- Expected: Only values from our 8 supported languages:
-- en-US, es-ES, fr-FR, de-DE, it-IT, pt-BR, ja-JP, zh-CN


-- ============================================================
-- OPTIONAL: Add check constraint for valid languages
-- (Run ONCE only if not already present)
-- ============================================================
-- This ensures only valid languages can be stored:
-- ALTER TABLE user_preferences
-- ADD CONSTRAINT valid_language CHECK (
--   language IN ('en-US', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR', 'ja-JP', 'zh-CN')
-- );

-- ============================================================
-- SUMMARY FOR IMPLEMENTATION
-- ============================================================
-- ✅ NO DATABASE CHANGES REQUIRED
-- 
-- The database already has:
-- - user_preferences table with 'language' column
-- - Default value of 'en-US'
-- - Data type: VARCHAR(10)
-- - Indexed for performance
--
-- The application will:
-- 1. Fetch user's saved language from DB when they log in
-- 2. Store language selection in localStorage for offline access
-- 3. Sync changes back to DB when language changes
-- 4. Fall back to browser language detection if no saved preference
--
-- API Endpoint already in place:
-- POST /api/user-profile/:userId/preferences
-- Accepts: { language: 'es-ES', response_type: 'full', voice_enabled: true, voice_selected: 'sophia' }
-- ============================================================
