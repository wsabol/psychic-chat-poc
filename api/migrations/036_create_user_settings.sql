-- ============================================
-- USER SETTINGS TABLE
-- Date: January 2025
-- Description: Store privacy and communication preferences
-- Security: Uses user_id_hash for lookups, non-sensitive data
-- ============================================

CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    user_id_hash VARCHAR(255) NOT NULL UNIQUE,
    
    -- Privacy & Communication Settings
    cookies_enabled BOOLEAN DEFAULT TRUE,
    analytics_enabled BOOLEAN DEFAULT TRUE,
    email_marketing_enabled BOOLEAN DEFAULT TRUE,
    push_notifications_enabled BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified_at TIMESTAMP
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id_hash ON user_settings(user_id_hash);

-- Add trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_user_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_settings_update_timestamp ON user_settings;
CREATE TRIGGER user_settings_update_timestamp
BEFORE UPDATE ON user_settings
FOR EACH ROW
EXECUTE FUNCTION update_user_settings_timestamp();

-- No foreign key constraint needed since we only store hashed user IDs
-- Deletion handled via application logic in user-data.js
