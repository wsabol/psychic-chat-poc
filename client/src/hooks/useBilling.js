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

  /**
   * Create a SetupIntent for adding payment methods
   */
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

  /**
   * Fetch all payment methods
   */
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

  /**
   * Delete a payment method
   */
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
      
      // Refresh payment methods after deletion
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

  /**
   * Set default payment method
   */
  const setDefaultPaymentMethod = useCallback(async (paymentMethodId) => {
    try {
      setError(null);
      setLoading(true);
      const response = await fetchWithTokenRefresh(`${API_URL}/billing/set-default-payment-method`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentMethodId }),
      });

      if (!response.ok) throw new Error('Failed to set default payment method');
      
      // Refresh payment methods after update
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

  /**
   * Create a subscription
   */
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
      
      // Refresh subscriptions after creation
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

  /**
   * Fetch all subscriptions
   */
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

  /**
   * Cancel a subscription
   */
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
      
      // Refresh subscriptions after cancellation
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

  /**
   * Fetch all invoices
   */
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

  /**
   * Fetch all payments
   */
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

  /**
   * Fetch available subscription plans
   */
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

  return {
    // State
    paymentMethods,
    subscriptions,
    invoices,
    payments,
    availablePrices,
    loading,
    error,
    
    // Methods
    createSetupIntent,
    fetchPaymentMethods,
    deletePaymentMethod,
    setDefaultPaymentMethod,
    createSubscription,
    fetchSubscriptions,
    cancelSubscription,
    fetchInvoices,
    fetchPayments,
    fetchAvailablePrices,
  };
}
