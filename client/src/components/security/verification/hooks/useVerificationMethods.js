import { useState, useCallback, useEffect } from 'react';

/**
 * useVerificationMethods - Load and manage verification methods data
 */
export function useVerificationMethods(userId, token, apiUrl) {
  const [methods, setMethods] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadMethods = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${apiUrl}/security/verification-methods/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setMethods(data.methods);
        return data.methods;
      } else {
        throw new Error('Failed to load verification methods');
      }
    } catch (err) {
      console.error('[VERIFICATION] Error loading methods:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiUrl, userId, token]);

  useEffect(() => {
    loadMethods();
  }, [loadMethods]);

  return { methods, loading, error, reload: loadMethods };
}
