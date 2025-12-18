import { useState } from 'react';
import { fetchWithTokenRefresh } from '../../../utils/fetchWithTokenRefresh';
import {
  validateFinancialConnectionsResponse,
  validateAccountsResponse,
  extractAccountDetails,
} from '../utils/bankAccountUtils';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

/**
 * Hook to handle Financial Connections flow
 */
export function useFinancialConnections(token) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createSession = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchWithTokenRefresh(
        `${API_URL}/billing/financial-connections-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create Financial Connections session');
      }

      const data = await response.json();
      const validatedData = validateFinancialConnectionsResponse(data);

      return validatedData;
    } catch (err) {
      const message = err.message || 'Failed to create Financial Connections session';
      setError(message);
      console.error('[FC] Error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const collectAccounts = async (sessionClientSecret) => {
    try {
      setLoading(true);
      setError(null);

      if (!window.Stripe) {
        throw new Error('Stripe not initialized');
      }

      const stripe = window.Stripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

      const result = await stripe.collectFinancialConnectionsAccounts({
        clientSecret: sessionClientSecret,
      });

      if (result.error) {
        throw new Error(result.error.message || 'Financial Connections failed');
      }

      const sessionId = result.financialConnectionsSession?.id;
      if (!sessionId) {
        throw new Error('No session ID - user may have cancelled');
      }

      return sessionId;
    } catch (err) {
      const message = err.message || 'Failed to collect accounts';
      setError(message);
      console.error('[FC] Error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchLinkedAccounts = async (sessionId) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchWithTokenRefresh(
        `${API_URL}/billing/financial-accounts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ sessionId }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to fetch accounts');
      }

      const data = await response.json();
      const accounts = validateAccountsResponse(data);

      // Return first account with extracted details
      const account = accounts[0];
      return extractAccountDetails(account);
    } catch (err) {
      const message = err.message || 'Failed to fetch linked accounts';
      setError(message);
      console.error('[FC] Error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createSession,
    collectAccounts,
    fetchLinkedAccounts,
    loading,
    error,
  };
}
