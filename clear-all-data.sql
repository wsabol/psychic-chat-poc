-- ========================================
-- CLEAR ALL DATABASE DATA
-- ========================================
-- This script removes ALL data from ALL tables while preserving table structure
-- WARNING: This is IRREVERSIBLE - make sure you have a backup!
-- Last Updated: 2026-02-02

-- Disable triggers temporarily to avoid constraint issues
SET session_replication_role = 'replica';

-- Clear all tables in the correct order (respecting foreign key constraints)
-- Starting with dependent tables first

-- ========================================
-- STEP 1: Clear session and temporary data
-- ========================================
TRUNCATE TABLE user_sessions CASCADE;
TRUNCATE TABLE security_sessions CASCADE;
TRUNCATE TABLE verification_codes CASCADE;
TRUNCATE TABLE sms_verification_codes CASCADE;
TRUNCATE TABLE sms_verification_attempts CASCADE;
TRUNCATE TABLE user_2fa_codes CASCADE;
TRUNCATE TABLE free_trial_sessions CASCADE;
TRUNCATE TABLE free_trial_whitelist CASCADE;

-- ========================================
-- STEP 2: Clear audit and logging tables
-- ========================================
TRUNCATE TABLE audit_log CASCADE;
TRUNCATE TABLE error_logs CASCADE;
TRUNCATE TABLE app_analytics CASCADE;
TRUNCATE TABLE login_attempts CASCADE;
TRUNCATE TABLE user_login_attempts CASCADE;
TRUNCATE TABLE admin_login_attempts CASCADE;
TRUNCATE TABLE admin_trusted_ips CASCADE;

-- ========================================
-- STEP 3: Clear message and communication data
-- ========================================
TRUNCATE TABLE messages CASCADE;
TRUNCATE TABLE message_queue CASCADE;

-- ========================================
-- STEP 4: Clear user-related data
-- ========================================
TRUNCATE TABLE user_preferences CASCADE;
TRUNCATE TABLE user_astrology CASCADE;
TRUNCATE TABLE user_2fa_settings CASCADE;
TRUNCATE TABLE user_consents CASCADE;
TRUNCATE TABLE user_violations CASCADE;
TRUNCATE TABLE user_account_lockouts CASCADE;
TRUNCATE TABLE account_deletion_audit CASCADE;

-- ========================================
-- STEP 5: Clear security and migration data
-- ========================================
TRUNCATE TABLE security CASCADE;
TRUNCATE TABLE pending_migrations CASCADE;

-- ========================================
-- STEP 6: Clear billing and subscription data
-- ========================================
TRUNCATE TABLE price_change_notifications CASCADE;

-- ========================================
-- STEP 7: Clear main user table (do this last)
-- ========================================
TRUNCATE TABLE user_personal_info CASCADE;

-- ========================================
-- STEP 8: Reset sequences (auto-increment counters)
-- ========================================
ALTER SEQUENCE user_personal_info_id_seq RESTART WITH 1;
ALTER SEQUENCE user_astrology_id_seq RESTART WITH 1;
ALTER SEQUENCE user_2fa_settings_id_seq RESTART WITH 1;
ALTER SEQUENCE user_2fa_codes_id_seq RESTART WITH 1;
ALTER SEQUENCE audit_log_id_seq RESTART WITH 1;
ALTER SEQUENCE pending_migrations_id_seq RESTART WITH 1;
ALTER SEQUENCE security_id_seq RESTART WITH 1;
ALTER SEQUENCE security_sessions_id_seq RESTART WITH 1;
ALTER SEQUENCE verification_codes_id_seq RESTART WITH 1;
ALTER SEQUENCE sms_verification_attempts_id_seq RESTART WITH 1;
ALTER SEQUENCE sms_verification_codes_id_seq RESTART WITH 1;
ALTER SEQUENCE user_violations_id_seq RESTART WITH 1;
ALTER SEQUENCE user_account_lockouts_id_seq RESTART WITH 1;
ALTER SEQUENCE user_consents_id_seq RESTART WITH 1;
ALTER SEQUENCE user_login_attempts_id_seq RESTART WITH 1;
ALTER SEQUENCE login_attempts_id_seq RESTART WITH 1;
ALTER SEQUENCE user_sessions_id_seq RESTART WITH 1;
ALTER SEQUENCE account_deletion_audit_id_seq RESTART WITH 1;
ALTER SEQUENCE user_preferences_id_seq RESTART WITH 1;
ALTER SEQUENCE messages_id_seq RESTART WITH 1;
ALTER SEQUENCE app_analytics_id_seq RESTART WITH 1;
ALTER SEQUENCE error_logs_id_seq RESTART WITH 1;
ALTER SEQUENCE admin_trusted_ips_id_seq RESTART WITH 1;
ALTER SEQUENCE admin_login_attempts_id_seq RESTART WITH 1;
ALTER SEQUENCE free_trial_whitelist_id_seq RESTART WITH 1;
ALTER SEQUENCE price_change_notifications_id_seq RESTART WITH 1;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- ========================================
-- VERIFICATION: Count remaining records
-- ========================================
SELECT 'user_personal_info' as table_name, COUNT(*) as record_count FROM user_personal_info
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'audit_log', COUNT(*) FROM audit_log
UNION ALL
SELECT 'user_sessions', COUNT(*) FROM user_sessions
UNION ALL
SELECT 'security_sessions', COUNT(*) FROM security_sessions
UNION ALL
SELECT 'error_logs', COUNT(*) FROM error_logs
UNION ALL
SELECT 'app_analytics', COUNT(*) FROM app_analytics
UNION ALL
SELECT 'free_trial_sessions', COUNT(*) FROM free_trial_sessions
ORDER BY table_name;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================
DO $$
BEGIN
    RAISE NOTICE '✅ All data cleared successfully!';
    RAISE NOTICE '✅ Table structures preserved';
    RAISE NOTICE '✅ Sequences reset to 1';
    RAISE NOTICE '✅ Database ready for fresh start';
END $$;
