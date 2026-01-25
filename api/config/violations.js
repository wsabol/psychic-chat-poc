/**
 * Violations Configuration
 * Constants for violation reporting and monitoring
 */

export const VIOLATIONS_CONFIG = {
  // Violation types that allow redemption
  REDEEMABLE_TYPES: ['abusive_language', 'sexual_content'],
  
  // Time windows for analysis
  PATTERN_TIME_WINDOW: '30 days',
  TREND_TIME_WINDOW: '30 days',
  
  // Limits for reporting
  TOP_REASONS_LIMIT: 10,
  TRENDING_KEYWORDS_LIMIT: 20,
  DATA_PERIOD_DAYS: 90,
  
  // Violation severity levels
  SEVERITY_LEVELS: {
    WARNING: 1,
    SUSPENSION: 2,
    PERMANENT_BAN: 3
  },
  
  // Violation types
  TYPES: {
    ABUSIVE_LANGUAGE: 'abusive_language',
    SEXUAL_CONTENT: 'sexual_content',
    HARASSMENT: 'harassment',
    SPAM: 'spam',
    IMPERSONATION: 'impersonation'
  }
};

export default VIOLATIONS_CONFIG;
