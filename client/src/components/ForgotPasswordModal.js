import React, { useState, useEffect } from 'react';
import '../styles/AuthModals.css';

const ForgotPasswordModal = ({ onSuccess, onBack }) => {
  const [step, setStep] = useState('email'); // 'email', 'code', 'newPassword'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes for password reset
  const [passwordStrength, setPasswordStrength] = useState(0);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

  // Timer for password reset code
  useEffect(() => {
    if (step !== 'code') return;

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
  }, [step]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const checkPasswordStrength = (pwd) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) strength++;
    setPasswordStrength(strength);
  };

  const getPasswordStrengthLabel = () => {
    switch (passwordStrength) {
      case 0:
      case 1:
        return { label: 'Weak', color: '#ff4444' };
      case 2:
        return { label: 'Fair', color: '#ffaa00' };
      case 3:
        return { label: 'Good', color: '#44aa44' };
      case 4:
        return { label: 'Strong', color: '#0099ff' };
      default:
        return { label: '', color: '' };
    }
  };

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to request password reset');
        return;
      }

      // Move to code entry step
      setStep('code');
      setTimeLeft(900); // Reset timer to 15 minutes
    } catch (err) {
      setError('Failed to connect: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');

    if (!code || code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    try {
      // For password reset, we need to validate the code exists
      // The actual userId will be returned by the forgot-password endpoint
      // For now, we'll move to the password step
      setStep('newPassword');
    } catch (err) {
      setError('Failed to verify code: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== newPasswordConfirm) {
      setError('Passwords do not match');
      return;
    }

    if (passwordStrength < 4) {
      setError('Password must meet all strength requirements');
      return;
    }

    setLoading(true);
    try {
      // For now, we'll use a placeholder userId
      // In production, this would come from the forgot-password response
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId || 'placeholder', // Would be real userId from server
          code,
          newPassword,
          newPasswordConfirm
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to reset password');
        return;
      }

      onSuccess({
        type: 'passwordReset',
        message: 'Password reset successful. Please log in with your new password.'
      });
    } catch (err) {
      setError('Failed to reset password: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const strengthLabel = getPasswordStrengthLabel();

  return (
    <div className="modal-overlay">
      <div className="modal-content auth-modal">
        <button className="modal-close" onClick={onBack}>←</button>

        {step === 'email' && (
          <form onSubmit={handleRequestCode}>
            <h2>Reset Your Password</h2>
            <p className="subtitle">
              Enter your email address and we'll send you a verification code
            </p>

            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Sending code...' : 'Send Verification Code'}
            </button>

            <button
              type="button"
              className="btn-link"
              onClick={onBack}
              disabled={loading}
            >
              Back to log in
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={handleVerifyCode}>
            <h2>Verify Your Identity</h2>
            <p className="subtitle">
              Enter the 6-digit code we sent to your phone
            </p>

            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label>Verification Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCode(value);
                }}
                placeholder="000000"
                maxLength="6"
                className="code-input"
                disabled={loading || timeLeft === 0}
                autoFocus
              />
              <div className="code-input-help">
                Enter the 6-digit code from your SMS message
              </div>
            </div>

            <div className="timer">
              Code expires in: <span className={timeLeft < 300 ? 'warning' : ''}>
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

            <button
              type="button"
              className="btn-link"
              onClick={() => {
                setStep('email');
                setCode('');
                setError('');
              }}
              disabled={loading}
            >
              Request a new code
            </button>
          </form>
        )}

        {step === 'newPassword' && (
          <form onSubmit={handleResetPassword}>
            <h2>Create New Password</h2>
            <p className="subtitle">
              Enter your new password. Make sure it's strong and unique.
            </p>

            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  checkPasswordStrength(e.target.value);
                }}
                placeholder="••••••••"
                disabled={loading}
              />
              <div className="password-strength">
                <div className="strength-bar">
                  <div
                    className="strength-fill"
                    style={{
                      width: `${(passwordStrength / 4) * 100}%`,
                      backgroundColor: strengthLabel.color
                    }}
                  ></div>
                </div>
                <span style={{ color: strengthLabel.color }}>
                  {strengthLabel.label}
                </span>
              </div>
              <div className="password-requirements">
                <p>Password must contain:</p>
                <ul>
                  <li className={newPassword.length >= 8 ? 'met' : ''}>
                    ✓ At least 8 characters
                  </li>
                  <li className={/[A-Z]/.test(newPassword) ? 'met' : ''}>
                    ✓ One uppercase letter
                  </li>
                  <li className={/[0-9]/.test(newPassword) ? 'met' : ''}>
                    ✓ One number
                  </li>
                  <li className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword) ? 'met' : ''}>
                    ✓ One special character
                  </li>
                </ul>
              </div>
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
              />
              {newPassword && newPasswordConfirm && newPassword === newPasswordConfirm && (
                <span className="match-indicator">✓ Passwords match</span>
              )}
              {newPassword && newPasswordConfirm && newPassword !== newPasswordConfirm && (
                <span className="mismatch-indicator">✗ Passwords do not match</span>
              )}
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading || passwordStrength < 4 || newPassword !== newPasswordConfirm}
            >
              {loading ? 'Resetting password...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
