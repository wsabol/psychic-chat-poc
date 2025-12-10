-- ============================================
-- Migration: Create User Consents Table
-- Purpose: Track user consent for data processing (GDPR/CCPA requirement)
-- Date: 2025-11-24
-- Phase: 3.2 (Consent Management)
-- ============================================

-- ========== CREATE CONSENTS TABLE ==========

CREATE TABLE IF NOT EXISTS user_consents (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL UNIQUE,
  
  -- Consent flags (boolean = user has explicitly consented)
  consent_astrology BOOLEAN DEFAULT FALSE,      -- Astrology reading data processing
  consent_health_data BOOLEAN DEFAULT FALSE,    -- Health/wellness data processing
  consent_chat_analysis BOOLEAN DEFAULT FALSE,  -- Chat analysis and ML improvements
  
  -- Proof of consent
  agreed_at TIMESTAMP NOT NULL DEFAULT NOW(),   -- When user agreed
  agreed_from_ip INET NOT NULL,                 -- IP address (proof of location)
  user_agent TEXT,                              -- Browser/device information
  
  -- Audit fields
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Foreign key constraint
  CONSTRAINT fk_user_consents_user_id 
    FOREIGN KEY (user_id) 
    REFERENCES user_personal_info(user_id) 
    ON DELETE CASCADE
);

-- ========== CREATE INDEXES ==========

-- Index for quick user consent lookup
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id 
  ON user_consents(user_id);

-- Index for consent history queries
CREATE INDEX IF NOT EXISTS idx_user_consents_created 
  ON user_consents(created_at DESC);

-- Index for filtering users with specific consents
CREATE INDEX IF NOT EXISTS idx_user_consents_astrology 
  ON user_consents(consent_astrology) WHERE consent_astrology = TRUE;

CREATE INDEX IF NOT EXISTS idx_user_consents_health 
  ON user_consents(consent_health_data) WHERE consent_health_data = TRUE;

CREATE INDEX IF NOT EXISTS idx_user_consents_chat 
  ON user_consents(consent_chat_analysis) WHERE consent_chat_analysis = TRUE;

-- ========== ADD COMMENTS ==========

COMMENT ON TABLE user_consents IS 
  'Stores explicit user consent for data processing per GDPR Article 7, CCPA, PIPEDA, LGPD';

COMMENT ON COLUMN user_consents.user_id IS 
  'Unique reference to user_personal_info';

COMMENT ON COLUMN user_consents.consent_astrology IS 
  'User has consented to astrology reading data collection and processing';

COMMENT ON COLUMN user_consents.consent_health_data IS 
  'User has consented to health/wellness data collection (RESTRICTED - health topics blocked)';

COMMENT ON COLUMN user_consents.consent_chat_analysis IS 
  'User has consented to chat analysis for service improvements';

COMMENT ON COLUMN user_consents.agreed_at IS 
  'Timestamp of consent - serves as evidence for compliance audits';

COMMENT ON COLUMN user_consents.agreed_from_ip IS 
  'IP address at time of consent - proves user location and helps detect fraud';

COMMENT ON COLUMN user_consents.user_agent IS 
  'Browser/device info - helps identify device used for consent (security)';

-- ========== AUDIT TRIGGER ==========

-- Create audit trigger function (if not exists)
CREATE OR REPLACE FUNCTION audit_consent_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log consent changes to audit_log table
  INSERT INTO audit_log (
    user_id, action, details, ip_address, created_at
  ) VALUES (
    NEW.user_id,
    CASE WHEN TG_OP = 'INSERT' THEN 'CONSENT_CREATED' ELSE 'CONSENT_UPDATED' END,
    jsonb_build_object(
      'consent_astrology', NEW.consent_astrology,
      'consent_health_data', NEW.consent_health_data,
      'consent_chat_analysis', NEW.consent_chat_analysis,
      'agreed_from_ip', NEW.agreed_from_ip,
      'timestamp', NEW.agreed_at
    ),
    NEW.agreed_from_ip,
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on INSERT or UPDATE
DROP TRIGGER IF EXISTS trigger_audit_consent_changes ON user_consents;
CREATE TRIGGER trigger_audit_consent_changes
AFTER INSERT OR UPDATE ON user_consents
FOR EACH ROW
EXECUTE FUNCTION audit_consent_changes();

-- ========== HELPER FUNCTIONS ==========

-- Function to get user's current consent status
CREATE OR REPLACE FUNCTION get_user_consents(p_user_id VARCHAR)
RETURNS TABLE (
  user_id VARCHAR,
  consent_astrology BOOLEAN,
  consent_health_data BOOLEAN,
  consent_chat_analysis BOOLEAN,
  agreed_at TIMESTAMP,
  agreed_from_ip INET,
  days_since_consent INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uc.user_id,
    uc.consent_astrology,
    uc.consent_health_data,
    uc.consent_chat_analysis,
    uc.agreed_at,
    uc.agreed_from_ip,
    (CURRENT_DATE - uc.agreed_at::DATE)::INTEGER
  FROM user_consents uc
  WHERE uc.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has consented to astrology
CREATE OR REPLACE FUNCTION has_consent_astrology(p_user_id VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  v_consent BOOLEAN;
BEGIN
  SELECT consent_astrology INTO v_consent
  FROM user_consents
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(v_consent, FALSE);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if user has consented to health data
CREATE OR REPLACE FUNCTION has_consent_health_data(p_user_id VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  v_consent BOOLEAN;
BEGIN
  SELECT consent_health_data INTO v_consent
  FROM user_consents
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(v_consent, FALSE);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if user has consented to chat analysis
CREATE OR REPLACE FUNCTION has_consent_chat_analysis(p_user_id VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  v_consent BOOLEAN;
BEGIN
  SELECT consent_chat_analysis INTO v_consent
  FROM user_consents
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(v_consent, FALSE);
END;
$$ LANGUAGE plpgsql STABLE;

-- ========== VERIFICATION ==========

-- Verify table created successfully
SELECT 'user_consents table created successfully' as status;
SELECT COUNT(*) as column_count FROM information_schema.columns WHERE table_name = 'user_consents';
