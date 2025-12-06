-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    role VARCHAR(50),
    content TEXT,
    content_encrypted BYTEA,
    user_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_personal_info (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    email_hash VARCHAR(64) UNIQUE,
    password_hash VARCHAR(255),
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMP,
    birth_country VARCHAR(100),
    birth_province VARCHAR(100),
    birth_city VARCHAR(100),
    birth_date DATE,
    birth_time TIME,
    birth_timezone VARCHAR(100),
    sex VARCHAR(50),
    address_preference VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='user_personal_info' AND column_name='email_encrypted'
    ) THEN
        ALTER TABLE user_personal_info ADD COLUMN email_encrypted BYTEA;
        ALTER TABLE user_personal_info ADD COLUMN first_name_encrypted BYTEA;
        ALTER TABLE user_personal_info ADD COLUMN last_name_encrypted BYTEA;
        ALTER TABLE user_personal_info ADD COLUMN birth_date_encrypted BYTEA;
        ALTER TABLE user_personal_info ADD COLUMN birth_city_encrypted BYTEA;
        ALTER TABLE user_personal_info ADD COLUMN birth_timezone_encrypted BYTEA;
        ALTER TABLE user_personal_info ADD COLUMN birth_country_encrypted BYTEA;
        ALTER TABLE user_personal_info ADD COLUMN birth_province_encrypted BYTEA;
    END IF;
END $$;

CREATE OR REPLACE FUNCTION decrypt_email(encrypted BYTEA)
RETURNS VARCHAR AS $$
BEGIN
    IF encrypted IS NULL THEN RETURN NULL; END IF;
    RETURN pgp_sym_decrypt(encrypted, 'default_key');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION decrypt_text(encrypted BYTEA)
RETURNS VARCHAR AS $$
BEGIN
    IF encrypted IS NULL THEN RETURN NULL; END IF;
    RETURN pgp_sym_decrypt(encrypted, 'default_key');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION decrypt_birth_date(encrypted BYTEA)
RETURNS DATE AS $$
BEGIN
    IF encrypted IS NULL THEN RETURN NULL; END IF;
    RETURN CAST(pgp_sym_decrypt(encrypted, 'default_key') AS DATE);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE TABLE IF NOT EXISTS user_astrology (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    zodiac_sign VARCHAR(50),
    astrology_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_2fa_settings (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    enabled BOOLEAN DEFAULT true,
    phone_number VARCHAR(20),
    backup_phone_number VARCHAR(20),
    method VARCHAR(20) DEFAULT 'sms',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_2fa_codes (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    code VARCHAR(10) NOT NULL,
    code_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    used BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50),
    action VARCHAR(100),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_user_email_hash ON user_personal_info(email_hash);

-- Pending migrations table - stores temp user ID with email for later retrieval
CREATE TABLE IF NOT EXISTS pending_migrations (
    id SERIAL PRIMARY KEY,
    temp_user_id VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    migrated BOOLEAN DEFAULT false,
    migrated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pending_migrations_email ON pending_migrations(email);
CREATE INDEX IF NOT EXISTS idx_pending_migrations_temp_id ON pending_migrations(temp_user_id);

-- Security tables for managing user security settings
CREATE TABLE IF NOT EXISTS security (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL UNIQUE,
  phone_number VARCHAR(255),
  recovery_phone VARCHAR(255),
  recovery_email VARCHAR(255),
  phone_verified BOOLEAN DEFAULT FALSE,
  recovery_phone_verified BOOLEAN DEFAULT FALSE,
  recovery_email_verified BOOLEAN DEFAULT FALSE,
  password_changed_at TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_personal_info(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_security_user_id ON security(user_id);

-- Security sessions for device tracking
CREATE TABLE IF NOT EXISTS security_sessions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  firebase_token VARCHAR(1024) NOT NULL,
  device_name VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_personal_info(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_security_sessions_user_id ON security_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_security_sessions_token ON security_sessions(firebase_token);

-- Verification codes for phone and email verification
CREATE TABLE IF NOT EXISTS verification_codes (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  phone_number VARCHAR(255),
  email VARCHAR(255),
  code VARCHAR(6) NOT NULL,
  code_type VARCHAR(10) NOT NULL DEFAULT 'sms',
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  expires_at TIMESTAMP NOT NULL,
  verified_at TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_personal_info(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_verification_user_id ON verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_code ON verification_codes(code);
CREATE INDEX IF NOT EXISTS idx_verification_expires ON verification_codes(expires_at);
