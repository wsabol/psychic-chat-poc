import { useCallback, useState } from 'react';
import { auth } from '../../firebase';
import { logErrorFromCatch } from '../../shared/errorLogger.js';

/**
 * Two-factor authentication logic
 * Supports trusted device functionality (30-day trust)
 */
export function useAuthTwoFactor() {
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [tempToken, setTempToken] = useState(null);
  const [tempUserId, setTempUserId] = useState(null);
  const [twoFactorMethod, setTwoFactorMethod] = useState('email');
  const [error, setError] = useState(null);

  const verify2FA = useCallback(async (code, token, userId, complete2FA, authToken, authUserId, trustDevice = false, method = 'email') => {
    try {
      if (!userId || !token) {
        setError('2FA session expired. Please log in again.');
        return false;
      }

      console.log(`[2FA] Verifying code with method: ${method}`);
      
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_URL}/auth/verify-2fa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: userId,
          code: code,
          trustDevice: trustDevice,
          method: method  // CRITICAL: Pass method parameter so backend knows SMS vs Email
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Invalid or expired 2FA code');
        return false;
      }

      // 2FA verified successfully
      console.log('[2FA] ✅ Verification successful');

      // Mark 2FA as verified in this session so page refreshes don't require it again
      sessionStorage.setItem(`2fa_verified_${userId}`, 'true');

      // Clear 2FA modal state
      setTempToken(null);
      setTempUserId(null);
      setShowTwoFactor(false);
      setError(null);

      // CRITICAL FIX: Call complete2FA to immediately authenticate and trigger navigation to chat
      // This updates isAuthenticated state and triggers billing check, which navigates to chat
      if (complete2FA && authToken && authUserId) {
        console.log('[2FA] Calling complete2FA to authenticate user');
        complete2FA(authUserId, authToken);
      } else {
        console.warn('[2FA] complete2FA not available, forcing auth reload');
        // Fallback: Force auth state to re-run listener if complete2FA not available
        if (auth.currentUser) {
          try {
            await auth.currentUser.reload();
          } catch (reloadErr) {
            console.error('[2FA] Failed to reload auth:', reloadErr);
          }
        }
      }

      return true;
    } catch (err) {
      logErrorFromCatch('[2FA] Verification error:', err);
      setError('Failed to verify 2FA code. Please try again.');
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

