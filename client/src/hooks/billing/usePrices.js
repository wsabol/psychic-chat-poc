import { useState, useCallback } from 'react';
import { billingFetch } from './billingApi';

export function usePrices(token) {
  const [availablePrices, setAvailablePrices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAvailablePrices = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await billingFetch('/billing/available-prices', {
        token,
        errorContext: 'fetch available prices',
      });
      setAvailablePrices(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  return {
    availablePrices,
    loading,
    error,
    fetchAvailablePrices,
  };
}
