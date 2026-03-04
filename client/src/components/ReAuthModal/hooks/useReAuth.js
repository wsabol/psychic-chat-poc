import { useState, useMemo } from 'react';
import {
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  EmailAuthProvider,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
} from 'firebase/auth';
import { auth } from '../../../firebase';
import { logErrorFromCatch } from '../../../shared/errorLogger.js';
import { getFirebaseErrorMessage, shouldSkipFailureCallback } from '../utils/firebaseErrors';

/**
 * Custom hook to handle re-authentication logic
 * Extracted from ReAuthModal for better separation of concerns
 *
 * Detects which sign-in providers are linked to the current Firebase user
 * so the ReAuthModal can grey out options the user didn't sign up with.
 * Provider IDs: 'password', 'google.com', 'facebook.com', 'apple.com'
 */
export function useReAuth(email, onSuccess, onFailure, t) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Detect which providers are linked to this Firebase account.
  // auth.currentUser is available synchronously once the user is signed in.
  const linkedProviders = useMemo(() => {
    const providerData = auth.currentUser?.providerData || [];
    return providerData.map((p) => p.providerId);
  }, []);

  const hasGoogle   = linkedProviders.includes('google.com');
  const hasFacebook = linkedProviders.includes('facebook.com');
  const hasApple    = linkedProviders.includes('apple.com');
  const hasPassword = linkedProviders.includes('password');

  const handleGoogleReAuth = async () => {
    setError(null);
    setLoading(true);

    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error('No user logged in');
      }

      const googleProvider = new GoogleAuthProvider();
      await reauthenticateWithPopup(user, googleProvider);

      // Call onSuccess after successful Google re-auth
      onSuccess();
    } catch (err) {
      logErrorFromCatch('[REAUTH] Google re-auth failed:', err);
      
      const errorMessage = getFirebaseErrorMessage(err.code, t);
      setError(errorMessage);
      
      // Only call onFailure on actual authentication failures, not user cancellations
      if (onFailure && !shouldSkipFailureCallback(err.code)) {
        onFailure();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookReAuth = async () => {
    setError(null);
    setLoading(true);

    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error('No user logged in');
      }

      const facebookProvider = new FacebookAuthProvider();
      await reauthenticateWithPopup(user, facebookProvider);

      // Call onSuccess after successful Facebook re-auth
      onSuccess();
    } catch (err) {
      logErrorFromCatch('[REAUTH] Facebook re-auth failed:', err);
      
      const errorMessage = getFirebaseErrorMessage(err.code, t);
      setError(errorMessage);
      
      // Only call onFailure on actual authentication failures, not user cancellations
      if (onFailure && !shouldSkipFailureCallback(err.code)) {
        onFailure();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAppleReAuth = async () => {
    setError(null);
    setLoading(true);

    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error('No user logged in');
      }

      const appleProvider = new OAuthProvider('apple.com');
      await reauthenticateWithPopup(user, appleProvider);

      // Call onSuccess after successful Apple re-auth
      onSuccess();
    } catch (err) {
      logErrorFromCatch('[REAUTH] Apple re-auth failed:', err);
      
      const errorMessage = getFirebaseErrorMessage(err.code, t);
      setError(errorMessage);
      
      // Only call onFailure on actual authentication failures, not user cancellations
      if (onFailure && !shouldSkipFailureCallback(err.code)) {
        onFailure();
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReAuth = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error('No user logged in');
      }

      const credential = EmailAuthProvider.credential(email, password);
      await reauthenticateWithCredential(user, credential);

      onSuccess();
    } catch (err) {
      logErrorFromCatch('[REAUTH] Password re-auth failed:', err);
      
      const errorMessage = getFirebaseErrorMessage(err.code, t);
      setError(errorMessage);
      
      if (onFailure) {
        onFailure();
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    password,
    setPassword,
    showPassword,
    setShowPassword,
    error,
    loading,
    handleGoogleReAuth,
    handleFacebookReAuth,
    handleAppleReAuth,
    handlePasswordReAuth,
    // Provider availability flags (derived from Firebase providerData)
    hasGoogle,
    hasFacebook,
    hasApple,
    hasPassword,
  };
}
