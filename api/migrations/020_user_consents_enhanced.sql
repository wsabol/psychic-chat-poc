-- Migration: Enhanced User Consents Table for Compliance
-- Purpose: Store T&C, Privacy, and Data Processing consents with encryption
-- Compliance: GDPR, CCPA, PIPEDA, LGPD

-- Drop old table if exists (will be recreated with encryption)
DROP TABLE IF EXISTS user_consents CASCADE;

-- Create enhanced user_consents table
CREATE TABLE user_consents (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    
    -- Terms & Conditions (v1.0, v1.1, v2.0, etc.)
    terms_version VARCHAR(10),
    terms_accepted BOOLEAN DEFAULT FALSE,
    terms_accepted_at TIMESTAMP,
    
    -- Privacy Policy (v1.0, v1.1, v2.0, etc.)
    privacy_version VARCHAR(10),
    privacy_accepted BOOLEAN DEFAULT FALSE,
    privacy_accepted_at TIMESTAMP,
    
    -- Optional Data Processing Consents
    -- NOT encrypted: These are preferences/settings, not secrets
    consent_astrology BOOLEAN DEFAULT FALSE,
    consent_chat_analysis BOOLEAN DEFAULT FALSE,
    consent_health_wellness BOOLEAN DEFAULT FALSE,
    
    -- Audit Trail
    -- ✅ IP encrypted for GDPR compliance
    ip_address_encrypted BYTEA,
    -- User agent not encrypted: browser info, not PII in most jurisdictions
    user_agent TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign Key
    CONSTRAINT fk_user_consents_user_id 
        FOREIGN KEY (user_id) 
        REFERENCES user_personal_info(user_id) 
        ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX idx_user_consents_terms_accepted ON user_consents(terms_accepted);
CREATE INDEX idx_user_consents_privacy_accepted ON user_consents(privacy_accepted);
CREATE INDEX idx_user_consents_created_at ON user_consents(created_at);

-- Add comments for documentation
COMMENT ON TABLE user_consents IS 'Stores T&C, Privacy Policy, and data processing consent records. All dates and decisions are auditable.';
COMMENT ON COLUMN user_consents.ip_address_encrypted IS 'Encrypted with pgcrypto for GDPR compliance. IP addresses are PII in EU.';
COMMENT ON COLUMN user_consents.terms_version IS 'T&C version accepted (e.g., 1.0, 1.1, 2.0). Used to detect policy changes.';
COMMENT ON COLUMN user_consents.privacy_version IS 'Privacy Policy version accepted (e.g., 1.0, 1.1, 2.0). Used to detect policy changes.';

-- Verify table created
SELECT 'user_consents table created successfully' as status;
