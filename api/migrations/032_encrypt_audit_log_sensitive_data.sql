-- Add encrypted fields to audit_log for sensitive data
ALTER TABLE audit_log
ADD COLUMN IF NOT EXISTS email_encrypted BYTEA,
ADD COLUMN IF NOT EXISTS action_context_encrypted BYTEA;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_email_encrypted ON audit_log(email_encrypted);
CREATE INDEX IF NOT EXISTS idx_audit_user_action ON audit_log(user_id_hash, action);

-- Note: Existing plain text emails in details JSONB should be queried carefully
-- When viewing audit logs, sensitive data should be decrypted on-demand with proper authorization
