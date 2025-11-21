import React, { useState, useEffect } from 'react';
import '../styles/AuthModals.css';

const TwoFactorModal = ({ userId, tempToken, method, onSuccess, onBack }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setError('Code expired. Please request a new one.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');

    if (!code || code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/verify-2fa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tempToken}`
        },
        body: JSON.stringify({ userId, code })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Invalid code. Please try again.');
        setCode('');
        return;
      }

      // Store tokens
      localStorage.setItem('userId', userId);
      localStorage.setItem('token', data.token);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }

      onSuccess({
        userId,
        token: data.token
      });
    } catch (err) {
      setError('Failed to verify code: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content auth-modal">
        <button className="modal-close" onClick={onBack}>←</button>

        <div className="two-factor-content">
          <h2>Two-Factor Authentication</h2>
          <p className="subtitle">
            We've sent a 6-digit code to your {method === 'email' ? 'email address' : 'phone number'}
          </p>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleVerify}>
            <div className="form-group">
              <label>Verification Code</label>
              <input
                type="text"
                value={code}
                onChange={handleCodeChange}
                placeholder="000000"
                maxLength="6"
                className="code-input"
                disabled={loading || timeLeft === 0}
                autoFocus
              />
              <div className="code-input-help">
                Enter the {method === 'email' ? 'code from your email' : '6-digit code from the SMS'}
              </div>
            </div>

            <div className="timer">
              Code expires in: <span className={timeLeft < 60 ? 'warning' : ''}>
                {formatTime(timeLeft)}
              </span>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading || code.length !== 6 || timeLeft === 0}
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
          </form>

          <button
            type="button"
            className="btn-link"
            onClick={onBack}
            disabled={loading}
          >
            Use different sign-in method
          </button>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorModal;
