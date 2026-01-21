-- Create free_trial_whitelist table
-- Run this SQL in your PostgreSQL database to create the missing table

CREATE TABLE IF NOT EXISTS free_trial_whitelist (
    id SERIAL PRIMARY KEY,
    ip_address_hash TEXT NOT NULL UNIQUE,
    user_id_hash TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_whitelist_ip_hash 
ON free_trial_whitelist(ip_address_hash);

-- Verify table was created
SELECT 'Table created successfully!' AS status;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'free_trial_whitelist'
ORDER BY ordinal_position;
