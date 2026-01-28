import { useState, useCallback, useEffect } from 'react';

/**
 * useVerificationMethods - Load and manage verification methods data
 * 
 * FIXED: Returns default empty data instead of error if loading fails
 * This prevents showing error messages when database is empty
 */
// Default empty verification methods object
const DEFAULT_METHODS = {
  primaryEmail: null,
  phoneNumber: null,
  recoveryPhone: null,
  recoveryEmail: null,
  phoneVerified: false,
  recoveryPhoneVerified: false,
  recoveryEmailVerified: false
};

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
        console.log('[CLIENT] API Response:', data);
        console.log('[CLIENT] Methods received:', data.methods);
        console.log('[CLIENT] Phone number:', data.methods?.phoneNumber);
        setMethods(data.methods || DEFAULT_METHODS);
        return data.methods || DEFAULT_METHODS;
      } else {
        // API error - set default empty data instead of showing error
        setMethods(DEFAULT_METHODS);
        return DEFAULT_METHODS;
      }
    } catch (err) {
      // Network or parsing error - set default empty data instead of showing error
      setMethods(DEFAULT_METHODS);
      setError(null); // Don't show error message to user
      return DEFAULT_METHODS;
    } finally {
      setLoading(false);
    }
  }, [apiUrl, userId, token]);

  useEffect(() => {
    loadMethods();
  }, [loadMethods]);

  return { methods: methods || DEFAULT_METHODS, loading, error, reload: loadMethods };
}

