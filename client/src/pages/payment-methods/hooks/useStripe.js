import { useRef, useMemo } from 'react';

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
      console.error('Stripe.js not loaded');
      return null;
    }

    try {
      stripeRef.current = window.Stripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);
      return stripeRef.current;
    } catch (err) {
      console.error('Failed to initialize Stripe:', err);
      return null;
    }
  }, []);

  return stripe;
}
