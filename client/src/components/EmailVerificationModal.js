import React, { useState, useEffect } from 'react';
import '../styles/AuthModals.css';

const EmailVerificationModal = ({ userId, onVerifySuccess, onBackClick }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [canResend, setCanResend] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setCanResend(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');

    if (!code.trim()) {
      setError('Please enter the verification code');
      return;
    }

    if (code.length !== 6 || !/^\d+$/.test(code)) {
      setError('Code must be 6 digits');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Verification failed');
        return;
      }

      // Email verified successfully - return to login
      onVerifySuccess();
    } catch (err) {
      setError('Failed to connect to server: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, resend: true })
      });

      if (response.ok) {
        setCode('');
        setTimeLeft(600);
        setCanResend(false);
      }
    } catch (err) {
      setError('Failed to resend code: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onBackClick}>
      <div className="modal-content auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onBackClick}>×</button>

        <h2>Verify Your Email</h2>
        <p className="form-subtitle">
          We've sent a verification code to your email. Enter it below to complete registration.
        </p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleVerify}>
          <div className="form-group">
            <label>Verification Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(val);
              }}
              placeholder="000000"
              maxLength="6"
              className="code-input"
              disabled={loading}
              autoComplete="off"
            />
            <small className="code-input-help">6-digit code from your email</small>
          </div>

          <div className="timer" style={{
            color: timeLeft < 60 ? '#ff6666' : '#666'
          }}>
            {timeLeft > 0 ? (
              <>
                Code expires in: <span className={timeLeft < 60 ? 'warning' : ''}>{formatTime(timeLeft)}</span>
              </>
            ) : (
              <span style={{ color: '#ff6666' }}>Code expired</span>
            )}
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || code.length !== 6 || timeLeft <= 0}
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>

          <button
            type="button"
            className="btn-link"
            onClick={handleResend}
            disabled={!canResend || loading}
            style={{ marginTop: '1rem', display: 'block', textAlign: 'center', width: '100%' }}
          >
            {canResend ? 'Resend Code' : `Resend available in ${formatTime(timeLeft)}`}
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={onBackClick}
            disabled={loading}
            style={{ marginTop: '0.5rem' }}
          >
            Back to Login
          </button>
        </form>

        <div className="security-info">
          <p>
            <strong>Didn't receive the code?</strong> Check your spam folder or click "Resend Code" above after the timer expires.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationModal;
