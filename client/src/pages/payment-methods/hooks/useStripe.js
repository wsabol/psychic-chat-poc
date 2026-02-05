import { useRef, useMemo } from 'react';
import { logErrorFromCatch } from '../../../shared/errorLogger.js';

/**
 * useStripe - Creates and caches a single Stripe instance
 * This ensures the same instance is used for Elements and PaymentMethods
 */
export function useStripe() {
  const stripeRef = useRef(null);

  const stripe = useMemo(() => {
    if (stripeRef.current) {
      return stripeRef.current;
    }

    if (!window.Stripe) {
      logErrorFromCatch('Stripe.js not loaded');
      return null;
    }

    try {
      const stripeKey = process.env.REACT_APP_STRIPE_PUBLIC_KEY;
      if (!stripeKey) {
        logErrorFromCatch('REACT_APP_STRIPE_PUBLIC_KEY environment variable is required');
        return null;
      }
      stripeRef.current = window.Stripe(stripeKey);
      return stripeRef.current;
    } catch (err) {
      logErrorFromCatch('Failed to initialize Stripe:', err);
      return null;
    }
  }, []);

  return stripe;
}
