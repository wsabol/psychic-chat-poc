-- Migration: Add grace_period_end column to user_consents table
-- Purpose: Track the 30-day grace period deadline for policy acceptance
-- Created: 2026-01-23

BEGIN;

-- Add grace_period_end column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_consents' 
        AND column_name = 'grace_period_end'
    ) THEN
        ALTER TABLE user_consents 
        ADD COLUMN grace_period_end TIMESTAMP WITH TIME ZONE NULL;
        
        -- Add index for efficient querying of expired grace periods
        CREATE INDEX idx_user_consents_grace_period_end 
        ON user_consents(grace_period_end) 
        WHERE grace_period_end IS NOT NULL;
        
        RAISE NOTICE 'Added grace_period_end column to user_consents table';
    ELSE
        RAISE NOTICE 'Column grace_period_end already exists';
    END IF;
END $$;

-- Add comment to column for documentation
COMMENT ON COLUMN user_consents.grace_period_end IS 
'Timestamp when the 30-day grace period expires. Users must accept updated terms/privacy policy before this date or they will be automatically logged out.';

COMMIT;

-- Verification query
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_consents' 
AND column_name = 'grace_period_end';
