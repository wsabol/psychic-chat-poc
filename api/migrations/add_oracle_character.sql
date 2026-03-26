-- Migration: Add oracle_character support
-- Date: 2026-03-26
-- Phase: 5.0 — Oracle Character Selection
--
-- Adds oracle_character to user_preferences and messages tables.
-- Safe to run on existing production database (all operations are idempotent).

-- ── user_preferences ─────────────────────────────────────────────────────────

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS oracle_character VARCHAR(30) DEFAULT 'sage';

CREATE INDEX IF NOT EXISTS idx_user_preferences_oracle_character
  ON user_preferences(oracle_character);

-- Backfill existing rows with default character
UPDATE user_preferences
  SET oracle_character = 'sage'
  WHERE oracle_character IS NULL;

-- ── messages ─────────────────────────────────────────────────────────────────

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS oracle_character VARCHAR(30) DEFAULT 'sage';

CREATE INDEX IF NOT EXISTS idx_messages_oracle_character
  ON messages(oracle_character);

-- Backfill existing messages with default character (historical messages are "sage")
UPDATE messages
  SET oracle_character = 'sage'
  WHERE oracle_character IS NULL;
