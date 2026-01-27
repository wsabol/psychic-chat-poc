/**
 * Type Definitions for Subscription Validator
 * Using JSDoc for type safety without TypeScript
 */

/**
 * @typedef {Object} SubscriptionValidationResult
 * @property {boolean} valid - Whether the subscription is valid
 * @property {string} status - Current subscription status
 * @property {string} [error] - Error message if validation failed
 * @property {string} [reason] - Machine-readable reason code
 * @property {SubscriptionDetails} [subscription] - Detailed subscription info
 */

/**
 * @typedef {Object} SubscriptionDetails
 * @property {string} id - Stripe subscription ID
 * @property {string} status - Subscription status
 * @property {number} current_period_start - Unix timestamp
 * @property {number} current_period_end - Unix timestamp
 * @property {boolean} cancel_at_period_end - Whether subscription will cancel
 * @property {Object} [cancellation_details] - Cancellation details from Stripe
 */

/**
 * @typedef {Object} PaymentMethodValidationResult
 * @property {boolean} valid - Whether the payment method is valid
 * @property {string} [error] - Error message if validation failed
 * @property {string} [reason] - Machine-readable reason code
 * @property {PaymentMethodDetails} [paymentMethod] - Detailed payment method info
 * @property {string} [lastFour] - Last 4 digits of card (for expired cards)
 */

/**
 * @typedef {Object} PaymentMethodDetails
 * @property {string} id - Stripe payment method ID
 * @property {string} type - Payment method type (card, us_bank_account, etc.)
 * @property {string|null} lastFour - Last 4 digits (for cards)
 */

/**
 * @typedef {Object} SubscriptionHealthResult
 * @property {boolean} healthy - Overall health status
 * @property {SubscriptionValidationResult} subscription - Subscription validation details
 * @property {PaymentMethodValidationResult} paymentMethod - Payment method validation details
 * @property {string|null} blockedReason - Reason code if not healthy
 * @property {string|null} blockedMessage - User-friendly message if not healthy
 */

/**
 * @typedef {Object} CachedSubscriptionStatus
 * @property {string} status - Subscription status from cache
 * @property {number} current_period_start - Unix timestamp
 * @property {number} current_period_end - Unix timestamp
 * @property {Date} lastCheckAt - When status was last checked
 */

/**
 * @typedef {Object} SubscriptionStatusUpdate
 * @property {string} status - New subscription status
 * @property {number} current_period_start - Unix timestamp
 * @property {number} current_period_end - Unix timestamp
 */

/**
 * @typedef {Object} DatabaseQueryResult
 * @property {boolean} success - Whether query succeeded
 * @property {*} [data] - Query result data
 * @property {string} [error] - Error message if failed
 * @property {string} [reason] - Machine-readable reason code
 */

export {};
