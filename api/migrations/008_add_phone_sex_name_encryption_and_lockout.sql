-- ============================================
-- Migration: Encrypt phone, sex, familiar_name & add account lockout
-- Purpose: Additional PII encryption + brute force protection
-- Date: 2025-11-24
-- ============================================

-- ========== ENCRYPTION: Phone, Sex, Familiar Name ==========

-- Add encrypted columns to user_personal_info (if not exists)
ALTER TABLE user_personal_info 
ADD COLUMN IF NOT EXISTS phone_number_encrypted BYTEA,
ADD COLUMN IF NOT EXISTS sex_encrypted BYTEA,
ADD COLUMN IF NOT EXISTS familiar_name_encrypted BYTEA;

-- Add comment for clarity
COMMENT ON COLUMN user_personal_info.phone_number_encrypted IS 
  'Encrypted phone number (PII) - used for 2FA SMS, never stored plaintext';
COMMENT ON COLUMN user_personal_info.sex_encrypted IS 
  'Encrypted sex/gender (PII) - personal profile data';
COMMENT ON COLUMN user_personal_info.familiar_name_encrypted IS 
  'Encrypted familiar name/nickname (PII) - user preference';

-- ========== ACCOUNT LOCKOUT: Track failed login attempts ==========

-- Table for tracking login attempts (for brute force detection)
CREATE TABLE IF NOT EXISTS user_login_attempts (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES user_personal_info(user_id) ON DELETE CASCADE,
  ip_address INET NOT NULL,
  user_agent TEXT,
  success BOOLEAN NOT NULL,              -- true = successful login, false = failed
  reason VARCHAR(100),                   -- Why it failed (invalid_password, user_not_found, etc.)
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id 
  ON user_login_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_address 
  ON user_login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at 
  ON user_login_attempts(created_at DESC);

-- Composite index for finding recent failed attempts
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_recent 
  ON user_login_attempts(user_id, created_at DESC) 
  WHERE success = false;

-- ========== ACCOUNT LOCKOUT: Track active lockouts ==========

CREATE TABLE IF NOT EXISTS user_account_lockouts (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES user_personal_info(user_id) ON DELETE CASCADE,
  reason VARCHAR(100) NOT NULL,          -- 'failed_attempts', 'admin', etc.
  failed_attempt_count INTEGER DEFAULT 0, -- Number of failed attempts that triggered lockout
  locked_at TIMESTAMP DEFAULT NOW(),
  unlock_at TIMESTAMP NOT NULL,
  details JSONB DEFAULT '{}'::JSONB       -- { ip_addresses: [...], last_ip: '...', ua_hashes: [...] }
);

CREATE INDEX IF NOT EXISTS idx_account_lockouts_user_id 
  ON user_account_lockouts(user_id);
CREATE INDEX IF NOT EXISTS idx_account_lockouts_unlock_at 
  ON user_account_lockouts(unlock_at DESC);

-- Index for active (not expired) lockouts
CREATE INDEX IF NOT EXISTS idx_account_lockouts_active 
  ON user_account_lockouts(user_id, unlock_at DESC);

-- ========== SECURITY: Function to check if account is locked ==========

CREATE OR REPLACE FUNCTION is_account_locked(p_user_id VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  v_lockout_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM user_account_lockouts
    WHERE user_id = p_user_id AND unlock_at > NOW()
  ) INTO v_lockout_exists;
  
  RETURN COALESCE(v_lockout_exists, FALSE);
END;
$$ LANGUAGE plpgsql STABLE;

-- ========== SECURITY: Function to count recent failed attempts ==========

CREATE OR REPLACE FUNCTION count_recent_failed_attempts(p_user_id VARCHAR, p_minutes INTEGER DEFAULT 60)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) FROM user_login_attempts
  WHERE user_id = p_user_id 
    AND success = FALSE
    AND created_at > NOW() - (p_minutes || ' minutes')::INTERVAL
  INTO v_count;
  
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- ========== SECURITY: Function to lock account ==========

CREATE OR REPLACE FUNCTION lock_account_on_failed_attempts(p_user_id VARCHAR, p_threshold INTEGER DEFAULT 5)
RETURNS BOOLEAN AS $$
DECLARE
  v_failed_count INTEGER;
  v_unlock_time TIMESTAMP;
BEGIN
  -- Count failed attempts in last 60 minutes
  v_failed_count := count_recent_failed_attempts(p_user_id, 60);
  
  -- If threshold reached, lock account for 15 minutes
  IF v_failed_count >= p_threshold THEN
    v_unlock_time := NOW() + INTERVAL '15 minutes';
    
    INSERT INTO user_account_lockouts (user_id, reason, failed_attempt_count, unlock_at, details)
    VALUES (p_user_id, 'failed_attempts', v_failed_count, v_unlock_time, '{}'::JSONB)
    ON CONFLICT (user_id) DO UPDATE SET 
      failed_attempt_count = v_failed_count,
      unlock_at = v_unlock_time
    WHERE user_account_lockouts.unlock_at > NOW();
    
    RETURN TRUE;  -- Account was locked
  END IF;
  
  RETURN FALSE;  -- Account not locked
END;
$$ LANGUAGE plpgsql;

-- ========== CLEANUP: Remove expired lockouts (can be run periodically) ==========

CREATE OR REPLACE FUNCTION cleanup_expired_lockouts()
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM user_account_lockouts 
  WHERE unlock_at < NOW();
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- Add unique index to prevent duplicate active lockouts
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_account_lockouts_unique_active 
  ON user_account_lockouts(user_id) 
  WHERE unlock_at > NOW();

-- ========== DOCUMENTATION ==========

COMMENT ON TABLE user_login_attempts IS 
  'Tracks all login attempts (success/failure) for audit and brute force detection';
COMMENT ON TABLE user_account_lockouts IS 
  'Tracks active account lockouts due to failed login attempts or admin action';
COMMENT ON FUNCTION is_account_locked(VARCHAR) IS 
  'Check if a user account is currently locked (returns true/false)';
COMMENT ON FUNCTION count_recent_failed_attempts(VARCHAR, INTEGER) IS 
  'Count failed login attempts in the past N minutes (default 60)';
COMMENT ON FUNCTION lock_account_on_failed_attempts(VARCHAR, INTEGER) IS 
  'Lock account if failed attempts exceed threshold (default 5 in 60 minutes)';
COMMENT ON FUNCTION cleanup_expired_lockouts() IS 
  'Remove expired lockouts (can be called periodically or on schedule)';
