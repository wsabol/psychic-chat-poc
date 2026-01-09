import React, { useState } from 'react';
import { useTranslation } from '../context/TranslationContext';
import '../styles/screens/TwoFAScreen.css';

/**
 * TwoFAScreen - Full screen 2FA verification
 * Includes option to trust device for 30 days
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

  const handleCodeChange = (e) => {
    // Only allow digits, max 6
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(val);
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
          // Error is already set by verify2FA
          setCode('');
          return;
        }
      } else {
        // Fallback to API call (shouldn't happen in normal flow)
        const response = await fetch('http://localhost:3000/auth/verify-2fa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tempToken}`
          },
          body: JSON.stringify({
            userId,
            code,
            trustDevice
          })
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
        // Don't need to do anything - auth state change will trigger navigation
        onVerified();
      }
    } catch (err) {
      console.error('[2FA-SCREEN] Error:', err);
      setError(t('errors.server'));
      setCode('');
    } finally {
      setVerifying(false);
    }
  };

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
              <p className="twofa-code-hint">{t('twoFactor.enterCode')}</p>
            </div>

            {error && (
              <div className="twofa-error-message">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={verifying || isLoading || code.length !== 6}
              className="twofa-verify-button"
            >
              {verifying ? t('common.loading') : t('twoFactor.verify')}
            </button>

                        <p className="twofa-code-expiry">
              {t('twoFactor.errors.expired')}
            </p>

            {/* Trust Device Checkbox */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.9rem',
              marginTop: '1rem',
              padding: '0.75rem',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              userSelect: 'none'
            }}>
              <input
                type="checkbox"
                checked={trustDevice}
                onChange={(e) => setTrustDevice(e.target.checked)}
                disabled={verifying || isLoading}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
              />
                            <span>
                <strong>{t('twoFactor.title')}</strong>
                <br />
                <span style={{ fontSize: '0.85rem', color: '#666' }}>{t('security.trustedDevices.heading')}</span>
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
