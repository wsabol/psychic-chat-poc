-- Migrate free_trial_whitelist table: user_id -> user_id_hash
-- This updates the column name to match the hashing security pattern

-- Rename user_id to user_id_hash
ALTER TABLE free_trial_whitelist 
RENAME COLUMN user_id TO user_id_hash;

-- Update the index name to match
DROP INDEX IF EXISTS idx_free_trial_whitelist_user_id;
DROP INDEX IF EXISTS idx_free_trial_whitelist_user_active;

CREATE INDEX IF NOT EXISTS idx_free_trial_whitelist_user_id_hash 
ON free_trial_whitelist(user_id_hash);

CREATE INDEX IF NOT EXISTS idx_free_trial_whitelist_user_hash_active 
ON free_trial_whitelist(user_id_hash, is_active);

-- Verify the change
SELECT 'Migration completed successfully!' AS status;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'free_trial_whitelist'
ORDER BY ordinal_position;
