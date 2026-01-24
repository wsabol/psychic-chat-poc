-- Migration: Add price_change_notifications table
-- Purpose: Track subscription price change notifications sent to users
-- Date: 2026-01-24

-- TABLE: price_change_notifications
-- Tracks when users are notified about subscription price changes
-- Links to user via user_id, stores old/new prices, interval type, and notification timestamp
CREATE TABLE IF NOT EXISTS price_change_notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    old_price_id VARCHAR(100),
    new_price_id VARCHAR(100),
    old_price_amount INTEGER NOT NULL,
    new_price_amount INTEGER NOT NULL,
    price_interval VARCHAR(20) NOT NULL,
    effective_date TIMESTAMP NOT NULL,
    notified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    email_sent BOOLEAN DEFAULT TRUE,
    migration_completed BOOLEAN DEFAULT FALSE,
    migration_completed_at TIMESTAMP NULL,
    CONSTRAINT fk_user_id FOREIGN KEY (user_id) 
        REFERENCES user_personal_info(id) 
        ON DELETE CASCADE
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_price_notifications_user_id ON price_change_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_price_notifications_interval ON price_change_notifications(price_interval);
CREATE INDEX IF NOT EXISTS idx_price_notifications_notified_at ON price_change_notifications(notified_at);
CREATE INDEX IF NOT EXISTS idx_price_notifications_effective_date ON price_change_notifications(effective_date);
CREATE INDEX IF NOT EXISTS idx_price_notifications_migration ON price_change_notifications(migration_completed);

-- Comments for documentation
COMMENT ON TABLE price_change_notifications IS 'Tracks subscription price change notifications and migration status';
COMMENT ON COLUMN price_change_notifications.user_id IS 'References user_personal_info.id (database ID, not user_id hash)';
COMMENT ON COLUMN price_change_notifications.old_price_id IS 'Stripe price ID before change';
COMMENT ON COLUMN price_change_notifications.new_price_id IS 'Stripe price ID after change';
COMMENT ON COLUMN price_change_notifications.old_price_amount IS 'Previous price in cents';
COMMENT ON COLUMN price_change_notifications.new_price_amount IS 'New price in cents';
COMMENT ON COLUMN price_change_notifications.price_interval IS 'month or year';
COMMENT ON COLUMN price_change_notifications.effective_date IS 'When the price change takes effect (next billing date)';
COMMENT ON COLUMN price_change_notifications.migration_completed IS 'Whether the subscription was successfully migrated to new price';
