/**
 * SMS Templates for Billing Notifications
 * Centralized SMS message templates
 */

/**
 * SMS message templates for billing events
 */
export const SMS_TEMPLATES = {
  PAYMENT_FAILED: (stripePortalLink) => 
    `Your Starship Psychics payment failed. Please update your payment method: ${stripePortalLink}`,
  
  SUBSCRIPTION_CANCELLED: (stripePortalLink) => 
    `Your Starship Psychics subscription has been cancelled. Reactivate anytime: ${stripePortalLink}`,
  
  PAYMENT_METHOD_INVALID: (stripePortalLink) => 
    `Your Starship Psychics payment method has expired. Please update it: ${stripePortalLink}`,
  
  SUBSCRIPTION_PAST_DUE: (stripePortalLink) => 
    `Your Starship Psychics payment is overdue. Please update your payment method: ${stripePortalLink}`,
  
  SUBSCRIPTION_INCOMPLETE: (stripePortalLink) => 
    `Your Starship Psychics subscription setup is incomplete. Complete it now: ${stripePortalLink}`,
  
  SUBSCRIPTION_CHECK_FAILED: (message) => 
    `Starship Psychics: ${message}`,
  
  SUBSCRIPTION_EXPIRING: (daysRemaining) => 
    `Starship Psychics: Your subscription expires in ${daysRemaining} days. Renew now to avoid service interruption.`
};

/**
 * Get SMS message for billing event
 * @param {string} eventType - The billing event type
 * @param {Object} data - Data for the message template
 * @returns {string} SMS message
 */
export function getSMSMessage(eventType, data = {}) {
  const template = SMS_TEMPLATES[eventType];
  
  if (!template) {
    return `Starship Psychics: Please check your account for important billing updates.`;
  }
  
  // Handle different template parameter structures
  if (eventType === 'SUBSCRIPTION_CHECK_FAILED') {
    return template(data.message || 'Please check your subscription status.');
  } else if (eventType === 'SUBSCRIPTION_EXPIRING') {
    return template(data.daysRemaining || 7);
  } else {
    return template(data.stripePortalLink || 'https://billing.stripe.com/');
  }
}
