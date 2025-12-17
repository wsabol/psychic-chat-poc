/**
 * useSubscriptionHandlers Hook - With Confirmation Modal Support
 * Handles incomplete subscriptions and payment confirmation
 */

import { useCallback } from 'react';

export function useSubscriptionHandlers({ 
  billing, 
  setError, 
  setSuccess, 
  setActiveSubscriptions,
  setPendingSubscription,
  setShowSubscriptionConfirmationModal,
}) {
  /**
   * Subscribe to a plan - Handle incomplete subscriptions
   */
  const handleSubscribe = useCallback(async (priceId) => {
    try {
      setError(null);
      const result = await billing.createSubscription(priceId);

      // If subscription is incomplete, show confirmation modal
      if (result.status === 'incomplete' || result.status === 'incomplete_expired') {
        setPendingSubscription(result);
        setShowSubscriptionConfirmationModal(true);
        return;
      }

      // If subscription needs payment action, show confirmation modal
      if (result.clientSecret && (result.status === 'requires_payment_action' || result.status === 'active')) {
        if (result.status === 'requires_payment_action') {
          setPendingSubscription(result);
          setShowSubscriptionConfirmationModal(true);
          return;
        }
      }

      // Subscription is already active
      setSuccess(true);
      await billing.fetchSubscriptions();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      // Check if error is due to missing payment method
      if (err.message && err.message.includes('No payment method')) {
        setError('Please add a payment method before subscribing.');
      } else {
        setError(err.message || 'Failed to create subscription');
      }
    }
  }, [billing, setError, setSuccess, setPendingSubscription, setShowSubscriptionConfirmationModal]);

  /**
   * Handle subscription confirmation after modal
   */
  const handleSubscriptionConfirmationSuccess = useCallback(async (paymentIntent) => {
    try {
      setShowSubscriptionConfirmationModal(false);
      setPendingSubscription(null);
      setSuccess(true);
      await billing.fetchSubscriptions();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to process confirmation');
    }
  }, [billing, setError, setSuccess, setShowSubscriptionConfirmationModal, setPendingSubscription]);

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
        await billing.fetchSubscriptions();
        setTimeout(() => setSuccess(false), 3000);
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

      // Handle incomplete new subscription
      if (result.status === 'incomplete' || result.status === 'incomplete_expired') {
        setPendingSubscription(result);
        setShowSubscriptionConfirmationModal(true);
        return;
      }

      if (result.clientSecret && result.status === 'requires_payment_action') {
        setPendingSubscription(result);
        setShowSubscriptionConfirmationModal(true);
        return;
      }

      setSuccess(true);
      await billing.fetchSubscriptions();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to change subscription');
    }
  }, [billing, setError, setSuccess, setPendingSubscription, setShowSubscriptionConfirmationModal]);

  return {
    handleSubscribe,
    handleToggleSubscription,
    handleChangeSubscription,
    handleSubscriptionConfirmationSuccess,
  };
}
