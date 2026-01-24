import { useState } from 'react';
import { deduplicatedFetch } from '../../../utils/deduplicatedFetch';
import { logErrorFromCatch } from '../../../shared/errorLogger.js';
import {
  validatePaymentMethodResponse,
  validateConfirmationResponse,
  getClientIpAddress,
  getClientUserAgent,
} from '../utils/bankAccountUtils';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

/**
 * Hook to handle ACH mandate confirmation flow
 */
export function useMandateConfirmation(token) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createPaymentMethod = async (financialAccountId) => {
    try {
      setLoading(true);
      setError(null);

      const response = await deduplicatedFetch(
        `${API_URL}/billing/create-from-financial`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ financialAccountId }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create payment method');
      }

      const data = await response.json();
      const paymentMethodId = validatePaymentMethodResponse(data);

      return paymentMethodId;
    } catch (err) {
      const message = err.message || 'Failed to create payment method';
      setError(message);
      logErrorFromCatch('[MANDATE] Error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const confirmWithMandate = async (setupIntentId, paymentMethodId) => {
    try {
      setLoading(true);
      setError(null);

      // Gather client info for mandate
      const userAgent = getClientUserAgent();
      const ipAddress = await getClientIpAddress();

      const response = await deduplicatedFetch(
        `${API_URL}/billing/confirm-setup-intent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            setupIntentId,
            paymentMethodId,
            ipAddress,
            userAgent,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to confirm SetupIntent');
      }

      const data = await response.json();
      const setupIntent = validateConfirmationResponse(data);

      return setupIntent;
    } catch (err) {
      const message = err.message || 'Failed to confirm mandate';
      setError(message);
      logErrorFromCatch('[MANDATE] Error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createPaymentMethod,
    confirmWithMandate,
    loading,
    error,
  };
}
