import { useCallback, useState } from 'react';
import { auth } from '../../firebase';

/**
 * Two-factor authentication logic
 * 
 * CRITICAL FIX: After 2FA code is verified, we call complete2FA() to immediately
 * set isAuthenticated = true and trigger billing checks. We don't rely on 
 * onAuthStateChanged listener re-running because it doesn't fire automatically.
 */
export function useAuthTwoFactor() {
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [tempToken, setTempToken] = useState(null);
  const [tempUserId, setTempUserId] = useState(null);
  const [twoFactorMethod, setTwoFactorMethod] = useState('email');
  const [error, setError] = useState(null);

  const verify2FA = useCallback(async (code, token, userId, complete2FA, authToken, authUserId) => {
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
      console.log('[2FA] Code verified successfully, completing login flow');

      // Mark 2FA as verified in this session so page refreshes don't require it again
      sessionStorage.setItem(`2fa_verified_${userId}`, 'true');

      setTempToken(null);
      setTempUserId(null);
      setShowTwoFactor(false);

      // CRITICAL FIX: Call complete2FA to immediately authenticate and trigger billing check
      // This is the proper way to complete 2FA - don't rely on onAuthStateChanged listener
      // because it doesn't fire automatically when auth state hasn't changed
      if (complete2FA && authToken && authUserId) {
        console.log('[2FA] Calling complete2FA to finalize authentication');
        complete2FA(authUserId, authToken);
      } else {
        console.warn('[2FA] Missing complete2FA or auth tokens, falling back to reload');
        // Fallback: Force auth state to re-run listener if complete2FA not available
        if (auth.currentUser) {
          try {
            await auth.currentUser.reload();
          } catch (reloadErr) {
            console.warn('[2FA] Failed to reload auth user:', reloadErr.message);
          }
        }
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
