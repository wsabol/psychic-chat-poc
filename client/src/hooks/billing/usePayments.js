import { useState, useCallback } from 'react';
import { billingFetch } from './billingApi';

export function usePayments(token) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPayments = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await billingFetch('/billing/payments', {
        token,
        errorContext: 'fetch payments',
      });
      setPayments(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  return {
    payments,
    loading,
    error,
    fetchPayments,
  };
}
