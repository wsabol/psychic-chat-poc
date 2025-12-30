-- Fix chat messages that were stored without language_code
-- This allows them to use the translated versions stored in content_full_lang_encrypted

-- Update all assistant messages (chat responses) to have language_code populated
-- based on the user's current language preference

UPDATE messages m
SET language_code = up.language
FROM user_preferences up
WHERE m.user_id_hash = up.user_id_hash
AND m.role = 'assistant'
AND m.language_code IS NULL
AND up.language IS NOT NULL;

-- Verify the update
SELECT COUNT(*) as messages_updated FROM messages WHERE role = 'assistant' AND language_code IS NOT NULL;
