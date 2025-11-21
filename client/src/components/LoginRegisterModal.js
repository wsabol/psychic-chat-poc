import React, { useState } from 'react';
import '../styles/AuthModals.css';

const LoginRegisterModal = ({ onClose, onLoginSuccess }) => {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

  // Password strength indicator
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

  const validateLogin = () => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!password.trim()) {
      setError('Password is required');
      return false;
    }
    return true;
  };

  const validateRegister = () => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!password.trim()) {
      setError('Password is required');
      return false;
    }
    if (password !== passwordConfirm) {
      setError('Passwords do not match');
      return false;
    }
    if (passwordStrength < 4) {
      setError('Password must include uppercase, number, and special character');
      return false;
    }
    if (!phoneNumber.trim()) {
      setError('Phone number is required');
      return false;
    }
    return true;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateLogin()) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      if (data.requires2FA) {
        // User needs to verify 2FA code
        onLoginSuccess({
          type: '2fa',
          userId: data.userId,
          tempToken: data.tempToken,
          method: data.method
        });
      } else {
        // Login successful
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('token', data.token);
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        localStorage.setItem('authEmail', data.email);
        onLoginSuccess({
          type: 'success',
          userId: data.userId,
          email: data.email,
          token: data.token,
          refreshToken: data.refreshToken
        });
      }
    } catch (err) {
      setError('Failed to connect to server: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateRegister()) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          phoneNumber
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      // Redirect to email verification
      onLoginSuccess({
        type: 'emailVerification',
        userId: data.userId
      });
    } catch (err) {
      setError('Failed to connect to server: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const strengthLabel = getPasswordStrengthLabel();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>

        <div className="auth-tabs">
          <button
            className={`tab-button ${mode === 'login' ? 'active' : ''}`}
            onClick={() => {
              setMode('login');
              setError('');
              setPassword('');
              setPasswordConfirm('');
              setPhoneNumber('');
            }}
          >
            Log In
          </button>
          <button
            className={`tab-button ${mode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setMode('register');
              setError('');
              setPassword('');
              setPasswordConfirm('');
            }}
          >
            Register
          </button>
        </div>

        {mode === 'login' ? (
          // LOGIN FORM
          <form onSubmit={handleLogin}>
            <h2>Log In to Psychic Chat</h2>

            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>

            <button
              type="button"
              className="btn-link"
              onClick={() => onLoginSuccess({ type: 'forgotPassword' })}
            >
              Forgot your password?
            </button>
          </form>
        ) : (
          // REGISTER FORM
          <form onSubmit={handleRegister}>
            <h2>Create Your Account</h2>
            <p className="form-subtitle">
              Join thousands of users exploring their cosmic destiny
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
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  checkPasswordStrength(e.target.value);
                }}
                placeholder="••••••••"
                disabled={loading}
                autoComplete="new-password"
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
                  <li className={password.length >= 8 ? 'met' : ''}>
                    ✓ At least 8 characters
                  </li>
                  <li className={/[A-Z]/.test(password) ? 'met' : ''}>
                    ✓ One uppercase letter
                  </li>
                  <li className={/[0-9]/.test(password) ? 'met' : ''}>
                    ✓ One number
                  </li>
                  <li className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? 'met' : ''}>
                    ✓ One special character (!@#$%^&* etc)
                  </li>
                </ul>
              </div>
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                autoComplete="new-password"
              />
              {password && passwordConfirm && password === passwordConfirm && (
                <span className="match-indicator">✓ Passwords match</span>
              )}
              {password && passwordConfirm && password !== passwordConfirm && (
                <span className="mismatch-indicator">✗ Passwords do not match</span>
              )}
            </div>

            <div className="form-group">
              <label>Phone Number (for 2FA)</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="(123) 456-7890 or +1234567890"
                disabled={loading}
                autoComplete="tel"
              />
              <small>We'll send verification codes via text message</small>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading || passwordStrength < 4 || password !== passwordConfirm}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>

            <p className="terms-text">
              By registering, you agree to our Privacy Policy and Terms of Service
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginRegisterModal;

