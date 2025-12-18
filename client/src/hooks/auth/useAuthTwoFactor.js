import { useCallback, useState } from 'react';

/**
 * Two-factor authentication logic
 */
export function useAuthTwoFactor() {
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [tempToken, setTempToken] = useState(null);
  const [tempUserId, setTempUserId] = useState(null);
  const [twoFactorMethod, setTwoFactorMethod] = useState('email');
  const [error, setError] = useState(null);

  const verify2FA = useCallback(async (code, token, userId, checkBillingStatus) => {
    try {
      if (!userId || !token) {
        setError('2FA session expired. Please log in again.');
        return false;
      }

      const response = await fetch('http://localhost:3000/auth/verify-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: userId,
          code: code
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || '2FA verification failed');
        return false;
      }

      // 2FA verified - NOW authenticate

      // Mark 2FA as verified in this session so page refreshes don't require it again
      sessionStorage.setItem(`2fa_verified_${userId}`, 'true');

      setTempToken(null);
      setTempUserId(null);
      setShowTwoFactor(false);

      // After 2FA, check billing status (payment method then subscription) - SEQUENTIAL
      if (checkBillingStatus) {
        await checkBillingStatus(token, userId);
      }

      setError(null);
      return true;
    } catch (err) {
      console.error('[2FA] Verification error:', err);
      setError('Failed to verify 2FA code');
      return false;
    }
  }, []);

  const reset2FAState = useCallback(() => {
    setShowTwoFactor(false);
    setTempToken(null);
    setTempUserId(null);
    setTwoFactorMethod('email');
    setError(null);
  }, []);

  return {
    showTwoFactor,
    setShowTwoFactor,
    tempToken,
    setTempToken,
    tempUserId,
    setTempUserId,
    twoFactorMethod,
    setTwoFactorMethod,
    error,
    setError,
    verify2FA,
    reset2FAState,
  };
}
