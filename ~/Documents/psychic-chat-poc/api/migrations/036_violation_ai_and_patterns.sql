-- Migration: Add AI-based violation analysis and pattern detection
-- Purpose: Improve detection accuracy and identify violation patterns for monitoring

-- Add AI analysis column to user_violations
ALTER TABLE user_violations
ADD COLUMN IF NOT EXISTS ai_analysis JSONB,
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS reported_as_false_positive BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS false_positive_reason TEXT;

-- Create index for false positive tracking
CREATE INDEX IF NOT EXISTS idx_user_violations_false_positive ON user_violations(reported_as_false_positive);
CREATE INDEX IF NOT EXISTS idx_user_violations_confidence ON user_violations(confidence_score);

-- New table: Pattern detection results
CREATE TABLE IF NOT EXISTS violation_patterns (
    id SERIAL PRIMARY KEY,
    pattern_type VARCHAR(50) NOT NULL,
    violation_type VARCHAR(50) NOT NULL,
    pattern_description TEXT,
    user_id_hash VARCHAR(255),
    violation_ids TEXT, -- comma-separated list of violation IDs in pattern
    violation_count INT DEFAULT 1,
    time_window_hours INT DEFAULT 24,
    severity VARCHAR(20) DEFAULT 'medium',
    pattern_score DECIMAL(3,2) DEFAULT 0.5,
    requires_manual_review BOOLEAN DEFAULT FALSE,
    manual_review_notes TEXT,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_violation_patterns_user_hash ON violation_patterns(user_id_hash);
CREATE INDEX IF NOT EXISTS idx_violation_patterns_type ON violation_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_violation_patterns_severity ON violation_patterns(severity);
CREATE INDEX IF NOT EXISTS idx_violation_patterns_requires_review ON violation_patterns(requires_manual_review, reviewed_at);

-- New table: Violation AI analysis cache (for trending analysis)
CREATE TABLE IF NOT EXISTS violation_ai_analysis (
    id SERIAL PRIMARY KEY,
    violation_type VARCHAR(50) NOT NULL,
    analysis_date DATE NOT NULL,
    total_violations INT DEFAULT 0,
    warnings_issued INT DEFAULT 0,
    suspensions_issued INT DEFAULT 0,
    permanent_bans INT DEFAULT 0,
    redemptions_successful INT DEFAULT 0,
    false_positives_reported INT DEFAULT 0,
    avg_confidence_score DECIMAL(3,2) DEFAULT 0.0,
    trending_keywords TEXT, -- JSON array of keywords
    report_metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_violation_ai_analysis_date ON violation_ai_analysis(analysis_date);
CREATE INDEX IF NOT EXISTS idx_violation_ai_analysis_type ON violation_ai_analysis(violation_type);

-- Table for tracking false positives and improving detection
CREATE TABLE IF NOT EXISTS violation_false_positives (
    id SERIAL PRIMARY KEY,
    violation_id INT NOT NULL REFERENCES user_violations(id) ON DELETE CASCADE,
    user_id_hash VARCHAR(255) NOT NULL,
    violation_type VARCHAR(50) NOT NULL,
    original_message TEXT,
    false_positive_reason VARCHAR(255),
    context_explanation TEXT,
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by VARCHAR(100),
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_false_positives_user_hash ON violation_false_positives(user_id_hash);
CREATE INDEX IF NOT EXISTS idx_false_positives_type ON violation_false_positives(violation_type);
CREATE INDEX IF NOT EXISTS idx_false_positives_resolved ON violation_false_positives(resolved_at);
