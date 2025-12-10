-- ============================================
-- Migration: Account Deletion Tracking
-- Purpose: Support 30-day grace period and 2-year retention with re-engagement
-- Date: 2025-12-10
-- Phase: 3.6 (Account Deletion & Data Retention)
-- ============================================

-- ========== ADD DELETION COLUMNS TO user_personal_info ==========

ALTER TABLE user_personal_info
ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS deletion_status VARCHAR(50) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS anonymization_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS final_deletion_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS deletion_reason VARCHAR(255);

-- ========== CREATE INDEXES ==========

CREATE INDEX IF NOT EXISTS idx_user_deletion_status 
  ON user_personal_info(deletion_status) 
  WHERE deletion_status != 'active';

CREATE INDEX IF NOT EXISTS idx_user_deletion_requested 
  ON user_personal_info(deletion_requested_at DESC) 
  WHERE deletion_requested_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_final_deletion_date 
  ON user_personal_info(final_deletion_date) 
  WHERE final_deletion_date IS NOT NULL;

-- ========== CREATE DELETION AUDIT TABLE ==========

CREATE TABLE IF NOT EXISTS account_deletion_audit (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL,  -- 'DELETION_REQUESTED', 'DELETION_CONFIRMED', 'REACTIVATED', 'ANONYMIZED', 'PERMANENTLY_DELETED'
  action_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  reason VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deletion_audit_user_id 
  ON account_deletion_audit(user_id);

CREATE INDEX IF NOT EXISTS idx_deletion_audit_action 
  ON account_deletion_audit(action);

CREATE INDEX IF NOT EXISTS idx_deletion_audit_timestamp 
  ON account_deletion_audit(action_timestamp DESC);

-- ========== ADD COMMENTS ==========

COMMENT ON COLUMN user_personal_info.deletion_requested_at IS 
  'Timestamp when user requested account deletion (start of 30-day grace period)';

COMMENT ON COLUMN user_personal_info.deletion_status IS 
  'Status: active, pending_deletion, anonymized, or deleted';

COMMENT ON COLUMN user_personal_info.anonymization_date IS 
  'Date when PII was anonymized (1 year after deletion request)';

COMMENT ON COLUMN user_personal_info.final_deletion_date IS 
  'Date when account will be permanently deleted (2 years after deletion request)';

-- ========== HELPER FUNCTIONS ==========

-- Function to get accounts pending deletion (1 year old - ready to anonymize)
CREATE OR REPLACE FUNCTION get_accounts_for_anonymization()
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
    AND upi.anonymization_date IS NULL
    AND (CURRENT_DATE - upi.deletion_requested_at::DATE) >= 365;
END;
$$ LANGUAGE plpgsql;

-- Function to get accounts ready for permanent deletion (2 years old)
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
  WHERE upi.deletion_status = 'anonymized'
    AND upi.deletion_requested_at IS NOT NULL
    AND upi.final_deletion_date IS NULL
    AND (CURRENT_DATE - upi.deletion_requested_at::DATE) >= 730;
END;
$$ LANGUAGE plpgsql;

-- Function to anonymize user data
CREATE OR REPLACE FUNCTION anonymize_user_data(p_user_id VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  -- Anonymize personal information
  UPDATE user_personal_info
  SET 
    first_name_encrypted = pgp_sym_encrypt(CONCAT('DELETED_', p_user_id), current_setting('app.encryption_key')),
    last_name_encrypted = pgp_sym_encrypt(CONCAT('DELETED_', p_user_id), current_setting('app.encryption_key')),
    email_encrypted = pgp_sym_encrypt(CONCAT('deleted_', p_user_id, '@deleted.local'), current_setting('app.encryption_key')),
    phone_number_encrypted = NULL,
    sex_encrypted = NULL,
    familiar_name_encrypted = NULL,
    birth_date_encrypted = NULL,
    birth_city_encrypted = NULL,
    birth_timezone_encrypted = NULL,
    birth_country_encrypted = NULL,
    birth_province_encrypted = NULL,
    address_preference_encrypted = NULL,
    deletion_status = 'anonymized',
    anonymization_date = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ========== VERIFICATION ==========

SELECT 'Account deletion tracking schema created successfully' as status;
SELECT COUNT(*) as column_count FROM information_schema.columns WHERE table_name = 'user_personal_info' AND column_name LIKE 'deletion%';
