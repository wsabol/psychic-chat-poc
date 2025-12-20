-- Add onboarding progress tracking to user_personal_info
ALTER TABLE user_personal_info
ADD COLUMN IF NOT EXISTS onboarding_step VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_started_at TIMESTAMP DEFAULT NULL,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP DEFAULT NULL;

-- Create indexes for onboarding queries
CREATE INDEX IF NOT EXISTS idx_onboarding_step ON user_personal_info(onboarding_step);
CREATE INDEX IF NOT EXISTS idx_onboarding_completed ON user_personal_info(onboarding_completed);

-- Mark existing users as having completed onboarding (they're established users)
UPDATE user_personal_info 
SET onboarding_completed = TRUE,
    onboarding_step = NULL,
    onboarding_completed_at = COALESCE(onboarding_completed_at, NOW())
WHERE onboarding_completed IS NOT TRUE;
