-- ============================================================
-- Migration: add ip_hash to admin_trusted_ips
-- Fix: 2FA required even for trusted IPs on app.starshippsychics.com
--
-- HOW TO RUN IN pgAdmin:
--   1. Open a Query Tool on the psychic_chat database
--   2. Run ONLY the "STEP 1" block first — click Execute, wait for success
--   3. Then replace YOUR_ENCRYPTION_KEY_HERE with the real key
--      and run the "STEP 2" block
-- ============================================================


-- ============================================================
-- STEP 1: Add column + indexes  (run this first, then commit)
-- ============================================================

ALTER TABLE admin_trusted_ips
  ADD COLUMN IF NOT EXISTS ip_hash VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_admin_trusted_ips_ip_hash
  ON admin_trusted_ips (user_id_hash, ip_hash)
  WHERE ip_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_trusted_ips_ip_hash_unique
  ON admin_trusted_ips (user_id_hash, ip_hash)
  WHERE ip_hash IS NOT NULL;


-- ============================================================
-- STEP 2: Backfill existing rows  (run AFTER step 1 succeeds)
--
-- Replace YOUR_ENCRYPTION_KEY_HERE with the actual value
-- from AWS Secrets Manager before running.
-- ============================================================

SELECT set_config('app.encryption_key', 'YOUR_ENCRYPTION_KEY_HERE', false);

DO $$
DECLARE
  r       RECORD;
  raw_ip  TEXT;
  ip_h    TEXT;
BEGIN
  FOR r IN
    SELECT id,
           pgp_sym_decrypt(ip_address_encrypted,
             current_setting('<+yML2ch5noR0fSWY9ZgiXUDYhQ+Q5H7denLcMQPFeDghkQvA9/ZAEbhFIwbJX5vNu5HApBpOhXQkCFAnim/5WA==>')) AS decrypted_ip
      FROM admin_trusted_ips
     WHERE ip_address_encrypted IS NOT NULL
  LOOP
    raw_ip := trim(r.decrypted_ip);
    IF raw_ip IS NULL OR raw_ip = '' THEN CONTINUE; END IF;

    -- Normalise: strip IPv4-mapped prefix, convert ::1 to localhost, lowercase
    IF raw_ip ~ '^::ffff:(\d{1,3}\.){3}\d{1,3}$' THEN
      raw_ip := substring(raw_ip FROM 8);
    END IF;
    IF raw_ip = '::1' THEN raw_ip := 'localhost'; END IF;
    raw_ip := lower(raw_ip);

    ip_h := encode(digest(raw_ip, 'sha256'), 'hex');

    BEGIN
      UPDATE admin_trusted_ips SET ip_hash = ip_h WHERE id = r.id;
    EXCEPTION WHEN unique_violation THEN
      -- Duplicate IP for this user — soft-delete the older duplicate
      UPDATE admin_trusted_ips SET is_trusted = FALSE WHERE id = r.id;
      RAISE NOTICE 'Duplicate IP row id=% marked is_trusted=false', r.id;
    END;
  END LOOP;

  RAISE NOTICE 'Backfill complete.';
END;
$$;
