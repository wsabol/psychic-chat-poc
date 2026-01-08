-- ============================================
-- Migration: Account Re-engagement Tracking
-- Purpose: Support re-engagement email campaigns for deleted accounts
-- Date: 2025-01-15
-- Phase: 3.7 (Account Deletion & Data Retention - Legal Compliance)
-- ============================================

-- ========== ADD RE-ENGAGEMENT EMAIL TRACKING COLUMNS ==========
-- These columns track when re-engagement emails have been sent to users
-- who have requested account deletion, allowing them to reactivate

ALTER TABLE user_personal_info
ADD COLUMN IF NOT EXISTS reengagement_email_6m_sent_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS reengagement_email_1y_sent_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS reengagement_email_unsub BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_reengagement_email_sent_at TIMESTAMP;

-- ========== UPDATE SCHEMA COMMENTS ==========

COMMENT ON COLUMN user_personal_info.deletion_status IS 
  'Status: active, pending_deletion, or deleted (no longer anonymized for legal compliance)';

COMMENT ON COLUMN user_personal_info.anonymization_date IS 
  'DEPRECATED: No longer used. Data retained in original form for 7 years for legal investigation purposes.';

COMMENT ON COLUMN user_personal_info.final_deletion_date IS 
  'Date when account will be permanently deleted (7 years after deletion request for statute of limitation compliance)';

COMMENT ON COLUMN user_personal_info.reengagement_email_6m_sent_at IS 
  'Timestamp when first re-engagement email was sent (6 months after deletion request)';

COMMENT ON COLUMN user_personal_info.reengagement_email_1y_sent_at IS 
  'Timestamp when second re-engagement email was sent (1 year after deletion request)';

COMMENT ON COLUMN user_personal_info.reengagement_email_unsub IS 
  'Flag indicating user has unsubscribed from re-engagement emails';

COMMENT ON COLUMN user_personal_info.last_reengagement_email_sent_at IS 
  'Timestamp of most recent re-engagement email for tracking purposes';

-- ========== CREATE RE-ENGAGEMENT EMAIL LOG TABLE ==========

CREATE TABLE IF NOT EXISTS account_reengagement_emails (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  email_type VARCHAR(50) NOT NULL,  -- '6_month', '1_year'
  sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
  message_id VARCHAR(255),  -- SendGrid message ID for tracking
  bounced BOOLEAN DEFAULT FALSE,
  opened BOOLEAN DEFAULT FALSE,
  clicked BOOLEAN DEFAULT FALSE,
  unsubscribed BOOLEAN DEFAULT FALSE,
  reactivated BOOLEAN DEFAULT FALSE,
  reactivated_at TIMESTAMP,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reengagement_emails_user_id 
  ON account_reengagement_emails(user_id);

CREATE INDEX IF NOT EXISTS idx_reengagement_emails_type 
  ON account_reengagement_emails(email_type);

CREATE INDEX IF NOT EXISTS idx_reengagement_emails_sent_at 
  ON account_reengagement_emails(sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_reengagement_emails_unsubscribed 
  ON account_reengagement_emails(unsubscribed);

COMMENT ON TABLE account_reengagement_emails IS 
  'Log of all re-engagement emails sent to users with deleted accounts, tracking engagement and unsubscribe status';

-- ========== UPDATE HELPER FUNCTIONS ==========

-- Function to get accounts ready for 6-month re-engagement email
CREATE OR REPLACE FUNCTION get_accounts_for_6m_reengagement()
RETURNS TABLE (
  user_id VARCHAR,
  deletion_requested_at TIMESTAMP,
  days_since_deletion INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    upi.user_id,
    upi.deletion_requested_at,
    (CURRENT_DATE - upi.deletion_requested_at::DATE)::INTEGER as days_since_deletion
  FROM user_personal_info upi
  WHERE upi.deletion_status = 'pending_deletion'
    AND upi.deletion_requested_at IS NOT NULL
    AND upi.reengagement_email_6m_sent_at IS NULL
    AND upi.reengagement_email_unsub = FALSE
    AND (CURRENT_DATE - upi.deletion_requested_at::DATE) >= 180
    AND (CURRENT_DATE - upi.deletion_requested_at::DATE) < 185;
END;
$$ LANGUAGE plpgsql;

-- Function to get accounts ready for 1-year re-engagement email
CREATE OR REPLACE FUNCTION get_accounts_for_1y_reengagement()
RETURNS TABLE (
  user_id VARCHAR,
  deletion_requested_at TIMESTAMP,
  days_since_deletion INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    upi.user_id,
    upi.deletion_requested_at,
    (CURRENT_DATE - upi.deletion_requested_at::DATE)::INTEGER as days_since_deletion
  FROM user_personal_info upi
  WHERE upi.deletion_status = 'pending_deletion'
    AND upi.deletion_requested_at IS NOT NULL
    AND upi.reengagement_email_1y_sent_at IS NULL
    AND upi.reengagement_email_unsub = FALSE
    AND (CURRENT_DATE - upi.deletion_requested_at::DATE) >= 365
    AND (CURRENT_DATE - upi.deletion_requested_at::DATE) < 370;
END;
$$ LANGUAGE plpgsql;

-- Function to get accounts ready for permanent deletion (7 years old)
CREATE OR REPLACE FUNCTION get_accounts_for_permanent_deletion()
RETURNS TABLE (
  user_id VARCHAR,
  deletion_requested_at TIMESTAMP,
  days_since_deletion INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    upi.user_id,
    upi.deletion_requested_at,
    (CURRENT_DATE - upi.deletion_requested_at::DATE)::INTEGER as days_since_deletion
  FROM user_personal_info upi
  WHERE upi.deletion_status = 'pending_deletion'
    AND upi.deletion_requested_at IS NOT NULL
    AND upi.final_deletion_date IS NULL
    AND (CURRENT_DATE - upi.deletion_requested_at::DATE) >= 2555;
END;
$$ LANGUAGE plpgsql;

-- ========== VERIFICATION ==========

SELECT 'Account re-engagement tracking schema created successfully' as status;
SELECT COUNT(*) as column_count FROM information_schema.columns 
  WHERE table_name = 'user_personal_info' AND column_name LIKE 'reengagement%';
