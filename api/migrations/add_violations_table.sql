-- Migration: Add user violations tracking table
-- Purpose: Track rule violations for enforcement (warnings, suspensions, permanent bans)

CREATE TABLE IF NOT EXISTS user_violations (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    violation_type VARCHAR(50) NOT NULL, -- 'sexual_content', 'self_harm', 'harm_others', 'financial_advice', 'medical_advice', etc.
    violation_count INT DEFAULT 1,
    violation_message TEXT, -- The message that triggered the violation
    response_given TEXT, -- The oracle response (for review/logging)
    is_account_disabled BOOLEAN DEFAULT FALSE,
    suspension_end_date TIMESTAMP NULL, -- For 7-day suspensions
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user_personal_info(user_id) ON DELETE CASCADE
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_user_violations_user_id ON user_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_violations_violation_type ON user_violations(violation_type);
CREATE INDEX IF NOT EXISTS idx_user_violations_is_disabled ON user_violations(is_account_disabled);

-- Add is_suspended column to user_personal_info if it doesn't exist
ALTER TABLE user_personal_info 
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS suspension_end_date TIMESTAMP NULL;
