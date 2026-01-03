import { useCallback, useState } from 'react';

/**
 * Billing status checks - payment methods and subscriptions
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
      const response = await fetch('http://localhost:3000/billing/payment-methods', {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        // User has valid payment method if:
        // - Has at least one card, OR
        // - Has at least one VERIFIED bank account
        const hasCard = data.cards && data.cards.length > 0;
        const hasVerifiedBank = data.bankAccounts && data.bankAccounts.some(
          bank => bank.us_bank_account?.verification_status === 'verified'
        );
        const hasValid = hasCard || hasVerifiedBank;

        setHasValidPaymentMethod(hasValid);
        return hasValid;
      } else {
        console.warn('[AUTH] Could not fetch payment methods:', response.status);
        setHasValidPaymentMethod(false);
        return false;
      }
    } catch (err) {
      console.error('[AUTH] Error checking payment method:', err);
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
      const response = await fetch('http://localhost:3000/billing/subscriptions', {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });

                  if (response.ok) {
        const subscriptions = await response.json();
        console.log('[BILLING-DEBUG] Subscriptions response:', subscriptions);
        // Check if user has any active subscriptions
        // Include subscriptions with status 'active' (even if cancel_at_period_end is true, they're still active until period ends)
        const hasActive = subscriptions.some(sub => sub.status === 'active');
        console.log('[BILLING-DEBUG] Has active subscription:', hasActive);
        setHasActiveSubscription(hasActive);
        return hasActive;
      } else {
        console.warn('[AUTH] Could not fetch subscriptions:', response.status);
        setHasActiveSubscription(false);
        return false;
      }
    } catch (err) {
      console.error('[AUTH] Error checking subscription status:', err);
      setHasActiveSubscription(false);
      return false;
    } finally {
      setSubscriptionChecking(false);
    }
  }, []);

  // Check both payment method and subscription SEQUENTIALLY (not concurrently)
  // This prevents duplicate Stripe customer creation from concurrent calls
  const checkBillingStatus = useCallback(async (idToken, userId) => {
    try {
      // Check payment method FIRST
      await checkPaymentMethod(idToken, userId);
      // Then check subscription AFTER payment check completes
      await checkSubscriptionStatus(idToken, userId);
    } catch (err) {
      console.error('[AUTH] Error checking billing status:', err);
    }
  }, [checkPaymentMethod, checkSubscriptionStatus]);

  // Re-check only subscription (not payment method)
  // Called when user returns from billing page after adding payment method
  const recheckSubscriptionOnly = useCallback(async (idToken, userId) => {
    try {
      await checkSubscriptionStatus(idToken, userId);
    } catch (err) {
      console.error('[AUTH] Error re-checking subscription:', err);
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
