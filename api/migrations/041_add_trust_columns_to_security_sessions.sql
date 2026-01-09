-- ============================================
-- ADD TRUST COLUMNS TO SECURITY_SESSIONS
-- Date: January 2025
-- Description: Add device trust functionality
-- ============================================

-- Add is_trusted column if it doesn't exist
ALTER TABLE security_sessions 
ADD COLUMN IF NOT EXISTS is_trusted BOOLEAN DEFAULT false;

-- Add trust_expiry column if it doesn't exist
ALTER TABLE security_sessions 
ADD COLUMN IF NOT EXISTS trust_expiry TIMESTAMP;

-- Verify the columns were added
\d security_sessions
