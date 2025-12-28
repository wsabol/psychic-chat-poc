-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===== messages table - NO PLAINTEXT CONTENT =====
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    role VARCHAR(50),
    content_encrypted BYTEA,
    user_id_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_user_id_hash ON messages(user_id_hash);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);


-- ===== user_personal_info table - NO PLAINTEXT EMAIL - WITH ONBOARDING TRACKING =====
CREATE TABLE IF NOT EXISTS user_personal_info (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    email_hash VARCHAR(64) UNIQUE,
    password_hash VARCHAR(255),
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
    -- Onboarding tracking
    onboarding_step VARCHAR(100),
    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarding_started_at TIMESTAMP,
    onboarding_completed_at TIMESTAMP,
    -- Encrypted personal info
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
    stripe_subscription_id_encrypted BYTEA
);

CREATE INDEX IF NOT EXISTS idx_user_email_hash ON user_personal_info(email_hash);

-- ===== user_astrology table - NO PLAINTEXT user_id =====
CREATE TABLE IF NOT EXISTS user_astrology (
    id SERIAL PRIMARY KEY,
    user_id_hash VARCHAR(255) UNIQUE,
    zodiac_sign VARCHAR(50),
    astrology_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_astrology_user_id_hash ON user_astrology(user_id_hash);

-- ===== user_2fa_settings - user_id_hash only =====
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

CREATE INDEX IF NOT EXISTS idx_user_2fa_settings_hash ON user_2fa_settings(user_id_hash);

-- ===== user_2fa_codes - user_id_hash only =====
CREATE TABLE IF NOT EXISTS user_2fa_codes (
    id SERIAL PRIMARY KEY,
    user_id_hash VARCHAR(255) NOT NULL,
    code VARCHAR(10) NOT NULL,
    code_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    used BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_user_2fa_codes_hash ON user_2fa_codes(user_id_hash);

-- ===== audit_log - with user_id_hash and encrypted IP =====
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

CREATE INDEX IF NOT EXISTS idx_audit_user_id_hash ON audit_log(user_id_hash);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(created_at);

-- ===== pending_migrations - with encrypted email and temp_user_id_hash =====
CREATE TABLE IF NOT EXISTS pending_migrations (
    id SERIAL PRIMARY KEY,
    temp_user_id VARCHAR(50),
    temp_user_id_hash VARCHAR(255) UNIQUE,
    email_encrypted BYTEA,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    migrated BOOLEAN DEFAULT false,
    migrated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pending_migrations_temp_hash ON pending_migrations(temp_user_id_hash);

-- ===== security - user_id_hash only =====
CREATE TABLE IF NOT EXISTS security (
  id SERIAL PRIMARY KEY,
  user_id_hash VARCHAR(255) UNIQUE NOT NULL,
  phone_number_encrypted BYTEA,
  recovery_phone_encrypted BYTEA,
  recovery_email_encrypted BYTEA,
  phone_verified BOOLEAN DEFAULT FALSE,
  recovery_phone_verified BOOLEAN DEFAULT FALSE,
  recovery_email_verified BOOLEAN DEFAULT FALSE,
  password_changed_at TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_security_user_id_hash ON security(user_id_hash);

-- ===== security_sessions - with user_id_hash and encrypted fields =====
CREATE TABLE IF NOT EXISTS security_sessions (
id SERIAL PRIMARY KEY,
user_id_hash VARCHAR(255) UNIQUE,
firebase_token_encrypted BYTEA,
firebase_token_hash VARCHAR(255),
device_name_encrypted BYTEA,
ip_address_encrypted BYTEA,
user_agent_encrypted BYTEA,
last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_security_sessions_user_id_hash ON security_sessions(user_id_hash);
CREATE INDEX IF NOT EXISTS idx_security_sessions_token_hash ON security_sessions(firebase_token_hash);

-- ===== verification_codes - with user_id_hash and encrypted fields =====
CREATE TABLE IF NOT EXISTS verification_codes (
  id SERIAL PRIMARY KEY,
  user_id_hash VARCHAR(255),
  phone_number_encrypted BYTEA,
  email_encrypted BYTEA,
  code VARCHAR(6) NOT NULL,
  code_type VARCHAR(10) NOT NULL DEFAULT 'sms',
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  expires_at TIMESTAMP NOT NULL,
  verified_at TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_verification_user_id_hash ON verification_codes(user_id_hash);
CREATE INDEX IF NOT EXISTS idx_verification_code ON verification_codes(code);

-- ===== user_violations - user_id_hash only =====
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

-- ===== user_account_lockouts - with user_id_hash =====
CREATE TABLE IF NOT EXISTS user_account_lockouts (
    id SERIAL PRIMARY KEY,
    user_id_hash VARCHAR(255),
    reason VARCHAR(100),
    ip_addresses_encrypted BYTEA,
    lock_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_account_lockouts_hash ON user_account_lockouts(user_id_hash);

-- ===== user_consents - user_id_hash only, encrypted ip and user_agent =====
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
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_consents_hash ON user_consents(user_id_hash);

-- ===== user_login_attempts - with user_id_hash =====
CREATE TABLE IF NOT EXISTS user_login_attempts (
    id SERIAL PRIMARY KEY,
    user_id_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_login_attempts_hash ON user_login_attempts(user_id_hash);

-- ===== login_attempts - with user_id_hash and encrypted fields =====
CREATE TABLE IF NOT EXISTS login_attempts (
    id SERIAL PRIMARY KEY,
    user_id_hash VARCHAR(255),
    attempt_type VARCHAR(50),
    email_attempted_encrypted BYTEA,
    ip_address_encrypted BYTEA,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_hash ON login_attempts(user_id_hash);

-- ===== user_sessions - user_id_hash only, encrypted ip_address and user_agent =====
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

CREATE INDEX IF NOT EXISTS idx_user_sessions_hash ON user_sessions(user_id_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(session_token_hash);

-- ===== account_deletion_audit - with user_id_hash and encrypted IP =====
CREATE TABLE IF NOT EXISTS account_deletion_audit (
    id SERIAL PRIMARY KEY,
    user_id_hash VARCHAR(255),
    deletion_reason TEXT,
    ip_address_encrypted BYTEA,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_account_deletion_audit_hash ON account_deletion_audit(user_id_hash);

-- user_astrology_enriched NOT USED - REMOVED

-- ===== user_preferences - Language, response type, voice settings =====
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id_hash VARCHAR(255) NOT NULL UNIQUE,
    language VARCHAR(10) DEFAULT 'en-US',
    response_type VARCHAR(20) DEFAULT 'full',
    voice_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id_hash ON user_preferences(user_id_hash);
