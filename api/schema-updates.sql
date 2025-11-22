-- Schema updates for password authentication and 2FA

-- Add new columns to user_personal_info table
ALTER TABLE user_personal_info
ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE NOT NULL,
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create table for 2FA settings
CREATE TABLE IF NOT EXISTS user_2fa_settings (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL UNIQUE,
    enabled BOOLEAN DEFAULT TRUE,
    phone_number VARCHAR(20),
    backup_phone_number VARCHAR(20),
    method VARCHAR(20) DEFAULT 'sms', -- 'sms' or 'email'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user_personal_info(user_id) ON DELETE CASCADE
);

-- Create table for temporary 2FA codes
CREATE TABLE IF NOT EXISTS user_2fa_codes (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    code VARCHAR(6) NOT NULL,
    code_type VARCHAR(20), -- 'login' or 'password_reset'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    used BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES user_personal_info(user_id) ON DELETE CASCADE
);

-- Create table for temporary password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    used BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES user_personal_info(user_id) ON DELETE CASCADE
);

-- Create table for audit logging (compliance requirement)
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50),
    action VARCHAR(100), -- 'LOGIN', 'REGISTER', 'PASSWORD_RESET', 'EMAIL_VERIFIED', '2FA_ENABLED', etc.
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_2fa_settings_user_id ON user_2fa_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_2fa_codes_user_id ON user_2fa_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_2fa_codes_expires ON user_2fa_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);

-- Add encryption for chat messages
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS content_encrypted BYTEA;

-- Create trigger function to auto-encrypt messages on insert/update
CREATE OR REPLACE FUNCTION encrypt_message_content()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.content IS NOT NULL AND NEW.content_encrypted IS NULL THEN
    NEW.content_encrypted := pgp_sym_encrypt(NEW.content::text, 'ENCRYPTION_KEY');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS trigger_encrypt_message ON messages;

-- Create new trigger for encryption
CREATE TRIGGER trigger_encrypt_message
BEFORE INSERT OR UPDATE ON messages
FOR EACH ROW
EXECUTE FUNCTION encrypt_message_content();

-- Create index on encrypted messages for faster lookups
CREATE INDEX IF NOT EXISTS idx_messages_user_encrypted ON messages(user_id, created_at) WHERE content_encrypted IS NOT NULL;
