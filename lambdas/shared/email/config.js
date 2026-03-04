/**
 * Email configuration and design tokens
 *
 * Single source of truth for brand config and Stripe status mappings
 * used across all Lambda email templates.
 *
 * Locale-independent — nothing here is translated.
 */

export const CONFIG = {
  fromEmail:    process.env.SENDGRID_FROM_EMAIL || 'noreply@starshippsychics.com',
  appBaseUrl:   process.env.APP_BASE_URL        || 'https://app.starshippsychics.com',
  supportEmail: 'support@starshippsychics.com',
  brandName:    'Starship Psychics',
  // Design tokens — locale-independent
  colors: {
    primary:           '#667eea',
    warning:           '#f59e0b',
    danger:            '#ef4444',
    success:           '#10b981',
    text:              '#333333',
    textLight:         '#666666',
    border:            '#dddddd',
    backgroundLight:   '#f5f5f5',
    backgroundWarning: '#fff3cd',
    borderWarning:     '#ffc107',
  },
};

/**
 * Maps Stripe subscription status strings to email header accent colours.
 * Uses CONFIG.colors so the design tokens stay in one place.
 */
export const SUBSCRIPTION_STATUS_COLORS = {
  past_due:   CONFIG.colors.warning,
  canceled:   CONFIG.colors.primary,
  incomplete: CONFIG.colors.warning,
  unpaid:     CONFIG.colors.danger,
};

/**
 * Maps Stripe status strings to the i18n section keys defined in
 * api/shared/email/i18n/<locale>.js.
 * Add a new entry here whenever a new Stripe status needs its own copy.
 */
export const SUBSCRIPTION_STATUS_TO_SECTION = {
  past_due:   'subscriptionPastDue',
  canceled:   'subscriptionCancelled',
  incomplete: 'subscriptionIncomplete',
  unpaid:     'subscriptionPastDue', // closest semantic match; give it its own section when needed
};
