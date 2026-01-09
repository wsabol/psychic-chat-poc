-- ============================================
-- APP_ANALYTICS TABLE - FIX
-- Date: January 2025
-- Description: Track anonymous app usage events
-- ============================================

-- Create the app_analytics table if it doesn't exist
CREATE TABLE IF NOT EXISTS app_analytics (
    id SERIAL PRIMARY KEY,
    
    -- Event Information
    event_type VARCHAR(50) NOT NULL,        -- page_view, click, error, session_end, etc.
    page_name VARCHAR(100) NOT NULL,        -- which page (chat, horoscope, settings, etc.)
    event_action VARCHAR(100),              -- what action (clicked_chat, viewed_horoscope, etc.)
    
    -- Device/Browser Information (ENCRYPTED)
    ip_address_encrypted BYTEA,             -- ENCRYPTED - for geographic data
    user_agent_encrypted BYTEA,             -- ENCRYPTED - browser/OS info
    
    -- Browser/Device Details (Not sensitive, not encrypted)
    browser_name VARCHAR(50),               -- extracted, not sensitive
    browser_version VARCHAR(20),            -- extracted, not sensitive
    os_name VARCHAR(50),                    -- extracted, not sensitive
    os_version VARCHAR(20),                 -- extracted, not sensitive
    device_type VARCHAR(20),                -- mobile, tablet, desktop (not sensitive)
    
    -- Session Information
    session_duration_ms INT,                -- milliseconds spent
    error_message_encrypted BYTEA,          -- ENCRYPTED - may contain sensitive info
    error_stack_encrypted BYTEA,            -- ENCRYPTED - stack trace may contain paths/info
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for fast queries (on non-encrypted fields only)
CREATE INDEX IF NOT EXISTS idx_app_analytics_event_type ON app_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_app_analytics_page_name ON app_analytics(page_name);
CREATE INDEX IF NOT EXISTS idx_app_analytics_created_at ON app_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_app_analytics_device_type ON app_analytics(device_type);
CREATE INDEX IF NOT EXISTS idx_app_analytics_os_name ON app_analytics(os_name);
CREATE INDEX IF NOT EXISTS idx_app_analytics_browser_name ON app_analytics(browser_name);
CREATE INDEX IF NOT EXISTS idx_app_analytics_event_action ON app_analytics(event_action);

-- Confirm creation
\dt app_analytics
