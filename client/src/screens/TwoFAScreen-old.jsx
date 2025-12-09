import React, { useState } from 'react';
import '../styles/screens/TwoFAScreen.css';

/**
 * TwoFAScreen - Full screen 2FA verification
 * Similar to VerificationScreen but for 2FA code entry
 */
export default function TwoFAScreen({
  userId,
  tempToken,
  method = 'email',
  onVerified,
  onSignOut,
  isLoading = false,
  error: initialError = null
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(initialError);
  const [verifying, setVerifying] = useState(false);

  const handleCodeChange = (e) => {
    // Only allow digits, max 6
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!code || code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setVerifying(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3000/auth/verify-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tempToken}`
        },
        body: JSON.stringify({
          userId,
          code
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Invalid code');
        setCode('');
        return;
      }

      console.log('[2FA-SCREEN] Verification successful');
      onVerified(data);
    } catch (err) {
      console.error('[2FA-SCREEN] Error:', err);
      setError('Failed to verify code. Please try again.');
      setCode('');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="twofa-screen-container">
      <div className="twofa-screen-content">
        <div className="twofa-screen-header">
          <h1 className="twofa-screen-title">🔐 Two-Factor Authentication</h1>
        </div>

        <div className="twofa-screen-body">
          <div className="twofa-message-section">
            <p className="twofa-message">
              A 6-digit verification code has been sent to your email address.
            </p>
            <p className="twofa-submessage">
              Please enter the code below to complete your login.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="twofa-form-section">
            <div className="twofa-input-wrapper">
              <label htmlFor="twofa-code" className="twofa-code-label">
                Verification Code
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
              <p className="twofa-code-hint">6 digits</p>
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
              {verifying ? 'Verifying...' : 'Verify Code'}
            </button>

            <p className="twofa-code-expiry">
              Code expires in 10 minutes
            </p>
          </form>
        </div>

        <div className="twofa-screen-footer">
          <button
            onClick={onSignOut}
            disabled={verifying || isLoading}
            className="twofa-signout-button"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
