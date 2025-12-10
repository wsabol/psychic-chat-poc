-- Re-encrypt all messages with the real key
BEGIN;

UPDATE messages 
SET content_encrypted = pgp_sym_encrypt(
    pgp_sym_decrypt(content_encrypted, 'default_key'), 
    ''
)
WHERE content_encrypted IS NOT NULL;

-- Verify migration worked
SELECT 
  COUNT(*) as total_messages,
  COUNT(CASE WHEN content_encrypted IS NOT NULL THEN 1 END) as encrypted_count
FROM messages;

COMMIT;
