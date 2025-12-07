-- Create audit_logs table for comprehensive security auditing
-- Tracks all critical actions for compliance (GDPR, CCPA, etc.)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- WHO (user context)
  user_id VARCHAR(255) REFERENCES user_personal_info(user_id) ON DELETE SET NULL,
  is_temp_account BOOLEAN DEFAULT false,
  
  -- WHAT (action details)
  action VARCHAR(100) NOT NULL,           -- LOGIN_SUCCESS, CHAT_MESSAGE_CREATED, etc.
  resource_type VARCHAR(50),              -- 'authentication', 'messages', 'profile', 'account'
  resource_id UUID,                       -- ID of affected resource (message_id, etc.)
  
  -- WHEN
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- WHERE (network context)
  ip_address INET,
  user_agent TEXT,
  
  -- HOW (request context)
  http_method VARCHAR(10),                -- GET, POST, PUT, DELETE
  endpoint VARCHAR(255),                  -- /auth/login, /chat/send, etc.
  
  -- STATUS
  status VARCHAR(50) DEFAULT 'SUCCESS',   -- SUCCESS, FAILURE, BLOCKED
  error_code VARCHAR(100),                -- error type if failed
  error_message TEXT,                     -- error details (sanitized, max 500 chars)
  
  -- CUSTOM DATA (flexible)
  details JSONB DEFAULT '{}'::JSONB,      -- Extra context
  
  -- PERFORMANCE
  duration_ms INTEGER                     -- How long request took
);

-- Create indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_ip_address ON audit_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_audit_status ON audit_logs(status);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_user_time ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action_time ON audit_logs(action, created_at DESC);

-- Index for quick filtering by time window (for real-time analysis)
CREATE INDEX IF NOT EXISTS idx_audit_status_time ON audit_logs(status, created_at DESC);

-- Comment for documentation
COMMENT ON TABLE audit_logs IS 'Security audit log table - tracks all critical user actions for compliance and security analysis';
COMMENT ON COLUMN audit_logs.action IS 'Action type (USER_LOGIN_SUCCESS, CHAT_MESSAGE_CREATED, etc.)';
COMMENT ON COLUMN audit_logs.resource_type IS 'Category of resource (authentication, messages, profile, account)';
COMMENT ON COLUMN audit_logs.status IS 'SUCCESS or FAILURE - helps identify attacks';
COMMENT ON COLUMN audit_logs.details IS 'JSONB field for action-specific metadata';
