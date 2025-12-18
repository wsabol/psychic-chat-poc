import { useState, useCallback, useRef } from 'react';
import { billingFetch } from './billingApi';

export function usePaymentMethods(token) {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const timeoutRef = useRef(null);

  // ✅ FIXED: Helper to set loading with timeout safety
  const setLoadingWithTimeout = (isLoading) => {
    setLoading(isLoading);
    if (isLoading) {
      // If loading takes more than 10 seconds, force reset
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        console.warn('[BILLING] Loading timeout - forcing reset');
        setLoading(false);
      }, 10000);
    } else {
      // Clear timeout when loading completes
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  };

  const fetchPaymentMethods = useCallback(async () => {
    try {
      setError(null);
      setLoadingWithTimeout(true);
      const data = await billingFetch('/billing/payment-methods', {
        token,
        errorContext: 'fetch payment methods',
      });
      setPaymentMethods(data);
      return data;
    } catch (err) {
      console.error('[PAYMENT-METHODS] Error:', err.message);
      setError(err.message);
      setLoadingWithTimeout(false);
      throw err;
    }
  }, [token]);

  const createSetupIntent = useCallback(async () => {
    try {
      setError(null);
      setLoadingWithTimeout(true);
      const data = await billingFetch('/billing/setup-intent', {
        method: 'POST',
        token,
        errorContext: 'create setup intent',
      });
      setLoadingWithTimeout(false);
      return data;
    } catch (err) {
      console.error('[SETUP-INTENT] Error:', err.message);
      setError(err.message);
      setLoadingWithTimeout(false);
      throw err;
    }
  }, [token]);

  const deletePaymentMethod = useCallback(async (paymentMethodId) => {
    try {
      setError(null);
      setLoadingWithTimeout(true);
      await billingFetch(`/billing/payment-methods/${paymentMethodId}`, {
        method: 'DELETE',
        token,
        errorContext: 'delete payment method',
      });
      await fetchPaymentMethods();
      setLoadingWithTimeout(false);
      return true;
    } catch (err) {
      console.error('[DELETE-METHOD] Error:', err.message);
      setError(err.message);
      setLoadingWithTimeout(false);
      throw err;
    }
  }, [token, fetchPaymentMethods]);

  const attachPaymentMethod = useCallback(async (paymentMethodId) => {
    try {
      setError(null);
      setLoadingWithTimeout(true);
      const data = await billingFetch('/billing/payment-methods/attach', {
        method: 'POST',
        body: { paymentMethodId },
        token,
        errorContext: 'attach payment method',
      });
      await fetchPaymentMethods();
      setLoadingWithTimeout(false);
      return data;
    } catch (err) {
      console.error('[ATTACH-METHOD] Error:', err.message);
      setError(err.message);
      setLoadingWithTimeout(false);
      throw err;
    }
  }, [token, fetchPaymentMethods]);

  const setDefaultPaymentMethod = useCallback(async (paymentMethodId) => {
    try {
      setError(null);
      setLoadingWithTimeout(true);
      const data = await billingFetch('/billing/payment-methods/set-default', {
        method: 'POST',
        body: { paymentMethodId },
        token,
        errorContext: 'set default payment method',
      });
      await fetchPaymentMethods();
      setLoadingWithTimeout(false);
      return data;
    } catch (err) {
      console.error('[SET-DEFAULT] Error:', err.message);
      setError(err.message);
      setLoadingWithTimeout(false);
      throw err;
    }
  }, [token, fetchPaymentMethods]);

  const verifyBankSetupIntent = useCallback(async (setupIntentId, amounts) => {
    try {
      setError(null);
      setLoadingWithTimeout(true);
      const data = await billingFetch('/billing/verify-setup', {
        method: 'POST',
        body: { setupIntentId, amounts },
        token,
        errorContext: 'verify bank account',
      });
      await fetchPaymentMethods();
      setLoadingWithTimeout(false);
      return data;
    } catch (err) {
      console.error('[VERIFY-BANK] Error:', err.message);
      setError(err.message);
      setLoadingWithTimeout(false);
      throw err;
    }
  }, [token, fetchPaymentMethods]);

  const verifyPaymentMethod = useCallback(async (paymentMethodId, amounts) => {
    try {
      setError(null);
      setLoadingWithTimeout(true);
      const data = await billingFetch('/billing/verify-microdeposits', {
        method: 'POST',
        body: { paymentMethodId, amounts },
        token,
        errorContext: 'verify payment method',
      });
      await fetchPaymentMethods();
      setLoadingWithTimeout(false);
      return data;
    } catch (err) {
      console.error('[VERIFY-METHOD] Error:', err.message);
      setError(err.message);
      setLoadingWithTimeout(false);
      throw err;
    }
  }, [token, fetchPaymentMethods]);

  const cleanupUnverifiedBanks = useCallback(async () => {
    try {
      setError(null);
      setLoadingWithTimeout(true);
      const data = await billingFetch('/billing/cleanup-unverified', {
        method: 'POST',
        token,
        errorContext: 'cleanup unverified banks',
      });
      await fetchPaymentMethods();
      setLoadingWithTimeout(false);
      return data;
    } catch (err) {
      console.error('[CLEANUP] Error:', err.message);
      setError(err.message);
      setLoadingWithTimeout(false);
      throw err;
    }
  }, [token, fetchPaymentMethods]);

  const attachUnattachedMethods = useCallback(async () => {
    try {
      setError(null);
      setLoadingWithTimeout(true);
      const data = await billingFetch('/billing/payment-methods/attach-unattached', {
        method: 'POST',
        token,
        errorContext: 'attach unattached methods',
      });
      await fetchPaymentMethods();
      setLoadingWithTimeout(false);
      return data;
    } catch (err) {
      console.error('[ATTACH-UNATTACHED] Error:', err.message);
      setError(err.message);
      setLoadingWithTimeout(false);
      throw err;
    }
  }, [token, fetchPaymentMethods]);

  return {
    paymentMethods,
    loading,
    error,
    fetchPaymentMethods,
    createSetupIntent,
    deletePaymentMethod,
    attachPaymentMethod,
    setDefaultPaymentMethod,
    verifyBankSetupIntent,
    verifyPaymentMethod,
    cleanupUnverifiedBanks,
    attachUnattachedMethods,
  };
}
