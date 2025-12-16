import { useState, useCallback } from 'react';
import { fetchWithTokenRefresh } from '../utils/fetchWithTokenRefresh';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export function useBilling(token) {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [availablePrices, setAvailablePrices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createSetupIntent = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await fetchWithTokenRefresh(`${API_URL}/billing/setup-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to create setup intent');
      return await response.json();
    } catch (err) {
      const message = err.message || 'Failed to create setup intent';
      setError(message);
      console.error('[BILLING] Setup intent error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchPaymentMethods = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await fetchWithTokenRefresh(`${API_URL}/billing/payment-methods`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch payment methods');
      const data = await response.json();
      setPaymentMethods(data);
      return data;
    } catch (err) {
      const message = err.message || 'Failed to fetch payment methods';
      setError(message);
      console.error('[BILLING] Fetch payment methods error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const deletePaymentMethod = useCallback(async (paymentMethodId) => {
    try {
      setError(null);
      setLoading(true);
      const response = await fetchWithTokenRefresh(
        `${API_URL}/billing/payment-methods/${paymentMethodId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to delete payment method');
      
      await fetchPaymentMethods();
      return true;
    } catch (err) {
      const message = err.message || 'Failed to delete payment method';
      setError(message);
      console.error('[BILLING] Delete payment method error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token, fetchPaymentMethods]);

    const attachPaymentMethod = useCallback(async (paymentMethodId) => {
    try {
      setError(null);
      setLoading(true);
      const response = await fetchWithTokenRefresh(`${API_URL}/billing/payment-methods/attach`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentMethodId }),
      });

      if (!response.ok) throw new Error('Failed to attach payment method');
      
      const result = await response.json();
      console.log('[BILLING] Attach result:', result);
      
      await fetchPaymentMethods();
      return result;
    } catch (err) {
      const message = err.message || 'Failed to attach payment method';
      setError(message);
      console.error('[BILLING] Attach payment method error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token, fetchPaymentMethods]);

  /**
   * Verify bank account with micro-deposit amounts
   */
    const verifyBankSetupIntent = useCallback(async (setupIntentId, amounts) => {
    try {
      setError(null);
      setLoading(true);
      const response = await fetchWithTokenRefresh(`${API_URL}/billing/verify-setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ setupIntentId, amounts }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to verify bank account');
      }
      
      const result = await response.json();
      console.log('[BILLING] Bank verification result:', result);
      
      await fetchPaymentMethods();
      return result;
    } catch (err) {
      const message = err.message || 'Failed to verify bank account';
      setError(message);
      console.error('[BILLING] Verify bank account error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token, fetchPaymentMethods]);

    const cleanupUnverifiedBanks = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await fetchWithTokenRefresh(`${API_URL}/billing/cleanup-unverified`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to cleanup unverified banks');
      
      const result = await response.json();
      console.log('[BILLING] Cleanup result:', result);
      
      await fetchPaymentMethods();
      return result;
    } catch (err) {
      const message = err.message || 'Failed to cleanup unverified banks';
      setError(message);
      console.error('[BILLING] Cleanup unverified banks error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token, fetchPaymentMethods]);

    const setDefaultPaymentMethod = useCallback(async (paymentMethodId) => {
    try {
      setError(null);
      setLoading(true);
      const response = await fetchWithTokenRefresh(`${API_URL}/billing/payment-methods/set-default`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentMethodId }),
      });

      if (!response.ok) throw new Error('Failed to set default payment method');
      
      await fetchPaymentMethods();
      return await response.json();
    } catch (err) {
      const message = err.message || 'Failed to set default payment method';
      setError(message);
      console.error('[BILLING] Set default payment method error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token, fetchPaymentMethods]);

  const createSubscription = useCallback(async (priceId) => {
    try {
      setError(null);
      setLoading(true);
      const response = await fetchWithTokenRefresh(`${API_URL}/billing/create-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ priceId }),
      });

      if (!response.ok) throw new Error('Failed to create subscription');
      
      await fetchSubscriptions();
      return await response.json();
    } catch (err) {
      const message = err.message || 'Failed to create subscription';
      setError(message);
      console.error('[BILLING] Create subscription error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchSubscriptions = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await fetchWithTokenRefresh(`${API_URL}/billing/subscriptions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch subscriptions');
      const data = await response.json();
      setSubscriptions(data);
      return data;
    } catch (err) {
      const message = err.message || 'Failed to fetch subscriptions';
      setError(message);
      console.error('[BILLING] Fetch subscriptions error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const cancelSubscription = useCallback(async (subscriptionId) => {
    try {
      setError(null);
      setLoading(true);
      const response = await fetchWithTokenRefresh(
        `${API_URL}/billing/cancel-subscription/${subscriptionId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to cancel subscription');
      
      await fetchSubscriptions();
      return await response.json();
    } catch (err) {
      const message = err.message || 'Failed to cancel subscription';
      setError(message);
      console.error('[BILLING] Cancel subscription error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token, fetchSubscriptions]);

  const fetchInvoices = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await fetchWithTokenRefresh(`${API_URL}/billing/invoices`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch invoices');
      const data = await response.json();
      setInvoices(data);
      return data;
    } catch (err) {
      const message = err.message || 'Failed to fetch invoices';
      setError(message);
      console.error('[BILLING] Fetch invoices error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchPayments = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await fetchWithTokenRefresh(`${API_URL}/billing/payments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch payments');
      const data = await response.json();
      setPayments(data);
      return data;
    } catch (err) {
      const message = err.message || 'Failed to fetch payments';
      setError(message);
      console.error('[BILLING] Fetch payments error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchAvailablePrices = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await fetchWithTokenRefresh(`${API_URL}/billing/available-prices`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch available prices');
      const data = await response.json();
      setAvailablePrices(data);
      return data;
    } catch (err) {
      const message = err.message || 'Failed to fetch available prices';
      setError(message);
      console.error('[BILLING] Fetch prices error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

    const verifyPaymentMethod = useCallback(async (paymentMethodId, amounts) => {
    try {
      setError(null);
      setLoading(true);
      const response = await fetchWithTokenRefresh(`${API_URL}/billing/verify-microdeposits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentMethodId, amounts }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to verify payment method');
      }
      
      const result = await response.json();
      console.log('[BILLING] Payment method verification result:', result);
      
      await fetchPaymentMethods();
      return result;
    } catch (err) {
      const message = err.message || 'Failed to verify payment method';
      setError(message);
      console.error('[BILLING] Verify payment method error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token, fetchPaymentMethods]);

    const attachUnattachedMethods = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await fetchWithTokenRefresh(`${API_URL}/billing/payment-methods/attach-unattached`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to attach');
      const result = await response.json();
      await fetchPaymentMethods();
      return result;
    } catch (err) {
      setError(err.message || 'Failed to attach unattached methods');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token, fetchPaymentMethods]);

  return {
    paymentMethods,
    subscriptions,
    invoices,
    payments,
    availablePrices,
    loading,
    error,
    createSetupIntent,
    fetchPaymentMethods,
    deletePaymentMethod,
    attachPaymentMethod,
    verifyBankSetupIntent,
    verifyPaymentMethod,
    attachUnattachedMethods,
    cleanupUnverifiedBanks,
    setDefaultPaymentMethod,
    createSubscription,
    fetchSubscriptions,
    cancelSubscription,
    fetchInvoices,
    fetchPayments,
    fetchAvailablePrices,
  };
}
