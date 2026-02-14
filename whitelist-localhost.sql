-- Whitelist localhost IP for unlimited free trial testing
-- Run this SQL against your database to allow unlimited trials from localhost

-- First, get the hash of localhost IP
-- The hash for 127.0.0.1 is: c81e728d9d4c2f636f067f89cc14862c (first 64 chars of SHA256)

INSERT INTO free_trial_whitelist 
  (ip_address_hash, ip_address_encrypted, device_name, browser_info, user_id_hash, is_active)
VALUES 
  (
    ENCODE(DIGEST('127.0.0.1', 'sha256'), 'hex'),
    pgp_sym_encrypt('127.0.0.1', current_setting('my.encryption_key')),
    'Localhost Development',
    'Development Environment',
    ENCODE(DIGEST('dev-localhost', 'sha256'), 'hex'),
    true
  ),
  (
    ENCODE(DIGEST('::1', 'sha256'), 'hex'),
    pgp_sym_encrypt('::1', current_setting('my.encryption_key')),
    'Localhost IPv6',
    'Development Environment',
    ENCODE(DIGEST('dev-localhost-ipv6', 'sha256'), 'hex'),
    true
  )
ON CONFLICT (ip_address_hash) DO UPDATE 
  SET is_active = true, 
      last_used_at = NOW();
