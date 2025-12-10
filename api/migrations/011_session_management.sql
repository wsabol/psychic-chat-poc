-- ============================================
-- Migration: Session Management
-- Purpose: Track user sessions with timeouts and multi-device login
-- Date: 2025-12-10
-- Phase: 5.1 (Advanced Hardening)
-- ============================================

-- Create sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  session_token VARCHAR(500) NOT NULL UNIQUE,
  device_name VARCHAR(255),
  device_type VARCHAR(50),  -- 'mobile', 'desktop', 'tablet'
  browser_name VARCHAR(100),
  browser_version VARCHAR(50),
  ip_address INET NOT NULL,
  user_agent TEXT,
  
  -- Session lifecycle
  created_at TIMESTAMP DEFAULT NOW(),
  last_activity_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  logged_out_at TIMESTAMP,
  
  -- Session status
  status VARCHAR(50) DEFAULT 'active',  -- 'active', 'expired', 'revoked', 'logged_out'
  
  -- Security
  is_2fa_verified BOOLEAN DEFAULT FALSE,
  suspicious_activity BOOLEAN DEFAULT FALSE,
  
  FOREIGN KEY (user_id) REFERENCES user_personal_info(user_id) ON DELETE CASCADE
);

-- Indexes for fast session lookups
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON user_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON user_sessions(user_id, status) 
  WHERE status = 'active';

-- Create login attempt tracking table
CREATE TABLE IF NOT EXISTS login_attempts (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255),
  email_attempted VARCHAR(255),
  ip_address INET NOT NULL,
  user_agent TEXT,
  
  attempt_type VARCHAR(50),  -- 'success', 'failed_password', 'failed_2fa', 'blocked'
  reason VARCHAR(255),  -- Why it failed (wrong password, locked account, etc.)
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for login attempt analysis
CREATE INDEX IF NOT EXISTS idx_login_attempts_user ON login_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created ON login_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_type ON login_attempts(attempt_type);

-- Create function to clean expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  UPDATE user_sessions
  SET status = 'expired'
  WHERE status = 'active' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create function to get active sessions for user
CREATE OR REPLACE FUNCTION get_active_sessions(p_user_id VARCHAR)
RETURNS TABLE (
  session_id INT,
  device_name VARCHAR,
  device_type VARCHAR,
  browser_name VARCHAR,
  ip_address INET,
  created_at TIMESTAMP,
  last_activity_at TIMESTAMP,
  expires_at TIMESTAMP,
  is_current_session BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    us.id,
    us.device_name,
    us.device_type,
    us.browser_name,
    us.ip_address,
    us.created_at,
    us.last_activity_at,
    us.expires_at,
    FALSE as is_current_session
  FROM user_sessions us
  WHERE us.user_id = p_user_id
    AND us.status = 'active'
    AND us.expires_at > NOW()
  ORDER BY us.last_activity_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE user_sessions IS 'User session management - tracks active sessions with timeout and multi-device support';
COMMENT ON COLUMN user_sessions.session_token IS 'Unique session token (stored as hash in practice)';
COMMENT ON COLUMN user_sessions.last_activity_at IS 'Last time user was active in this session';
COMMENT ON COLUMN user_sessions.expires_at IS 'Session expiration timestamp (inactivity timeout)';
COMMENT ON COLUMN user_sessions.status IS 'Session status: active, expired, revoked, or logged_out';

COMMENT ON TABLE login_attempts IS 'Login attempt audit trail - tracks all login attempts for security analysis';
COMMENT ON COLUMN login_attempts.attempt_type IS 'Type of attempt: success, failed_password, failed_2fa, or blocked';
COMMENT ON COLUMN login_attempts.reason IS 'Reason for failure (account_locked, wrong_password, etc.)';

-- Verification
SELECT 'Session management tables created successfully' as status;
SELECT COUNT(*) as tables_created FROM information_schema.tables 
  WHERE table_name IN ('user_sessions', 'login_attempts') AND table_schema = 'public';
