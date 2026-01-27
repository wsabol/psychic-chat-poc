import React, { useState } from 'react';
import { useTranslation } from '../context/TranslationContext';
import {
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  EmailAuthProvider,
  GoogleAuthProvider,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../firebase';
import { logErrorFromCatch } from '../shared/errorLogger.js';

/**
 * ReAuthModal - Re-authenticate user before accessing security settings
 * Shows both Google and Password options (user picks which they use)
 */
export default function ReAuthModal({ isOpen, email, onSuccess, onCancel, onFailure }) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

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

      // ✅ Call onSuccess after successful Google re-auth
      onSuccess();
    } catch (err) {
      logErrorFromCatch('[REAUTH] Google re-auth failed:', err);
      
      // Skip popup-closed-by-user error to prevent calling onFailure
      if (err.code === 'auth/popup-closed-by-user') {
        setError(t('security.reauth.errorPopupClosed'));
        setLoading(false);
        return;
      } else if (err.code === 'auth/popup-blocked') {
        setError(t('security.reauth.errorPopupBlocked'));
      } else {
        setError(err.message || t('security.reauth.errorAuthFailed'));
      }
      
      // Only call onFailure on actual authentication failures, not user cancellations
      if (onFailure && err.code !== 'auth/popup-closed-by-user') {
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
      
      if (err.code === 'auth/wrong-password') {
        setError(t('security.reauth.errorWrongPassword'));
      } else if (err.code === 'auth/user-mismatch') {
        setError(t('security.reauth.errorUserMismatch'));
      } else {
        setError(err.message || t('security.reauth.errorAuthenticationFailed'));
      }
      
      if (onFailure) {
        onFailure();
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setError(null);
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      
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

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '2rem',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>{t('security.reauth.title')}</h2>
        <p style={{ color: '#666', marginBottom: '1.5rem', fontSize: '14px' }}>
          {t('security.reauth.subtitle')}
        </p>

        {error && (
          <p style={{
            color: '#d32f2f',
            backgroundColor: '#ffebee',
            padding: '0.75rem',
            borderRadius: '4px',
            marginBottom: '1rem',
            fontSize: '14px'
          }}>
            {error}
          </p>
        )}

        {resetSent && (
          <p style={{
            color: '#2e7d32',
            backgroundColor: '#e8f5e9',
            padding: '0.75rem',
            borderRadius: '4px',
            marginBottom: '1rem',
            fontSize: '14px'
          }}>
            {t('security.reauth.successResetSent')}
          </p>
        )}

        {/* Email Display */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: 'bold',
            fontSize: '14px'
          }}>
            {t('security.reauth.emailLabel')}
          </label>
          <input
            type="email"
            value={email}
            disabled
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '4px',
              border: '1px solid #ccc',
              boxSizing: 'border-box',
              backgroundColor: '#f5f5f5',
              color: '#999'
            }}
          />
        </div>

        {/* Google Sign-in Option */}
        {!showPasswordReset && (
          <>
            <button
              onClick={handleGoogleReAuth}
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                marginBottom: '1rem',
                backgroundColor: '#fff',
                color: '#333',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                opacity: loading ? 0.6 : 1
              }}
            >
              <img
                src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48cGF0aCBkPSJNMTcuNiA5LjJsLS4xLTEuOEg5djMuNGg0LjhDMTMuNiAxIDMuMzIgMTMgMTIgMTMuNnYyLjJIOXYuMkM1LjMgMTUuNSAyIDEyLjkgMiA5YzAtMy41IDIuNi02LjcgNi41LTYuN2gyLjdWMnoiIGZpbGw9IiM0Mjg1RjQiIGZpbGwtcnVsZT0ibm9uemVybyIvPjwvZz48L3N2Zz4="
                alt="Google"
                style={{ width: '16px', height: '16px' }}
              />
              {loading ? t('security.reauth.googleSigningIn') : t('security.reauth.googleSignIn')}
            </button>

            {/* Divider */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '1rem',
              gap: '1rem'
            }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#ddd' }} />
              <span style={{ color: '#999', fontSize: '12px' }}>{t('security.reauth.orDivider')}</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#ddd' }} />
            </div>

            {/* Password Option */}
            <form onSubmit={handlePasswordReAuth}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}>
                  {t('security.reauth.passwordLabel')}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('security.reauth.passwordPlaceholder')}
                    autoFocus
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      paddingRight: '2.5rem',
                      borderRadius: '4px',
                      border: '1px solid #ccc',
                      boxSizing: 'border-box',
                      opacity: loading ? 0.6 : 1
                    }}
                  />
                  {/* Eye Icon Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '18px',
                      padding: '0.25rem',
                      opacity: loading ? 0.5 : 0.7,
                      transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.opacity = loading ? '0.5' : '1'}
                    onMouseLeave={(e) => e.target.style.opacity = loading ? '0.5' : '0.7'}
                    title={showPassword ? t('security.reauth.hidePassword') : t('security.reauth.showPassword')}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !password.trim()}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  marginBottom: '1rem',
                  backgroundColor: '#7c63d8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  opacity: loading || !password.trim() ? 0.6 : 1
                }}
              >
                {loading ? t('security.reauth.verifying') : t('security.reauth.verify')}
              </button>

              <button
                type="button"
                onClick={() => setShowPasswordReset(true)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  backgroundColor: 'transparent',
                  color: '#7c63d8',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  textDecoration: 'underline'
                }}
              >
                {t('security.reauth.forgotPassword')}
              </button>
            </form>
          </>
        )}

        {/* Password Reset Form */}
        {showPasswordReset && (
          <div>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '1rem' }}>
              {t('security.reauth.passwordResetText')}
            </p>
            <button
              onClick={handlePasswordReset}
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                marginBottom: '1rem',
                backgroundColor: '#7c63d8',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? t('security.reauth.sending') : t('security.reauth.sendResetEmail')}
            </button>
            <button
              onClick={() => setShowPasswordReset(false)}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: '#f5f5f5',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {t('security.reauth.back')}
            </button>
          </div>
        )}

        {/* Bottom Actions */}
        {!showPasswordReset && (
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button
              onClick={onCancel}
              disabled={loading}
              style={{
                flex: 1,
                padding: '0.75rem',
                backgroundColor: '#f5f5f5',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              {t('security.reauth.cancel')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
