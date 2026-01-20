-- Master SQL file for restoring database schema
-- Last Updated: 2025-01-19
-- This file contains the EXACT schema of the current production database
-- plus all required tables and columns for subscription billing
-- 
-- PHASE 2.0: Stripe Subscriptions Billing
-- Includes: subscription tracking, payment methods, last status check times
-- 
-- PHASE 3.0: Free Trial Sessions
-- Includes: IP-based free trial tracking, fraud prevention, progress tracking

-- IMPORTANT: All user IDs are hashed using SHA-256
-- IMPORTANT: All sensitive data (PII, tokens, IPs) are encrypted with pgcrypto
-- IMPORTANT: Encryption key must match ENCRYPTION_KEY environment variable

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- TABLE: user_personal_info
CREATE TABLE IF NOT EXISTS user_personal_info (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    email_hash VARCHAR(64) UNIQUE,
    password_hash VARCHAR(255),
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_admin BOOLEAN DEFAULT FALSE,
    is_suspended BOOLEAN DEFAULT FALSE,
    suspension_end_date TIMESTAMP,
    deletion_requested_at TIMESTAMP,
    deletion_status VARCHAR(50),
    anonymization_date TIMESTAMP,
    final_deletion_date TIMESTAMP,
    deletion_reason VARCHAR(255),
    subscription_status VARCHAR(50),
    current_period_start INTEGER,
    current_period_end INTEGER,
    plan_name VARCHAR(100),
    price_amount INTEGER,
    price_interval VARCHAR(20),
    onboarding_step VARCHAR(100),
    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarding_started_at TIMESTAMP,
    onboarding_completed_at TIMESTAMP,
    first_name_encrypted BYTEA,
    last_name_encrypted BYTEA,
    birth_date_encrypted BYTEA,
    birth_time_encrypted BYTEA,
    birth_city_encrypted BYTEA,
    birth_province_encrypted BYTEA,
    birth_country_encrypted BYTEA,
    birth_timezone_encrypted BYTEA,
    sex_encrypted BYTEA,
    familiar_name_encrypted BYTEA,
    phone_number_encrypted BYTEA,
    email_encrypted BYTEA,
        stripe_customer_id_encrypted BYTEA,
    stripe_subscription_id_encrypted BYTEA,
    last_status_check_at TIMESTAMP,
    subscription_cancelled_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_personal_info_email_hash ON user_personal_info(email_hash);
CREATE INDEX IF NOT EXISTS idx_subscription_status ON user_personal_info(subscription_status);
CREATE INDEX IF NOT EXISTS idx_current_period_end ON user_personal_info(current_period_end);
CREATE INDEX IF NOT EXISTS idx_subscription_cancelled_at ON user_personal_info(subscription_cancelled_at);
CREATE INDEX IF NOT EXISTS idx_last_status_check_at ON user_personal_info(last_status_check_at);

-- TABLE: user_astrology
CREATE TABLE IF NOT EXISTS user_astrology (
    id SERIAL PRIMARY KEY,
    user_id_hash VARCHAR(255) UNIQUE,
    zodiac_sign VARCHAR(50),
    astrology_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_astrology_user_id_hash ON user_astrology(user_id_hash);

-- TABLE: user_2fa_settings
CREATE TABLE IF NOT EXISTS user_2fa_settings (
    id SERIAL PRIMARY KEY,
    user_id_hash VARCHAR(255) UNIQUE NOT NULL,
    enabled BOOLEAN DEFAULT true,
    phone_number_encrypted BYTEA,
    backup_phone_number_encrypted BYTEA,
    method VARCHAR(20) DEFAULT 'sms',
    persistent_session BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_2fa_settings_user_id_hash ON user_2fa_settings(user_id_hash);

-- TABLE: user_2fa_codes
CREATE TABLE IF NOT EXISTS user_2fa_codes (
    id SERIAL PRIMARY KEY,
    user_id_hash VARCHAR(255) NOT NULL,
    code VARCHAR(10) NOT NULL,
    code_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    used BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_user_2fa_codes_user_id_hash ON user_2fa_codes(user_id_hash);

-- TABLE: audit_log
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    user_id_hash VARCHAR(255),
    action VARCHAR(100),
    details JSONB,
    ip_address_encrypted BYTEA,
    email_encrypted BYTEA,
    user_agent_encrypted BYTEA,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id_hash ON audit_log(user_id_hash);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- TABLE: pending_migrations
CREATE TABLE IF NOT EXISTS pending_migrations (
    id SERIAL PRIMARY KEY,
    temp_user_id VARCHAR(50),
    temp_user_id_hash VARCHAR(255) UNIQUE,
    email_encrypted BYTEA,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    migrated BOOLEAN DEFAULT false,
    migrated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pending_migrations_temp_user_id_hash ON pending_migrations(temp_user_id_hash);

-- TABLE: security
CREATE TABLE IF NOT EXISTS security (
    id SERIAL PRIMARY KEY,
    user_id_hash VARCHAR(255) UNIQUE NOT NULL,
    phone_number_encrypted BYTEA,
    recovery_phone_encrypted BYTEA,
    recovery_email_encrypted BYTEA,
    phone_verified BOOLEAN DEFAULT FALSE,
    recovery_phone_verified BOOLEAN DEFAULT FALSE,
    recovery_email_verified BOOLEAN DEFAULT FALSE,
    password_changed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_security_user_id_hash ON security(user_id_hash);

-- TABLE: security_sessions (WITH DEVICE TRUST COLUMNS)
CREATE TABLE IF NOT EXISTS security_sessions (
    id SERIAL PRIMARY KEY,
    user_id_hash VARCHAR(255) UNIQUE,
    firebase_token_encrypted BYTEA,
    firebase_token_hash VARCHAR(255),
    device_name_encrypted BYTEA,
    ip_address_encrypted BYTEA,
    user_agent_encrypted BYTEA,
    is_trusted BOOLEAN DEFAULT false,
    trust_expiry TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_security_sessions_user_id_hash ON security_sessions(user_id_hash);
CREATE INDEX IF NOT EXISTS idx_security_sessions_firebase_token_hash ON security_sessions(firebase_token_hash);

-- TABLE: verification_codes
CREATE TABLE IF NOT EXISTS verification_codes (
    id SERIAL PRIMARY KEY,
    user_id_hash VARCHAR(255),
    phone_number_encrypted BYTEA,
    email_encrypted BYTEA,
    code VARCHAR(6) NOT NULL,
    code_type VARCHAR(10) DEFAULT 'sms',
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_verification_codes_user_id_hash ON verification_codes(user_id_hash);
CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON verification_codes(code);

-- TABLE: user_violations
CREATE TABLE IF NOT EXISTS user_violations (
    id SERIAL PRIMARY KEY,
    user_id_hash VARCHAR(255) NOT NULL,
    violation_type VARCHAR(50) NOT NULL,
    violation_count INT DEFAULT 1,
    violation_message TEXT,
    severity VARCHAR(20) DEFAULT 'warning',
    is_active BOOLEAN DEFAULT true,
    is_account_disabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_violations_user_id_hash ON user_violations(user_id_hash);

-- TABLE: user_account_lockouts
CREATE TABLE IF NOT EXISTS user_account_lockouts (
    id SERIAL PRIMARY KEY,
    user_id_hash VARCHAR(255),
    reason VARCHAR(100),
    ip_addresses_encrypted BYTEA,
    lock_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_account_lockouts_user_id_hash ON user_account_lockouts(user_id_hash);

-- TABLE: user_consents
CREATE TABLE IF NOT EXISTS user_consents (
    id SERIAL PRIMARY KEY,
    user_id_hash VARCHAR(255) UNIQUE NOT NULL,
    terms_version VARCHAR(50),
    terms_accepted BOOLEAN DEFAULT FALSE,
    terms_accepted_at TIMESTAMP,
    privacy_version VARCHAR(50),
    privacy_accepted BOOLEAN DEFAULT FALSE,
    privacy_accepted_at TIMESTAMP,
    consent_astrology BOOLEAN DEFAULT FALSE,
    consent_chat_analysis BOOLEAN DEFAULT FALSE,
    consent_health_wellness BOOLEAN DEFAULT FALSE,
    agreed_from_ip_encrypted BYTEA,
    user_agent_encrypted BYTEA,
    requires_consent_update BOOLEAN DEFAULT FALSE,
    last_notified_at TIMESTAMP,
    notification_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_consents_user_id_hash ON user_consents(user_id_hash);

-- TABLE: user_login_attempts
CREATE TABLE IF NOT EXISTS user_login_attempts (
    id SERIAL PRIMARY KEY,
    user_id_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_login_attempts_user_id_hash ON user_login_attempts(user_id_hash);

-- TABLE: login_attempts
CREATE TABLE IF NOT EXISTS login_attempts (
    id SERIAL PRIMARY KEY,
    user_id_hash VARCHAR(255),
    attempt_type VARCHAR(50),
    email_attempted_encrypted BYTEA,
    ip_address_encrypted BYTEA,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id_hash ON login_attempts(user_id_hash);

-- TABLE: user_sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id_hash VARCHAR(255),
    session_token_hash VARCHAR(255),
    device_type VARCHAR(50),
    browser_name VARCHAR(100),
    browser_version VARCHAR(50),
    os_name VARCHAR(100),
    os_version VARCHAR(50),
    device_name_encrypted BYTEA,
    ip_address_encrypted BYTEA,
    user_agent_encrypted BYTEA,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP,
    expires_at TIMESTAMP,
    logged_out_at TIMESTAMP,
    status VARCHAR(50),
    is_2fa_verified BOOLEAN DEFAULT false,
    suspicious_activity BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id_hash ON user_sessions(user_id_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token_hash ON user_sessions(session_token_hash);

-- TABLE: account_deletion_audit
CREATE TABLE IF NOT EXISTS account_deletion_audit (
    id SERIAL PRIMARY KEY,
    user_id_hash VARCHAR(255),
    deletion_reason TEXT,
    ip_address_encrypted BYTEA,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_account_deletion_audit_user_id_hash ON account_deletion_audit(user_id_hash);

-- TABLE: user_preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id_hash VARCHAR(255) NOT NULL UNIQUE,
    language VARCHAR(10) DEFAULT 'en-US',
    response_type VARCHAR(20) DEFAULT 'full',
    voice_enabled BOOLEAN DEFAULT TRUE,
    voice_selected VARCHAR(50) DEFAULT 'sophia',
    oracle_language VARCHAR(10) DEFAULT 'en-US',
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id_hash ON user_preferences(user_id_hash);
CREATE INDEX IF NOT EXISTS idx_user_preferences_oracle_language ON user_preferences(oracle_language);
CREATE INDEX IF NOT EXISTS idx_user_preferences_voice ON user_preferences(voice_selected);

-- TABLE: messages
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    role VARCHAR(50),
    user_id_hash VARCHAR(255),
    content_full_encrypted BYTEA,
    content_brief_encrypted BYTEA,
    content_full_lang_encrypted BYTEA,
    content_brief_lang_encrypted BYTEA,
    language_code VARCHAR(10),
    response_type VARCHAR(50),
    content_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at_local_date DATE,
    horoscope_range VARCHAR(50),
    moon_phase VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_messages_user_id_hash ON messages(user_id_hash);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- TABLE: app_analytics
CREATE TABLE IF NOT EXISTS app_analytics (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    page_name VARCHAR(100) NOT NULL,
    event_action VARCHAR(100),
    ip_address_encrypted BYTEA,
    user_agent_encrypted BYTEA,
    browser_name VARCHAR(50),
    browser_version VARCHAR(20),
    os_name VARCHAR(50),
    os_version VARCHAR(20),
    device_type VARCHAR(20),
    session_duration_ms INT,
    error_message_encrypted BYTEA,
    error_stack_encrypted BYTEA,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_app_analytics_event_type ON app_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_app_analytics_page_name ON app_analytics(page_name);
CREATE INDEX IF NOT EXISTS idx_app_analytics_created_at ON app_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_app_analytics_device_type ON app_analytics(device_type);
CREATE INDEX IF NOT EXISTS idx_app_analytics_os_name ON app_analytics(os_name);
CREATE INDEX IF NOT EXISTS idx_app_analytics_browser_name ON app_analytics(browser_name);
CREATE INDEX IF NOT EXISTS idx_app_analytics_event_action ON app_analytics(event_action);

-- TABLE: error_logs (NEW - Centralized error tracking)
CREATE TABLE IF NOT EXISTS error_logs (
    id SERIAL PRIMARY KEY,
    service VARCHAR(50) NOT NULL,
    error_message VARCHAR(500) NOT NULL,
    severity VARCHAR(20) DEFAULT 'error',
    user_id_hash VARCHAR(255),
    context VARCHAR(255),
    error_stack_encrypted BYTEA,
    ip_address_encrypted BYTEA,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolution_notes VARCHAR(1000),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_error_logs_service ON error_logs(service);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id_hash ON error_logs(user_id_hash);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(is_resolved);

CREATE SEQUENCE IF NOT EXISTS error_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE error_logs_id_seq OWNED BY error_logs.id;
ALTER TABLE ONLY error_logs ALTER COLUMN id SET DEFAULT nextval('error_logs_id_seq'::regclass);

CREATE OR REPLACE FUNCTION update_error_logs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_error_logs_timestamp_trigger ON error_logs;
CREATE TRIGGER update_error_logs_timestamp_trigger
BEFORE UPDATE ON error_logs
FOR EACH ROW
EXECUTE FUNCTION update_error_logs_timestamp();

CREATE OR REPLACE VIEW critical_errors_unresolved AS
SELECT id, service, error_message, user_id_hash, context, created_at, severity
FROM error_logs
WHERE severity = 'critical' 
  AND is_resolved = false 
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

CREATE OR REPLACE VIEW error_logs_summary AS
SELECT service, severity, COUNT(*) AS error_count,
       DATE(created_at) AS error_date, COUNT(DISTINCT user_id_hash) AS affected_users
FROM error_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY service, severity, DATE(created_at)
ORDER BY DATE(created_at) DESC, COUNT(*) DESC;

-- TABLE: admin_trusted_ips (Admin IP whitelisting for 2FA)
CREATE TABLE IF NOT EXISTS admin_trusted_ips (
    id SERIAL PRIMARY KEY,
    user_id_hash VARCHAR(255) NOT NULL,
    ip_address_encrypted BYTEA NOT NULL,
    device_name VARCHAR(255),
    browser_info VARCHAR(255),
    is_trusted BOOLEAN DEFAULT TRUE,
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT admin_trusted_ips_unique UNIQUE (user_id_hash, ip_address_encrypted)
);

CREATE INDEX IF NOT EXISTS idx_admin_trusted_ips_user_id_hash ON admin_trusted_ips(user_id_hash);
CREATE INDEX IF NOT EXISTS idx_admin_trusted_ips_is_trusted ON admin_trusted_ips(is_trusted);

-- TABLE: admin_login_attempts (Admin login audit trail)
CREATE TABLE IF NOT EXISTS admin_login_attempts (
    id SERIAL PRIMARY KEY,
    user_id_hash VARCHAR(255),
    ip_address_encrypted BYTEA,
    device_name VARCHAR(255),
    login_status VARCHAR(100),
    alert_sent BOOLEAN DEFAULT FALSE,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_user_id_hash ON admin_login_attempts(user_id_hash);
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_attempted_at ON admin_login_attempts(attempted_at);
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_login_status ON admin_login_attempts(login_status);

-- TABLE: free_trial_sessions (Free trial progress tracking & fraud prevention)
-- IMPORTANT: ip_address_encrypted must be encrypted with ENCRYPTION_KEY
-- IMPORTANT: user_id_hash is SHA-256 hash of temp user ID (one-way, cannot decrypt)
CREATE TABLE IF NOT EXISTS free_trial_sessions (
    id VARCHAR(36) PRIMARY KEY,
    ip_address_encrypted VARCHAR(255) NOT NULL,
    user_id_hash VARCHAR(64) NOT NULL,
    current_step VARCHAR(50),
    is_completed BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_free_trial_sessions_ip_address_encrypted ON free_trial_sessions(ip_address_encrypted);
CREATE INDEX IF NOT EXISTS idx_free_trial_sessions_user_id_hash ON free_trial_sessions(user_id_hash);
CREATE UNIQUE INDEX IF NOT EXISTS idx_free_trial_sessions_unique_ip_user ON free_trial_sessions(ip_address_encrypted, user_id_hash);
CREATE INDEX IF NOT EXISTS idx_free_trial_sessions_ip_completed ON free_trial_sessions(ip_address_encrypted, is_completed);
