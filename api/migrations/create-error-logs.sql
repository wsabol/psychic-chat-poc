-- ============================================
-- CREATE error_logs TABLE FOR CENTRALIZED ERROR TRACKING
-- Date: January 2025
-- Purpose: Production error logging with encryption and admin dashboard
-- ============================================

-- Create error_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.error_logs (
    id SERIAL PRIMARY KEY,
    service VARCHAR(50) NOT NULL,                    -- 'auth', 'chat', 'horoscope', 'cosmic-weather', etc.
    error_message VARCHAR(500) NOT NULL,             -- Safe error message (no internal details)
    severity VARCHAR(20) DEFAULT 'error',            -- 'error', 'warning', 'critical'
    user_id_hash VARCHAR(255),                       -- Hashed user ID (optional, for user-specific errors)
    context VARCHAR(255),                            -- What was happening? 'login attempt', 'horoscope generation'
    error_stack_encrypted BYTEA,                     -- Full stack trace (encrypted with ENCRYPTION_KEY)
    ip_address_encrypted BYTEA,                      -- User IP address (encrypted)
    is_resolved BOOLEAN DEFAULT FALSE,               -- For admin dashboard to mark as resolved
    resolution_notes VARCHAR(1000),                  -- Admin notes on resolution
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_error_logs_service ON public.error_logs(service);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON public.error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id_hash ON public.error_logs(user_id_hash);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON public.error_logs(is_resolved);

-- Create sequence for id if not exists
CREATE SEQUENCE IF NOT EXISTS public.error_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.error_logs_id_seq OWNED BY public.error_logs.id;
ALTER TABLE ONLY public.error_logs ALTER COLUMN id SET DEFAULT nextval('public.error_logs_id_seq'::regclass);

-- Create trigger function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_error_logs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_error_logs_timestamp_trigger ON public.error_logs;
CREATE TRIGGER update_error_logs_timestamp_trigger
BEFORE UPDATE ON public.error_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_error_logs_timestamp();

-- ============================================
-- CREATE VIEWS FOR ADMIN DASHBOARD
-- ============================================

-- View 1: Critical unresolved errors in last 24 hours
DROP VIEW IF EXISTS public.critical_errors_unresolved CASCADE;
CREATE VIEW public.critical_errors_unresolved AS
SELECT 
    id,
    service,
    error_message,
    user_id_hash,
    context,
    created_at,
    severity
FROM public.error_logs
WHERE severity = 'critical' 
  AND is_resolved = false 
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- View 2: Error summary for dashboard
DROP VIEW IF EXISTS public.error_logs_summary CASCADE;
CREATE VIEW public.error_logs_summary AS
SELECT 
    service,
    severity,
    COUNT(*) AS error_count,
    DATE(created_at) AS error_date,
    COUNT(DISTINCT user_id_hash) AS affected_users
FROM public.error_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY service, severity, DATE(created_at)
ORDER BY DATE(created_at) DESC, COUNT(*) DESC;

-- ============================================
-- ADD PERMISSIONS FOR ERROR LOGGING
-- ============================================
-- Ensure your app user has permissions (run as superuser):
-- GRANT INSERT, UPDATE ON public.error_logs TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE public.error_logs_id_seq TO your_app_user;

-- ============================================
-- ADD oracle_language TO user_preferences IF MISSING
-- ============================================
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS oracle_language VARCHAR(10) DEFAULT 'en-US',
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';

-- Create index for timezone queries
CREATE INDEX IF NOT EXISTS idx_user_preferences_timezone ON public.user_preferences(timezone);
