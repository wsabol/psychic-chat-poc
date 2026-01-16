/**
 * Stripe Configuration
 * Uses environment variable REACT_APP_STRIPE_PUBLIC_KEY
 */

export const STRIPE_PUBLIC_KEY = process.env.REACT_APP_STRIPE_PUBLIC_KEY || '';

/**
 * Get Stripe instance from window (loaded via CDN)
 */
export function getStripe() {
  if (typeof window !== 'undefined' && window.Stripe) {
    return window.Stripe(STRIPE_PUBLIC_KEY);
  }
  logErrorFromCatch('Stripe.js not loaded. Make sure it\'s loaded via CDN in index.html');
  return null;
}

export default {
  STRIPE_PUBLIC_KEY,
  getStripe,
};
