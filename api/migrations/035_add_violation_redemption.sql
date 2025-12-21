-- Migration: Add violation redemption system
-- Purpose: Enable users to redeem certain violations after a cooling-off period

-- Add columns to track redemption eligibility and history
ALTER TABLE user_violations
ADD COLUMN IF NOT EXISTS is_redeemable BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS last_violation_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS violation_redeemed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS redemption_cooling_hours INT DEFAULT 24;

-- Create index for quick redemption lookups
CREATE INDEX IF NOT EXISTS idx_user_violations_redeemable ON user_violations(user_id_hash, violation_type, is_redeemable);
CREATE INDEX IF NOT EXISTS idx_user_violations_timestamp ON user_violations(last_violation_timestamp);

-- Mark certain violation types as non-redeemable by default
-- This will be set by the application logic, but create a comment for clarity
COMMENT ON COLUMN user_violations.is_redeemable IS 
'Controls whether violation can be redeemed. SELF_HARM and HARM_OTHERS are never redeemable. ABUSIVE_LANGUAGE and SEXUAL_CONTENT are redeemable on first offense only.';

COMMENT ON COLUMN user_violations.redemption_cooling_hours IS 
'Hours user must remain violation-free for redemption. ABUSIVE_LANGUAGE=24h, SEXUAL_CONTENT=168h (7 days).';
