/**
 * Constants for Subscription Validation
 */

// Subscription statuses that allow access
export const VALID_SUBSCRIPTION_STATUSES = ['active', 'trialing'];

// Subscription statuses
export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  TRIALING: 'trialing',
  PAST_DUE: 'past_due',
  CANCELED: 'canceled',
  UNPAID: 'unpaid',
  INCOMPLETE: 'incomplete',
  INCOMPLETE_EXPIRED: 'incomplete_expired',
  PAUSED: 'paused',
  NONE: 'none',
  UNKNOWN: 'unknown',
  ERROR: 'error'
};

// Reason codes for validation failures
export const VALIDATION_REASON = {
  NO_SUBSCRIPTION: 'NO_SUBSCRIPTION',
  NO_CUSTOMER: 'NO_CUSTOMER',
  NO_PAYMENT_METHOD: 'NO_PAYMENT_METHOD',
  CARD_EXPIRED: 'CARD_EXPIRED',
  STRIPE_ERROR: 'STRIPE_ERROR',
  STRIPE_API_ERROR: 'STRIPE_API_ERROR',
  INVALID_USER_ID: 'INVALID_USER_ID',
  ENCRYPTION_ERROR: 'ENCRYPTION_ERROR'
};

// Database column names
export const DB_COLUMNS = {
  USER_ID: 'user_id',
  STRIPE_SUBSCRIPTION_ID_ENCRYPTED: 'stripe_subscription_id_encrypted',
  STRIPE_CUSTOMER_ID_ENCRYPTED: 'stripe_customer_id_encrypted',
  SUBSCRIPTION_STATUS: 'subscription_status',
  CURRENT_PERIOD_START: 'current_period_start',
  CURRENT_PERIOD_END: 'current_period_end',
  LAST_STATUS_CHECK_AT: 'last_status_check_at',
  UPDATED_AT: 'updated_at'
};

// User-friendly messages
export const BLOCKED_MESSAGES = {
  NO_SUBSCRIPTION: 'No active subscription. Please create one to continue.',
  STRIPE_API_ERROR: 'We cannot verify your subscription. Please try again or contact support.',
  NO_PAYMENT_METHOD: 'No payment method on file. Please add one to continue.',
  CARD_EXPIRED: 'Your payment method has expired. Please update it to continue.',
  PAYMENT_VERIFICATION_ERROR: 'We cannot verify your payment method. Please try again or contact support.',
  DEFAULT: 'Your subscription needs attention. Please check your billing.'
};

// Payment method types
export const PAYMENT_METHOD_TYPE = {
  CARD: 'card',
  US_BANK_ACCOUNT: 'us_bank_account',
  SEPA_DEBIT: 'sepa_debit'
};

// Cache configuration (in seconds)
export const CACHE_TTL = {
  SUBSCRIPTION_STATUS: 300, // 5 minutes
  PAYMENT_METHOD: 300 // 5 minutes
};
