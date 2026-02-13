-- Migration: Create SMS inbound log table for audit trail
-- Purpose: Track all incoming SMS messages for compliance and debugging
-- Date: 2026-02-12
-- Related: Two-way SMS Lambda handler, TCPA compliance

-- Create table to log incoming SMS messages
CREATE TABLE IF NOT EXISTS sms_inbound_log (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    message_body TEXT,
    action_taken VARCHAR(20) NOT NULL, -- STOP, START, HELP, IGNORED
    message_id VARCHAR(255), -- AWS message ID
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for efficient lookups by phone number
CREATE INDEX IF NOT EXISTS idx_sms_inbound_log_phone 
ON sms_inbound_log(phone_number);

-- Index for efficient lookups by date
CREATE INDEX IF NOT EXISTS idx_sms_inbound_log_created 
ON sms_inbound_log(created_at DESC);

-- Index for action type reporting
CREATE INDEX IF NOT EXISTS idx_sms_inbound_log_action 
ON sms_inbound_log(action_taken);

-- Add comments
COMMENT ON TABLE sms_inbound_log IS 'Audit log of all incoming SMS messages for compliance and debugging';
COMMENT ON COLUMN sms_inbound_log.phone_number IS 'Phone number that sent the message (E.164 format)';
COMMENT ON COLUMN sms_inbound_log.message_body IS 'Content of the incoming SMS';
COMMENT ON COLUMN sms_inbound_log.action_taken IS 'Action taken: STOP, START, HELP, or IGNORED';
COMMENT ON COLUMN sms_inbound_log.message_id IS 'AWS SNS message ID for tracking';
