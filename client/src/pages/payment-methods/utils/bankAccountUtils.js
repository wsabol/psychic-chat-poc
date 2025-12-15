/**
 * Utility functions for bank account operations
 */

/**
 * Get client IP address from ipify API
 * Falls back to 127.0.0.1 if request fails
 */
export async function getClientIpAddress() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || '127.0.0.1';
  } catch (error) {
    console.warn('[BANK_UTILS] Could not fetch client IP, using fallback:', error.message);
    return '127.0.0.1';
  }
}

/**
 * Get client user agent
 */
export function getClientUserAgent() {
  return navigator.userAgent;
}

/**
 * Extract account details from Financial Connections account
 */
export function extractAccountDetails(account) {
  return {
    id: account.id,
    bankName: account.institution_name || 'Your Bank',
    accountLast4: account.last4,
  };
}

/**
 * Validate SetupIntent response
 */
export function validateSetupIntentResponse(data) {
  if (!data.setupIntentId || !data.clientSecret) {
    throw new Error('Invalid SetupIntent response: missing setupIntentId or clientSecret');
  }
  return {
    setupIntentId: data.setupIntentId,
    clientSecret: data.clientSecret,
  };
}

/**
 * Validate Financial Connections session response
 */
export function validateFinancialConnectionsResponse(data) {
  if (!data.sessionId || !data.clientSecret) {
    throw new Error('Invalid Financial Connections response: missing sessionId or clientSecret');
  }
  return {
    sessionId: data.sessionId,
    clientSecret: data.clientSecret,
  };
}

/**
 * Validate linked accounts response
 */
export function validateAccountsResponse(data) {
  if (!data.accounts || !Array.isArray(data.accounts.data) || data.accounts.data.length === 0) {
    throw new Error('No bank accounts were selected');
  }
  return data.accounts.data;
}

/**
 * Validate payment method creation response
 */
export function validatePaymentMethodResponse(data) {
  if (!data.paymentMethodId) {
    throw new Error('Invalid payment method response: missing paymentMethodId');
  }
  return data.paymentMethodId;
}

/**
 * Validate SetupIntent confirmation response
 */
export function validateConfirmationResponse(data) {
  if (!data.setupIntent) {
    throw new Error('Invalid confirmation response: missing setupIntent');
  }
  if (data.setupIntent.status !== 'succeeded') {
    throw new Error(`SetupIntent status: ${data.setupIntent.status}`);
  }
  return data.setupIntent;
}
