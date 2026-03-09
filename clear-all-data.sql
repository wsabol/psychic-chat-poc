-- ========================================
-- CLEAR ALL DATABASE DATA
-- ========================================
-- This script removes ALL data from ALL tables while preserving table structure
-- WARNING: This is IRREVERSIBLE - make sure you have a backup!
-- Last Updated: 2026-03-09
--
-- HOW FK CONSTRAINTS ARE HANDLED:
--   SET session_replication_role = 'replica'  disables ALL FK-trigger enforcement
--   for the duration of the session.  This means we do NOT need CASCADE on the
--   TRUNCATE — and intentionally omit it.
--
--   Using TRUNCATE … CASCADE while also listing every table explicitly confuses
--   pgAdmin's dependency-graph resolver: it sees that price_change_notifications
--   already appears in the truncate list AND would be pulled in again via the
--   ON DELETE CASCADE FK from user_personal_info, and incorrectly reports a
--   "circular reference detected" error.
--
--   Solution: rely solely on session_replication_role = 'replica' to bypass FK
--   checks and drop CASCADE from the TRUNCATE.  Both mechanisms together are
--   redundant and the combination triggers the pgAdmin false-positive.

-- Disable ALL foreign-key trigger enforcement for this session
SET session_replication_role = 'replica';

-- ========================================
-- TRUNCATE ALL TABLES (single statement)
-- ========================================
DO $$
DECLARE
    tables_to_truncate TEXT[] := ARRAY[
        -- Session / auth
        'user_sessions',
        'security_sessions',
        'verification_codes',
        'sms_verification_codes',
        'sms_verification_attempts',
        'sms_opt_outs',
        'user_2fa_codes',
        -- Free trial
        'free_trial_sessions',
        'free_trial_whitelist',
        -- Audit / logging
        'audit_log',
        'error_logs',
        'app_analytics',
        'login_attempts',
        'user_login_attempts',
        'admin_login_attempts',
        'admin_trusted_ips',
        -- Messaging
        'messages',
        -- User profile / settings / preferences
        'user_preferences',
        'user_settings',
        'user_astrology',
        'user_2fa_settings',
        'user_consents',
        -- Compliance / security
        'user_violations',
        'user_account_lockouts',
        'account_deletion_audit',
        'security',
        'pending_migrations',
        -- Billing (FK child before FK parent)
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
    -- NOTE: CASCADE is intentionally omitted here.
    --   session_replication_role = 'replica' (set above) already disables all
    --   FK trigger checks, so CASCADE is not needed.  Including CASCADE while
    --   every table is also listed explicitly causes pgAdmin's dependency
    --   resolver to report a false "circular reference detected" error because
    --   price_change_notifications is both in the explicit list AND would be
    --   pulled in again by the ON DELETE CASCADE FK from user_personal_info.
    sql := 'TRUNCATE TABLE '
        || array_to_string(existing_tables, ', ')
        || ' RESTART IDENTITY';

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
