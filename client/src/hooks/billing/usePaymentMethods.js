import { useState, useCallback } from 'react';
import { billingFetch } from './billingApi';

export function usePaymentMethods(token) {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPaymentMethods = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await billingFetch('/billing/payment-methods', {
        token,
        errorContext: 'fetch payment methods',
      });
      setPaymentMethods(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const createSetupIntent = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await billingFetch('/billing/setup-intent', {
        method: 'POST',
        token,
        errorContext: 'create setup intent',
      });
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const deletePaymentMethod = useCallback(async (paymentMethodId) => {
    try {
      setError(null);
      setLoading(true);
      await billingFetch(`/billing/payment-methods/${paymentMethodId}`, {
        method: 'DELETE',
        token,
        errorContext: 'delete payment method',
      });
      await fetchPaymentMethods();
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token, fetchPaymentMethods]);

  const attachPaymentMethod = useCallback(async (paymentMethodId) => {
    try {
      setError(null);
      setLoading(true);
      const data = await billingFetch('/billing/payment-methods/attach', {
        method: 'POST',
        body: { paymentMethodId },
        token,
        errorContext: 'attach payment method',
      });
      await fetchPaymentMethods();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token, fetchPaymentMethods]);

  const setDefaultPaymentMethod = useCallback(async (paymentMethodId) => {
    try {
      setError(null);
      setLoading(true);
      const data = await billingFetch('/billing/payment-methods/set-default', {
        method: 'POST',
        body: { paymentMethodId },
        token,
        errorContext: 'set default payment method',
      });
      await fetchPaymentMethods();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token, fetchPaymentMethods]);

  const verifyBankSetupIntent = useCallback(async (setupIntentId, amounts) => {
    try {
      setError(null);
      setLoading(true);
      const data = await billingFetch('/billing/verify-setup', {
        method: 'POST',
        body: { setupIntentId, amounts },
        token,
        errorContext: 'verify bank account',
      });
      await fetchPaymentMethods();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token, fetchPaymentMethods]);

  const verifyPaymentMethod = useCallback(async (paymentMethodId, amounts) => {
    try {
      setError(null);
      setLoading(true);
      const data = await billingFetch('/billing/verify-microdeposits', {
        method: 'POST',
        body: { paymentMethodId, amounts },
        token,
        errorContext: 'verify payment method',
      });
      await fetchPaymentMethods();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token, fetchPaymentMethods]);

  const cleanupUnverifiedBanks = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await billingFetch('/billing/cleanup-unverified', {
        method: 'POST',
        token,
        errorContext: 'cleanup unverified banks',
      });
      await fetchPaymentMethods();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token, fetchPaymentMethods]);

  const attachUnattachedMethods = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await billingFetch('/billing/payment-methods/attach-unattached', {
        method: 'POST',
        token,
        errorContext: 'attach unattached methods',
      });
      await fetchPaymentMethods();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
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
