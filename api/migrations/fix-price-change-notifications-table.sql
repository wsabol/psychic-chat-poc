-- Fix price_change_notifications table to use user_id_hash instead of user_id
-- This ensures we're storing the hashed user ID (SHA-256) not the database ID

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE price_change_notifications 
DROP CONSTRAINT IF EXISTS fk_user_id;

-- Step 2: Rename the column from user_id to user_id_hash for clarity
ALTER TABLE price_change_notifications 
RENAME COLUMN user_id TO user_id_hash;

-- Step 3: Change the column type to VARCHAR(64) to match SHA-256 hash length
ALTER TABLE price_change_notifications 
ALTER COLUMN user_id_hash TYPE VARCHAR(64);

-- Step 4: Add new foreign key constraint referencing user_personal_info(user_id)
-- This references the hashed user_id column in user_personal_info
ALTER TABLE price_change_notifications 
ADD CONSTRAINT fk_user_id_hash FOREIGN KEY (user_id_hash) 
REFERENCES user_personal_info(user_id) 
ON DELETE CASCADE;

-- Step 5: Drop and recreate the index with new column name
DROP INDEX IF EXISTS idx_price_notifications_user_id;
CREATE INDEX idx_price_notifications_user_id_hash ON price_change_notifications(user_id_hash);

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'price_change_notifications' 
ORDER BY ordinal_position;
