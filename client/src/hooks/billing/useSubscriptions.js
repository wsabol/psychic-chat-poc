import { useState, useCallback } from 'react';
import { billingFetch } from './billingApi';

export function useSubscriptions(token) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSubscriptions = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await billingFetch('/billing/subscriptions', {
        token,
        errorContext: 'fetch subscriptions',
      });
      setSubscriptions(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const createSubscription = useCallback(async (priceId) => {
    try {
      setError(null);
      setLoading(true);
      const data = await billingFetch('/billing/create-subscription', {
        method: 'POST',
        body: { priceId },
        token,
        errorContext: 'create subscription',
      });
      
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const cancelSubscription = useCallback(async (subscriptionId) => {
    try {
      setError(null);
      setLoading(true);
      const data = await billingFetch(`/billing/cancel-subscription/${subscriptionId}`, {
        method: 'POST',
        token,
        errorContext: 'cancel subscription',
      });
      
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  return {
    subscriptions,
    loading,
    error,
    fetchSubscriptions,
    createSubscription,
    cancelSubscription,
  };
}
