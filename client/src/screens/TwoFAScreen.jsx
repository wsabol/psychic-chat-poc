import React, { useState, useEffect } from 'react';
import { useTranslation } from '../context/TranslationContext';
import { logErrorFromCatch } from '../shared/errorLogger.js';
import '../styles/screens/TwoFAScreen.css';

const RESEND_COOLDOWN_SECONDS = 60;

/**
 * TwoFAScreen - Full screen 2FA verification
 * Includes:
 *  - Code entry with real-time validation
 *  - Resend code button (60-second cooldown)
 *  - Trust device checkbox
 *  - "Code valid for 10 minutes" info (NOT "expired" - that was a bug)
 *  - "Expired" message only when the error is actually about expiry
 */
export default function TwoFAScreen({
  userId,
  tempToken,
  method = 'email',
  onVerified,
  onSignOut,
  verify2FAFunc,
  isLoading = false,
  error: initialError = null
}) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [error, setError] = useState(initialError);
  const [verifying, setVerifying] = useState(false);
  const [trustDevice, setTrustDevice] = useState(false);

  // Resend state
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Propagate external error changes (e.g. from auth hook)
  useEffect(() => {
    if (initialError) setError(initialError);
  }, [initialError]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleCodeChange = (e) => {
    // Only allow digits, max 6
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(val);
    // Clear error when user starts typing a new code
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!code || code.length !== 6) {
      setError(t('twoFactor.errors.invalidCode'));
      return;
    }

    setVerifying(true);
    setError('');

    try {
      let success = false;

      if (verify2FAFunc) {
        // Use verify2FA from authState - this updates auth state directly
        success = await verify2FAFunc(code, trustDevice);
        if (!success) {
          // Error is already set by verify2FA hook
          setCode('');
          return;
        }
      } else {
        // Fallback to direct API call (shouldn't happen in normal flow)
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
        const response = await fetch(`${API_URL}/auth/verify-2fa`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tempToken}`
          },
          body: JSON.stringify({ userId, code, trustDevice })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          setError(data.error || t('twoFactor.errors.invalidCode'));
          setCode('');
          return;
        }

        success = true;
      }

      if (success) {
        // Auth state change drives navigation — just call the callback
        onVerified();
      }
    } catch (err) {
      logErrorFromCatch('[2FA-SCREEN] Error:', err);
      setError(t('errors.server'));
      setCode('');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending || !userId) return;

    setResending(true);
    setResendMessage('');
    setError('');

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_URL}/auth/check-2fa/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResendMessage(t('twoFactor.resendSuccess') || '✓ New code sent! Check your email.');
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
        setCode('');
      } else {
        setResendMessage(
          data.error || t('twoFactor.resendFailed') || 'Failed to send code. Please try again.'
        );
      }
    } catch (err) {
      logErrorFromCatch('[2FA-RESEND] Error:', err);
      setResendMessage(t('twoFactor.resendFailed') || 'Failed to send code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  // Determine if the error is specifically about expiry
  const isExpiredError = error && (
    error.toLowerCase().includes('expir') ||
    error === t('twoFactor.errors.expired')
  );

  return (
    <div className="twofa-screen-container">
      <div className="twofa-screen-content">
        <div className="twofa-screen-header">
          <h1 className="twofa-screen-title">🔐 {t('twoFactor.title')}</h1>
        </div>

        <div className="twofa-screen-body">
          <div className="twofa-message-section">
            <p className="twofa-message">
              {t('twoFactor.message', { method: method })}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="twofa-form-section">
            <div className="twofa-input-wrapper">
              <label htmlFor="twofa-code" className="twofa-code-label">
                {t('twoFactor.enterCode')}
              </label>
              <input
                id="twofa-code"
                type="text"
                inputMode="numeric"
                maxLength="6"
                value={code}
                onChange={handleCodeChange}
                placeholder="000000"
                className="twofa-code-input"
                disabled={verifying || isLoading}
                autoFocus
              />
              {/* Show code validity info — NOT "expired" (that was the bug) */}
              <p className="twofa-code-info">
                {t('twoFactor.codeInfo') || '⏱️ Code valid for 10 minutes'}
              </p>
            </div>

            {/* Error message — only show when there's actually an error */}
            {error && (
              <div className="twofa-error-message">
                ⚠️ {error}
                {isExpiredError && (
                  <span>
                    {' '}
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resending || resendCooldown > 0}
                      className="twofa-inline-resend"
                    >
                      {t('twoFactor.resend') || 'Send new code'}
                    </button>
                  </span>
                )}
              </div>
            )}

            {/* Resend feedback message */}
            {resendMessage && (
              <div className={`twofa-resend-message ${resendMessage.startsWith('✓') ? 'twofa-resend-success' : 'twofa-resend-error'}`}>
                {resendMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={verifying || isLoading || code.length !== 6}
              className="twofa-verify-button"
            >
              {verifying ? t('common.loading') : t('twoFactor.verify')}
            </button>

            {/* Resend Code button */}
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || resendCooldown > 0 || verifying || isLoading}
              className="twofa-resend-button"
            >
              {resending
                ? (t('common.loading') || 'Sending...')
                : resendCooldown > 0
                  ? (t('twoFactor.resendCooldown', { seconds: resendCooldown }) || `Resend in ${resendCooldown}s`)
                  : (t('twoFactor.resend') || 'Resend Code')}
            </button>

            {/* Trust Device Checkbox */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.9rem',
              marginTop: '1rem',
              padding: '0.75rem',
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderRadius: '4px',
              userSelect: 'none',
              color: '#ccc'
            }}>
              <input
                type="checkbox"
                checked={trustDevice}
                onChange={(e) => setTrustDevice(e.target.checked)}
                disabled={verifying || isLoading}
                style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#7c63d8' }}
              />
              <span>
                <strong style={{ color: '#ddd' }}>{t('twoFactor.trustDevice') || 'Trust this device'}</strong>
                <br />
                <span style={{ fontSize: '0.8rem', color: '#888' }}>
                  {t('twoFactor.trustDeviceHint') || 'Skip 2FA on this browser next time'}
                </span>
              </span>
            </label>
          </form>
        </div>

        <div className="twofa-screen-footer">
          <button
            onClick={onSignOut}
            disabled={verifying || isLoading}
            className="twofa-signout-button"
          >
            {t('verification.actions.signOut')}
          </button>
        </div>
      </div>
    </div>
  );
}
