import { useState } from 'react';
import { fetchWithTokenRefresh } from '../../../utils/fetchWithTokenRefresh';
import { validateSetupIntentResponse } from '../utils/bankAccountUtils';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

/**
 * Hook to create a SetupIntent for ACH mandate collection
 */
export function useSetupIntent(token) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createSetupIntent = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[SETUP_INTENT] Creating SetupIntent...');

      const response = await fetchWithTokenRefresh(
        `${API_URL}/billing/setup-intent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create SetupIntent');
      }

      const data = await response.json();
      const validatedData = validateSetupIntentResponse(data);

      console.log('[SETUP_INTENT] SetupIntent created:', validatedData.setupIntentId);

      return validatedData;
    } catch (err) {
      const message = err.message || 'Failed to create SetupIntent';
      setError(message);
      console.error('[SETUP_INTENT] Error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createSetupIntent,
    loading,
    error,
  };
}
