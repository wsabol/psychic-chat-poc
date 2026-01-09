-- ========================================================================
-- DATABASE SCHEMA CORRECTIONS
-- ========================================================================
-- Purpose: Add missing columns to existing tables
-- Missing columns identified from worker and API code:
-- 1. messages: content_full_lang_encrypted, content_brief_lang_encrypted, language_code, 
--             response_type, horoscope_range, moon_phase, content_type, created_at_local_date
-- 2. user_personal_info: timezone (for browser-detected local timezone)
-- 3. user_preferences: (no timezone column - keep timezone in user_personal_info)
-- Usage: psql -U postgres -d chatbot -f FIX_DATABASE_SCHEMA.sql
-- ========================================================================

-- ========================================================================
-- ADD MISSING COLUMNS TO messages TABLE
-- ========================================================================
ALTER TABLE messages ADD COLUMN IF NOT EXISTS content_full_encrypted BYTEA;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS content_brief_encrypted BYTEA;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS content_full_lang_encrypted BYTEA;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS content_brief_lang_encrypted BYTEA;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS language_code VARCHAR(10);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS response_type VARCHAR(20) DEFAULT 'full';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS horoscope_range VARCHAR(20);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS moon_phase VARCHAR(50);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS content_type VARCHAR(100);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS created_at_local_date DATE;

-- Add indexes for messages table
CREATE INDEX IF NOT EXISTS idx_messages_horoscope_range ON messages(horoscope_range);
CREATE INDEX IF NOT EXISTS idx_messages_moon_phase ON messages(moon_phase);
CREATE INDEX IF NOT EXISTS idx_messages_content_type ON messages(content_type);
CREATE INDEX IF NOT EXISTS idx_messages_created_at_local_date ON messages(created_at_local_date);
CREATE INDEX IF NOT EXISTS idx_messages_language_code ON messages(language_code);

-- ========================================================================
-- ADD MISSING COLUMNS TO user_personal_info TABLE
-- ========================================================================
-- Browser-detected timezone (NOT birth timezone - that causes day-off issues)
-- Set on login when browser timezone is captured
-- Used by horoscope/moon-phase/cosmic-weather to determine local date
ALTER TABLE user_personal_info ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';

-- ========================================================================
-- VERIFY SCHEMA
-- ========================================================================
-- Display messages table structure
\d messages

-- Display user_personal_info timezone column
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_personal_info' AND column_name = 'timezone';

-- Display user_preferences structure to confirm no timezone there
\d user_preferences

-- ========================================================================
-- END OF SCHEMA CORRECTIONS
-- ========================================================================
-- All missing columns have been added
-- messages table now has 13+ columns for storing horoscopes, moon phases, cosmic weather
-- user_personal_info now has timezone for browser-detected local timezone
-- ========================================================================
