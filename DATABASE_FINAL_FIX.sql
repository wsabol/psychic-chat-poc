-- ========================================================================
-- FINAL DATABASE SCHEMA CORRECTIONS
-- ========================================================================
-- Purpose: Add all missing columns identified during debugging
-- This file should be run after init.sql to ensure all columns exist
-- Usage: psql -U postgres -d chatbot -f DATABASE_FINAL_FIX.sql
-- ========================================================================

-- ========================================================================
-- MESSAGES TABLE CORRECTIONS
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

CREATE INDEX IF NOT EXISTS idx_messages_horoscope_range ON messages(horoscope_range);
CREATE INDEX IF NOT EXISTS idx_messages_moon_phase ON messages(moon_phase);
CREATE INDEX IF NOT EXISTS idx_messages_content_type ON messages(content_type);
CREATE INDEX IF NOT EXISTS idx_messages_created_at_local_date ON messages(created_at_local_date);
CREATE INDEX IF NOT EXISTS idx_messages_language_code ON messages(language_code);

-- ========================================================================
-- USER_PREFERENCES TABLE CORRECTIONS
-- ========================================================================
-- Browser-detected timezone (NOT birth timezone)
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';

-- ========================================================================
-- USER_CONSENTS TABLE CORRECTIONS
-- ========================================================================
-- Compliance notification tracking
ALTER TABLE user_consents ADD COLUMN IF NOT EXISTS requires_consent_update BOOLEAN DEFAULT FALSE;
ALTER TABLE user_consents ADD COLUMN IF NOT EXISTS last_notified_at TIMESTAMP;
ALTER TABLE user_consents ADD COLUMN IF NOT EXISTS notification_count INTEGER DEFAULT 0;

-- ========================================================================
-- VERIFICATION
-- ========================================================================
-- Show final table structures
\echo '===== MESSAGES TABLE ====='
\d messages

\echo '===== USER_PREFERENCES TABLE ====='
\d user_preferences

\echo '===== USER_CONSENTS TABLE ====='
\d user_consents

-- ========================================================================
-- SUMMARY
-- ========================================================================
\echo 'All missing columns have been added successfully'
\echo 'Database schema is now complete and ready for use'
-- ========================================================================
