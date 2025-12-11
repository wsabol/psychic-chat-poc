/**
 * useSubscriptionHandlers Hook
 * All subscription action handlers - STRIPE COMPLIANT
 */

import { useCallback } from 'react';

export function useSubscriptionHandlers({ billing, setError, setSuccess, setActiveSubscriptions }) {
  /**
   * Subscribe to a plan - Stripe recommended flow
   */
  const handleSubscribe = useCallback(async (priceId) => {
    try {
      setError(null);
      const result = await billing.createSubscription(priceId);

      // Only confirm payment if subscription needs payment action
      if (result.clientSecret && result.status === 'requires_payment_action') {
        if (!window.Stripe) {
          setError('Stripe.js not loaded');
          return;
        }

        const stripe = window.Stripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);
        
        // Use confirmCardPayment for payment intent confirmation
        const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(result.clientSecret);

        if (stripeError) {
          setError(stripeError.message);
          return;
        }

        // Check final status
        if (paymentIntent.status !== 'succeeded') {
          setError('Payment could not be confirmed');
          return;
        }
      }

      setSuccess(true);
      // Refresh subscriptions after success
      await billing.fetchSubscriptions();
    } catch (err) {
      setError(err.message || 'Failed to create subscription');
    }
  }, [billing, setError, setSuccess]);

  /**
   * Toggle subscription active/inactive
   */
  const handleToggleSubscription = useCallback(async (subscriptionId, isActive) => {
    const newState = !isActive;

    if (newState === false) {
      if (!window.confirm(
        'Are you sure you want to cancel this subscription?\n\n' +
        'Your subscription will continue until the end of your current billing period, then stop.\n\n' +
        'You can reactivate your subscription at any time.'
      )) {
        return;
      }
    }

    try {
      setError(null);
      if (newState === false) {
        await billing.cancelSubscription(subscriptionId);
        setSuccess(true);
        // Refresh subscriptions after cancellation
        await billing.fetchSubscriptions();
      }
      setActiveSubscriptions(prev => ({
        ...prev,
        [subscriptionId]: newState
      }));
    } catch (err) {
      setError(err.message || 'Failed to update subscription');
    }
  }, [billing, setError, setSuccess, setActiveSubscriptions]);

  /**
   * Change to a different plan
   */
  const handleChangeSubscription = useCallback(async (currentSub, newPriceId) => {
    if (!window.confirm(
      'Ready to change your subscription plan?\n\n' +
      'Your current subscription will be canceled.\n' +
      'Your new subscription will start at the end of your current billing period.\n\n' +
      'This ensures a smooth transition without any interruption.'
    )) {
      return;
    }

    try {
      setError(null);
      await billing.cancelSubscription(currentSub.id);
      const result = await billing.createSubscription(newPriceId);

      // Only confirm payment if needed
      if (result.clientSecret && result.status === 'requires_payment_action') {
        if (!window.Stripe) {
          setError('Stripe.js not loaded');
          return;
        }

        const stripe = window.Stripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);
        const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(result.clientSecret);
        
        if (stripeError) {
          setError(stripeError.message);
          return;
        }

        if (paymentIntent.status !== 'succeeded') {
          setError('Payment could not be confirmed');
          return;
        }
      }

      setSuccess(true);
      // Refresh subscriptions after success
      await billing.fetchSubscriptions();
    } catch (err) {
      setError(err.message || 'Failed to change subscription');
    }
  }, [billing, setError, setSuccess]);

  return {
    handleSubscribe,
    handleToggleSubscription,
    handleChangeSubscription
  };
}
