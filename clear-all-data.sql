-- ========================================
-- CLEAR ALL DATABASE DATA
-- ========================================
-- This script removes ALL data from ALL tables while preserving table structure
-- WARNING: This is IRREVERSIBLE - make sure you have a backup!
-- Last Updated: 2026-03-08
--
-- FIX: Circular-reference error is solved by issuing ONE TRUNCATE statement
-- for all tables simultaneously.  PostgreSQL can resolve any FK cycle (including
-- A→B→A) when every participating table is listed in the same TRUNCATE command.
-- Doing it one-by-one in a loop causes cascades to partially truncate tables
-- that are encountered again later, triggering the circular-reference error.

-- Disable foreign key checks temporarily
SET session_replication_role = 'replica';

-- ========================================
-- TRUNCATE ALL TABLES (single statement)
-- ========================================
DO $$
DECLARE
    tables_to_truncate TEXT[] := ARRAY[
        'user_sessions',
        'security_sessions',
        'verification_codes',
        'sms_verification_codes',
        'sms_verification_attempts',
        'sms_opt_outs',
        'sms_inbound_log',
        'user_2fa_codes',
        'free_trial_sessions',
        'free_trial_whitelist',
        'temp_accounts',
        'audit_log',
        'error_logs',
        'app_analytics',
        'login_attempts',
        'user_login_attempts',
        'admin_login_attempts',
        'admin_trusted_ips',
        'user_account_location_log',
        'messages',
        'message_queue',
        'chat_messages',
        'horoscopes',
        'moon_phase_commentary',
        'cosmic_weather_insights',
        'user_preferences',
        'user_settings',
        'user_astrology',
        'user_2fa_settings',
        'user_consents',
        'user_violations',
        'user_account_lockouts',
        'account_deletion_audit',
        'violation_reports',
        'user_devices',
        'security',
        'pending_migrations',
        'price_change_notifications',
        'user_personal_info'
    ];
    existing_tables TEXT[];
    tbl             TEXT;
    sql             TEXT;
BEGIN
    -- Collect only tables that actually exist in the public schema
    existing_tables := ARRAY[]::TEXT[];

    FOREACH tbl IN ARRAY tables_to_truncate
    LOOP
        IF EXISTS (
            SELECT 1 FROM pg_tables
            WHERE schemaname = 'public' AND tablename = tbl
        ) THEN
            existing_tables := existing_tables || tbl;
        ELSE
            RAISE NOTICE 'Table does not exist (skipping): %', tbl;
        END IF;
    END LOOP;

    IF array_length(existing_tables, 1) IS NULL THEN
        RAISE NOTICE 'No tables found – nothing to truncate.';
        RETURN;
    END IF;

    -- Build and execute ONE TRUNCATE statement for all existing tables.
    -- A single statement lets PostgreSQL resolve any circular FK dependencies
    -- that would otherwise cause "ERROR: circular reference" when done one-by-one.
    sql := 'TRUNCATE TABLE '
        || array_to_string(existing_tables, ', ')
        || ' RESTART IDENTITY CASCADE';

    RAISE NOTICE 'Executing: %', sql;
    EXECUTE sql;

    RAISE NOTICE 'Successfully truncated % table(s).', array_length(existing_tables, 1);
END $$;

-- Re-enable foreign key checks
SET session_replication_role = 'origin';

-- ========================================
-- VERIFICATION: Count remaining records
-- ========================================
DO $$
DECLARE
    table_record RECORD;
    row_count    INTEGER;
    total_rows   INTEGER := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICATION: Checking table counts';
    RAISE NOTICE '========================================';

    FOR table_record IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename NOT LIKE 'pg_%'
        ORDER BY tablename
    LOOP
        EXECUTE 'SELECT COUNT(*) FROM ' || table_record.tablename INTO row_count;
        IF row_count > 0 THEN
            RAISE NOTICE '⚠️  Table % has % rows (Expected 0!)', table_record.tablename, row_count;
            total_rows := total_rows + row_count;
        END IF;
    END LOOP;

    RAISE NOTICE '========================================';
    IF total_rows = 0 THEN
        RAISE NOTICE '✅ All data cleared successfully!';
        RAISE NOTICE '✅ Table structures preserved';
        RAISE NOTICE '✅ Sequences reset to 1';
        RAISE NOTICE '✅ Database ready for fresh start';
    ELSE
        RAISE NOTICE '⚠️  Warning: % rows remain across tables', total_rows;
    END IF;
    RAISE NOTICE '========================================';
END $$;
