import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../../firebase';
import { logErrorFromCatch } from '../../../shared/errorLogger.js';

/**
 * Custom hook to handle password reset functionality
 * Extracted from ReAuthModal for better separation of concerns
 */
export function usePasswordReset(email, t) {
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePasswordReset = async () => {
    setError(null);
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      
      // Auto-hide after 3 seconds and return to main view
      setTimeout(() => {
        setShowPasswordReset(false);
        setResetSent(false);
      }, 3000);
    } catch (err) {
      logErrorFromCatch('[REAUTH] Password reset failed:', err);
      setError(t('security.reauth.errorResetFailed'));
    } finally {
      setLoading(false);
    }
  };

  return {
    showPasswordReset,
    setShowPasswordReset,
    resetSent,
    error,
    loading,
    handlePasswordReset,
  };
}
