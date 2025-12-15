-- ============================================
-- Migration 024: Hash user_id in all tables
-- Purpose: Prevent user_id exposure in database dumps
-- Date: 2025-12-15
-- Strategy: Add user_id_hash column (SHA256), keep plaintext only in user_personal_info
-- ============================================

-- Enable pgcrypto extension for hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ========== ADD user_id_hash COLUMNS ==========

-- 1. audit_log
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS user_id_hash VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id_hash ON audit_log(user_id_hash);
COMMENT ON COLUMN audit_log.user_id_hash IS 'SHA256 hash of user_id for privacy (cannot be reversed)';

-- 2. messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS user_id_hash VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_messages_user_id_hash ON messages(user_id_hash);
COMMENT ON COLUMN messages.user_id_hash IS 'SHA256 hash of user_id for privacy';

-- 3. pending_migrations
ALTER TABLE pending_migrations ADD COLUMN IF NOT EXISTS temp_user_id_hash VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_pending_migrations_temp_user_id_hash ON pending_migrations(temp_user_id_hash);
COMMENT ON COLUMN pending_migrations.temp_user_id_hash IS 'SHA256 hash of temp_user_id for privacy';

-- 4. security
ALTER TABLE security ADD COLUMN IF NOT EXISTS user_id_hash VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_security_user_id_hash ON security(user_id_hash);
COMMENT ON COLUMN security.user_id_hash IS 'SHA256 hash of user_id for privacy';

-- 5. security_sessions
ALTER TABLE security_sessions ADD COLUMN IF NOT EXISTS user_id_hash VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_security_sessions_user_id_hash ON security_sessions(user_id_hash);
COMMENT ON COLUMN security_sessions.user_id_hash IS 'SHA256 hash of user_id for privacy';

-- 6. user_2fa_codes
ALTER TABLE user_2fa_codes ADD COLUMN IF NOT EXISTS user_id_hash VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_user_2fa_codes_user_id_hash ON user_2fa_codes(user_id_hash);
COMMENT ON COLUMN user_2fa_codes.user_id_hash IS 'SHA256 hash of user_id for privacy';

-- 7. user_2fa_settings
ALTER TABLE user_2fa_settings ADD COLUMN IF NOT EXISTS user_id_hash VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_user_2fa_settings_user_id_hash ON user_2fa_settings(user_id_hash);
COMMENT ON COLUMN user_2fa_settings.user_id_hash IS 'SHA256 hash of user_id for privacy';

-- 8. user_astrology
ALTER TABLE user_astrology ADD COLUMN IF NOT EXISTS user_id_hash VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_user_astrology_user_id_hash ON user_astrology(user_id_hash);
COMMENT ON COLUMN user_astrology.user_id_hash IS 'SHA256 hash of user_id for privacy';

-- 9. user_violations
ALTER TABLE user_violations ADD COLUMN IF NOT EXISTS user_id_hash VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_user_violations_user_id_hash ON user_violations(user_id_hash);
COMMENT ON COLUMN user_violations.user_id_hash IS 'SHA256 hash of user_id for privacy';

-- 10. verification_codes
ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS user_id_hash VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_verification_codes_user_id_hash ON verification_codes(user_id_hash);
COMMENT ON COLUMN verification_codes.user_id_hash IS 'SHA256 hash of user_id for privacy';

-- 11. user_personal_info - KEEP plaintext (master record)
-- No changes needed - this is the only table with plaintext user_id

-- ========== MIGRATE EXISTING DATA (Hash all existing user_ids) ==========

UPDATE audit_log 
SET user_id_hash = substring(encode(digest(user_id::text, 'sha256'), 'hex'), 1, 64)
WHERE user_id IS NOT NULL AND user_id_hash IS NULL;

UPDATE messages 
SET user_id_hash = substring(encode(digest(user_id::text, 'sha256'), 'hex'), 1, 64)
WHERE user_id IS NOT NULL AND user_id_hash IS NULL;

UPDATE pending_migrations 
SET temp_user_id_hash = substring(encode(digest(temp_user_id::text, 'sha256'), 'hex'), 1, 64)
WHERE temp_user_id IS NOT NULL AND temp_user_id_hash IS NULL;

UPDATE security 
SET user_id_hash = substring(encode(digest(user_id::text, 'sha256'), 'hex'), 1, 64)
WHERE user_id IS NOT NULL AND user_id_hash IS NULL;

UPDATE security_sessions 
SET user_id_hash = substring(encode(digest(user_id::text, 'sha256'), 'hex'), 1, 64)
WHERE user_id IS NOT NULL AND user_id_hash IS NULL;

UPDATE user_2fa_codes 
SET user_id_hash = substring(encode(digest(user_id::text, 'sha256'), 'hex'), 1, 64)
WHERE user_id IS NOT NULL AND user_id_hash IS NULL;

UPDATE user_2fa_settings 
SET user_id_hash = substring(encode(digest(user_id::text, 'sha256'), 'hex'), 1, 64)
WHERE user_id IS NOT NULL AND user_id_hash IS NULL;

UPDATE user_astrology 
SET user_id_hash = substring(encode(digest(user_id::text, 'sha256'), 'hex'), 1, 64)
WHERE user_id IS NOT NULL AND user_id_hash IS NULL;

UPDATE user_violations 
SET user_id_hash = substring(encode(digest(user_id::text, 'sha256'), 'hex'), 1, 64)
WHERE user_id IS NOT NULL AND user_id_hash IS NULL;

UPDATE verification_codes 
SET user_id_hash = substring(encode(digest(user_id::text, 'sha256'), 'hex'), 1, 64)
WHERE user_id IS NOT NULL AND user_id_hash IS NULL;

-- ========== VERIFY MIGRATION ==========

SELECT '[MIGRATION 024] Hashing complete. Verification:' as status;
SELECT 'audit_log hashed:' as table_name, COUNT(*) as count FROM audit_log WHERE user_id_hash IS NOT NULL
UNION ALL
SELECT 'messages hashed:', COUNT(*) FROM messages WHERE user_id_hash IS NOT NULL
UNION ALL
SELECT 'pending_migrations hashed:', COUNT(*) FROM pending_migrations WHERE temp_user_id_hash IS NOT NULL
UNION ALL
SELECT 'security hashed:', COUNT(*) FROM security WHERE user_id_hash IS NOT NULL
UNION ALL
SELECT 'security_sessions hashed:', COUNT(*) FROM security_sessions WHERE user_id_hash IS NOT NULL
UNION ALL
SELECT 'user_2fa_codes hashed:', COUNT(*) FROM user_2fa_codes WHERE user_id_hash IS NOT NULL
UNION ALL
SELECT 'user_2fa_settings hashed:', COUNT(*) FROM user_2fa_settings WHERE user_id_hash IS NOT NULL
UNION ALL
SELECT 'user_astrology hashed:', COUNT(*) FROM user_astrology WHERE user_id_hash IS NOT NULL
UNION ALL
SELECT 'user_violations hashed:', COUNT(*) FROM user_violations WHERE user_id_hash IS NOT NULL
UNION ALL
SELECT 'verification_codes hashed:', COUNT(*) FROM verification_codes WHERE user_id_hash IS NOT NULL;

-- ========== DOCUMENTATION ==========

SELECT '[MIGRATION 024] ✅ user_id hashing migration complete!' as status;
SELECT 'Next steps: Update application code to write user_id_hash on all inserts' as next_step;
