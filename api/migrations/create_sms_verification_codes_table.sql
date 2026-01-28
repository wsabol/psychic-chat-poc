-- Migration: Create SMS verification codes table for AWS SNS
-- Purpose: Store verification codes since AWS SNS doesn't have built-in verify service like Twilio
-- Date: 2026-01-27

-- Create table to store verification codes
CREATE TABLE IF NOT EXISTS sms_verification_codes (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for efficient lookups by phone number and code
CREATE INDEX IF NOT EXISTS idx_sms_codes_phone_code 
ON sms_verification_codes(phone_number, code);

-- Index for expiration cleanup queries
CREATE INDEX IF NOT EXISTS idx_sms_codes_expires 
ON sms_verification_codes(expires_at);

-- Index for finding unverified codes
CREATE INDEX IF NOT EXISTS idx_sms_codes_unverified 
ON sms_verification_codes(phone_number, verified_at) 
WHERE verified_at IS NULL;

-- Add comments
COMMENT ON TABLE sms_verification_codes IS 'Stores 6-digit SMS verification codes for AWS SNS. Codes expire after 10 minutes. Used for 2FA and phone verification.';
COMMENT ON COLUMN sms_verification_codes.phone_number IS 'Phone number in E.164 format (e.g., +15555555555)';
COMMENT ON COLUMN sms_verification_codes.code IS '6-digit verification code sent via SMS';
COMMENT ON COLUMN sms_verification_codes.expires_at IS 'When the code expires (10 minutes after creation)';
COMMENT ON COLUMN sms_verification_codes.verified_at IS 'When the code was successfully verified (NULL if not verified yet)';
