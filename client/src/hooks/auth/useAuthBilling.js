import { useCallback, useState } from 'react';
import { logErrorFromCatch } from '../../shared/errorLogger.js';

/**
 * Billing status checks - payment methods and subscriptions
 * WITH TIMEOUT TO PREVENT HANGING
 */
export function useAuthBilling() {
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [subscriptionChecking, setSubscriptionChecking] = useState(false);
  const [hasValidPaymentMethod, setHasValidPaymentMethod] = useState(false);
  const [paymentMethodChecking, setPaymentMethodChecking] = useState(false);

  // Check if user has valid payment method (card or verified bank account)
  const checkPaymentMethod = useCallback(async (idToken, userId) => {
    try {
      setPaymentMethodChecking(true);
      
      // Add 8 second timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      try {
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
        const response = await fetch(`${API_URL}/billing/payment-methods`, {
          headers: { 'Authorization': `Bearer ${idToken}` },
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const hasCard = data.cards && data.cards.length > 0;
          const hasVerifiedBank = data.bankAccounts && data.bankAccounts.some(
            bank => bank.us_bank_account?.verification_status === 'verified'
          );
          const hasValid = hasCard || hasVerifiedBank;

          setHasValidPaymentMethod(hasValid);
          return hasValid;
        } else {
          setHasValidPaymentMethod(false);
          return false;
        }
      } catch (timeoutErr) {
        clearTimeout(timeoutId);
        // Timeout or abort - assume no payment method and continue
        logErrorFromCatch('[AUTH] Payment method check timed out', timeoutErr);
        setHasValidPaymentMethod(false);
        return false;
      }
    } catch (err) {
      logErrorFromCatch('[AUTH] Error checking payment method:', err);
      setHasValidPaymentMethod(false);
      return false;
    } finally {
      setPaymentMethodChecking(false);
    }
  }, []);

  // Fetch subscription status when user authenticates
  const checkSubscriptionStatus = useCallback(async (idToken, userId) => {
    try {
      setSubscriptionChecking(true);
      
      // Add 8 second timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      try {
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
        const response = await fetch(`${API_URL}/billing/subscriptions`, {
          headers: { 'Authorization': `Bearer ${idToken}` },
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const subscriptions = await response.json();
          const hasActive = subscriptions.some(sub => sub.status === 'active');
          setHasActiveSubscription(hasActive);
          return hasActive;
        } else {
          setHasActiveSubscription(false);
          return false;
        }
      } catch (timeoutErr) {
        clearTimeout(timeoutId);
        // Timeout or abort - assume no subscription and continue
        logErrorFromCatch('[AUTH] Subscription check timed out', timeoutErr);
        setHasActiveSubscription(false);
        return false;
      }
    } catch (err) {
      logErrorFromCatch('[AUTH] Error checking subscription status:', err);
      setHasActiveSubscription(false);
      return false;
    } finally {
      setSubscriptionChecking(false);
    }
  }, []);

  // Check both payment method and subscription SEQUENTIALLY with timeouts
  const checkBillingStatus = useCallback(async (idToken, userId) => {
    try {
      await checkPaymentMethod(idToken, userId);
      await checkSubscriptionStatus(idToken, userId);
    } catch (err) {
      logErrorFromCatch('[AUTH] Error checking billing status:', err);
    }
  }, [checkPaymentMethod, checkSubscriptionStatus]);

  // Re-check only subscription (not payment method)
  const recheckSubscriptionOnly = useCallback(async (idToken, userId) => {
    try {
      await checkSubscriptionStatus(idToken, userId);
    } catch (err) {
      logErrorFromCatch('[AUTH] Error re-checking subscription:', err);
    }
  }, [checkSubscriptionStatus]);

  const resetBillingState = useCallback(() => {
    setHasActiveSubscription(false);
    setHasValidPaymentMethod(false);
  }, []);

  return {
    hasActiveSubscription,
    subscriptionChecking,
    hasValidPaymentMethod,
    paymentMethodChecking,
    checkPaymentMethod,
    checkSubscriptionStatus,
    checkBillingStatus,
    recheckSubscriptionOnly,
    resetBillingState,
  };
}
