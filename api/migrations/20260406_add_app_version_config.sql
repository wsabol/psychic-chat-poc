-- ─── app_version_config ───────────────────────────────────────────────────────
-- Stores the current "latest" and "minimum supported" version strings for the
-- Starship Psychics mobile app.  A single row (id = 1) is always maintained.
--
-- Used by:
--   GET  /app/version              — public endpoint, read-only
--   GET  /admin/app/version-config — admin read
--   POST /admin/app/set-version    — admin write (also optionally fires email blast)
--
-- Version format: semver-style string "MAJOR.MINOR.PATCH" (e.g. "3.3.26")
-- Must match the versionName in android/app/build.gradle and
--   CFBundleShortVersionString in ios/StarshipPsychicsMobile/Info.plist.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS app_version_config (
    id                 INTEGER       PRIMARY KEY DEFAULT 1,
    latest_version     VARCHAR(20)   NOT NULL DEFAULT '3.4.3',
    minimum_version    VARCHAR(20)   NOT NULL DEFAULT '3.0.0',
    android_store_url  TEXT          NOT NULL DEFAULT 'https://play.google.com/store/apps/details?id=com.starshippsychicsmobile',
    ios_store_url      TEXT          NOT NULL DEFAULT '',
    release_notes      TEXT,
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_by         TEXT          -- Firebase UID of the admin who last changed this
);

-- Enforce the single-row invariant.
-- CHECK constraint ensures only id = 1 can ever be inserted.
ALTER TABLE app_version_config
    ADD CONSTRAINT app_version_config_single_row CHECK (id = 1);

-- Seed with the current release values.
INSERT INTO app_version_config (id, latest_version, minimum_version)
VALUES (1, '3.4.3', '3.0.0')
ON CONFLICT (id) DO NOTHING;
