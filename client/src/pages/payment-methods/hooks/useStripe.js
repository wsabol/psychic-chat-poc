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
      const stripeKey = process.env.REACT_APP_STRIPE_PUBLIC_KEY || 'pk_test_51RvatUJMQqFkSDqnqnpj19zERg4ECXj9ZpSUloXyNEf6SqusJ0N6PJQXnyrap5POm8ynwuXomOSJh1RUX7AlieyI007B3VSIru';
      stripeRef.current = window.Stripe(stripeKey);
      return stripeRef.current;
    } catch (err) {
      console.error('Failed to initialize Stripe:', err);
      return null;
    }
  }, []);

  return stripe;
}
