-- Migration: add index on free_trial_sessions.started_at
-- Date: 2026-04-05
--
-- Root cause of crashes:
--   tempAccountCleanupJob.js and cleanup.js both queried
--   `WHERE created_at < $1` against free_trial_sessions, but that table
--   has no `created_at` column — only `started_at`.
--   This caused a PostgreSQL "column does not exist" error on every
--   cleanup run, surfacing as crashes in Firebase Crashlytics.
--
-- Code fix (already applied):
--   • api/jobs/tempAccountCleanupJob.js  – created_at → started_at (×4)
--   • api/routes/cleanup.js              – created_at → started_at (×1)
--
-- Schema fix (this migration):
--   Add the missing index so cleanup DELETE / SELECT queries on started_at
--   run efficiently instead of doing full table scans.

CREATE INDEX IF NOT EXISTS idx_free_trial_sessions_started_at
    ON free_trial_sessions(started_at);
