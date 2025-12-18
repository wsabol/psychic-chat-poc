import { useState, useCallback } from 'react';
import { billingFetch } from './billingApi';

export function useInvoices(token) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchInvoices = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await billingFetch('/billing/invoices', {
        token,
        errorContext: 'fetch invoices',
      });
      setInvoices(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  return {
    invoices,
    loading,
    error,
    fetchInvoices,
  };
}
