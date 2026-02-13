-- Migration: Create SMS opt-outs table for STOP keyword handling
-- Purpose: Track users who have opted out of SMS messages (TCPA compliance)
-- Date: 2026-02-12
-- Related: AWS SMS Registration requirements

-- Create table to store SMS opt-outs
CREATE TABLE IF NOT EXISTS sms_opt_outs (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    opted_out_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for efficient lookups by phone number
CREATE INDEX IF NOT EXISTS idx_sms_opt_outs_phone 
ON sms_opt_outs(phone_number);

-- Add comments
COMMENT ON TABLE sms_opt_outs IS 'Tracks phone numbers that have opted out of SMS messages via STOP keyword. Required for TCPA compliance.';
COMMENT ON COLUMN sms_opt_outs.phone_number IS 'Phone number in E.164 format (e.g., +15555555555)';
COMMENT ON COLUMN sms_opt_outs.opted_out_at IS 'When the user sent STOP keyword';
COMMENT ON COLUMN sms_opt_outs.created_at IS 'Record creation timestamp';
