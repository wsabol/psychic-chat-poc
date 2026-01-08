-- Migration: Consent Version Compliance System
-- Purpose: Add columns to track version changes and re-acceptance requirements
-- Compliance: GDPR, CCPA, PIPEDA, LGPD
-- Date: January 2026

-- Add columns to track version compliance status
ALTER TABLE user_consents ADD COLUMN IF NOT EXISTS 
  requires_consent_update BOOLEAN DEFAULT false;

ALTER TABLE user_consents ADD COLUMN IF NOT EXISTS 
  last_notified_at TIMESTAMP DEFAULT NULL;

ALTER TABLE user_consents ADD COLUMN IF NOT EXISTS 
  notification_count INT DEFAULT 0;

-- New indexes for compliance tracking
CREATE INDEX IF NOT EXISTS idx_user_consents_requires_update 
  ON user_consents(requires_consent_update);

CREATE INDEX IF NOT EXISTS idx_user_consents_last_notified 
  ON user_consents(last_notified_at);

-- Add version tracking columns (if not already in schema)
ALTER TABLE user_consents ADD COLUMN IF NOT EXISTS 
  terms_version VARCHAR(50) DEFAULT '1.0';

ALTER TABLE user_consents ADD COLUMN IF NOT EXISTS 
  privacy_version VARCHAR(50) DEFAULT '1.0';

-- Add comment for documentation
COMMENT ON COLUMN user_consents.requires_consent_update IS 
  'Flag set to true when versions change - user must re-accept to continue using app';

COMMENT ON COLUMN user_consents.last_notified_at IS 
  'Timestamp when user was last notified of version update. Used to avoid duplicate notifications.';

COMMENT ON COLUMN user_consents.notification_count IS 
  'Number of times user has been notified about current version change. Helps track notification effectiveness.';

-- Create view for compliance dashboard
CREATE OR REPLACE VIEW compliance_adoption_report AS
SELECT 
  'terms' as document_type,
  terms_version as version,
  COUNT(*) as user_count,
  COUNT(*) FILTER (WHERE terms_accepted = true) as accepted_count,
  COUNT(*) FILTER (WHERE terms_accepted = true) * 100.0 / NULLIF(COUNT(*), 0) as acceptance_percentage,
  COUNT(*) FILTER (WHERE requires_consent_update = true) as requires_action_count,
  MAX(terms_accepted_at) as latest_acceptance,
  MIN(terms_accepted_at) as earliest_acceptance
FROM user_consents
GROUP BY terms_version
UNION ALL
SELECT 
  'privacy' as document_type,
  privacy_version as version,
  COUNT(*) as user_count,
  COUNT(*) FILTER (WHERE privacy_accepted = true) as accepted_count,
  COUNT(*) FILTER (WHERE privacy_accepted = true) * 100.0 / NULLIF(COUNT(*), 0) as acceptance_percentage,
  COUNT(*) FILTER (WHERE requires_consent_update = true) as requires_action_count,
  MAX(privacy_accepted_at) as latest_acceptance,
  MIN(privacy_accepted_at) as earliest_acceptance
FROM user_consents
GROUP BY privacy_version;

-- Verify migration completed
SELECT 'Consent version compliance system created successfully' as status;
