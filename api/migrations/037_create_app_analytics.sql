-- ============================================
-- APP ANALYTICS TABLE
-- Date: January 2025
-- Description: Track anonymous app usage events
-- Security: NO user_id stored (truly anonymous)
--           IP address ENCRYPTED for geographic data
--           User agent ENCRYPTED for device info
-- Privacy: 90-day auto-cleanup
-- ============================================

CREATE TABLE IF NOT EXISTS app_analytics (
    id SERIAL PRIMARY KEY,
    
    -- Event Information
    event_type VARCHAR(50) NOT NULL,      -- page_view, click, error, session_end, etc.
    event_action VARCHAR(100),             -- what action (clicked_chat, viewed_horoscope, etc.)
    page_name VARCHAR(100),                -- which page (chat, horoscope, settings, etc.)
    
    -- Device/Browser Information (ENCRYPTED)
    ip_address_encrypted BYTEA,            -- ENCRYPTED - for geographic data
    user_agent_encrypted BYTEA,            -- ENCRYPTED - browser/OS info
    age_encrypted BYTEA,                   -- ENCRYPTED - user age calculated from birthdate
    browser_name VARCHAR(50),              -- extracted, not sensitive
    browser_version VARCHAR(20),           -- extracted, not sensitive
    os_name VARCHAR(50),                   -- extracted, not sensitive
    os_version VARCHAR(20),                -- extracted, not sensitive
    device_type VARCHAR(20),               -- mobile, tablet, desktop (not sensitive)
    
    -- Session Information
    session_duration_ms INT,               -- milliseconds spent
    error_message_encrypted BYTEA,         -- ENCRYPTED - may contain sensitive info
    error_stack_encrypted BYTEA,           -- ENCRYPTED - stack trace may contain paths/info
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for fast queries (on non-encrypted fields only)
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON app_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_page ON app_analytics(page_name);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON app_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_device_type ON app_analytics(device_type);
CREATE INDEX IF NOT EXISTS idx_analytics_os ON app_analytics(os_name);
CREATE INDEX IF NOT EXISTS idx_analytics_browser ON app_analytics(browser_name);

-- Auto-cleanup: Delete events older than 90 days
-- Can be called via scheduled job or HTTP endpoint
CREATE OR REPLACE FUNCTION delete_old_analytics()
RETURNS void AS $$
BEGIN
    DELETE FROM app_analytics 
    WHERE created_at < NOW() - INTERVAL '90 days';
    RAISE NOTICE 'Deleted old analytics records older than 90 days';
END;
$$ LANGUAGE plpgsql;

-- View for daily active users by location (decrypts IP and age for geographic/demographic analysis)
CREATE OR REPLACE VIEW analytics_daily_active_by_location AS
SELECT 
    DATE(created_at) as date,
    pgp_sym_decrypt(ip_address_encrypted, current_setting('app.encryption_key')) as ip_address,
    pgp_sym_decrypt(age_encrypted, current_setting('app.encryption_key'))::INTEGER as age,
    os_name,
    device_type,
    COUNT(*) as event_count
FROM app_analytics
WHERE created_at >= NOW() - INTERVAL '90 days'
  AND ip_address_encrypted IS NOT NULL
GROUP BY DATE(created_at), ip_address_encrypted, age_encrypted, os_name, device_type;

-- View for feature usage (no decryption needed)
CREATE OR REPLACE VIEW analytics_feature_usage AS
SELECT 
    page_name,
    event_action,
    event_type,
    COUNT(*) as usage_count,
    DATE(created_at) as date
FROM app_analytics
WHERE event_type IN ('page_view', 'click')
  AND created_at >= NOW() - INTERVAL '90 days'
GROUP BY page_name, event_action, event_type, DATE(created_at)
ORDER BY usage_count DESC;

-- View for error tracking (decrypts error messages)
CREATE OR REPLACE VIEW analytics_errors AS
SELECT 
    pgp_sym_decrypt(error_message_encrypted, current_setting('app.encryption_key'))::text as error_message,
    COUNT(*) as error_count,
    page_name,
    browser_name,
    os_name,
    device_type,
    DATE(created_at) as date
FROM app_analytics
WHERE event_type = 'error'
  AND error_message_encrypted IS NOT NULL
  AND created_at >= NOW() - INTERVAL '90 days'
GROUP BY error_message_encrypted, page_name, browser_name, os_name, device_type, DATE(created_at)
ORDER BY error_count DESC;

-- View for drop-off analysis (session duration)
CREATE OR REPLACE VIEW analytics_dropoff AS
SELECT 
    page_name,
    event_type,
    COUNT(*) as event_count,
    AVG(session_duration_ms) as avg_session_duration_ms,
    MIN(session_duration_ms) as min_session_duration_ms,
    MAX(session_duration_ms) as max_session_duration_ms,
    DATE(created_at) as date
FROM app_analytics
WHERE created_at >= NOW() - INTERVAL '90 days'
  AND session_duration_ms IS NOT NULL
GROUP BY page_name, event_type, DATE(created_at)
ORDER BY event_count DESC;
