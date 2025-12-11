-- Add Stripe customer ID column to user_personal_info
-- This stores the Stripe customer ID for subscription management

ALTER TABLE user_personal_info 
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_personal_info_stripe_id 
ON user_personal_info(stripe_customer_id);
