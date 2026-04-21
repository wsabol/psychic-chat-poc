import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { useTranslation } from '../context/TranslationContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { SocialProviders } from './SocialProviders';
import { useRegistrationFlow } from '../hooks/useRegistrationFlow';

/**
 * Login Component (Refactored)
 * Handles mode switching between login and register
 * Delegates form logic to sub-components
 * Delegates registration flow to custom hook
 * Supports browser back button to return from register/forgot to login
 */
export function Login({ defaultMode = 'login' }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState(defaultMode);
  
  // Shared state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Register-specific state
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  
  const { registerWithEmail } = useRegistrationFlow();

  // ===== BROWSER BACK BUTTON SUPPORT =====
  useEffect(() => {
    // Push initial state when component mounts
    window.history.pushState({ mode: 'login' }, null, window.location.href);

    const handlePopState = (event) => {
      // When user clicks browser back button, go back to login
      if (mode !== 'login') {
        setMode('login');
        setError('');
        setSuccessMessage('');
        setTermsAccepted(false);
        setPrivacyAccepted(false);
        // Push the login state to history
        window.history.pushState({ mode: 'login' }, null, window.location.href);
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [mode]);

  // ===== UPDATE HISTORY WHEN MODE CHANGES =====
  useEffect(() => {
    if (mode !== 'login') {
      // When switching to register or forgot mode, push a new history state
      window.history.pushState({ mode: mode }, null, window.location.href);
    }
  }, [mode]);

  // ===== LOGIN HANDLER =====
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      // auth/invalid-credential covers both "wrong password" and "no account".
      // Show a clear error instead of auto-redirecting to register, which was
      // confusing users with valid accounts who mistyped their password.
      if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password'
      ) {
        setError(
          t('login.errors.invalidCredentials') ||
          'Invalid email or password. Please try again.'
        );
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // ===== FORGOT PASSWORD HANDLER =====
  const handleSendPasswordReset = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage(
        t('login.resetEmailSent') ||
        'Password reset email sent! Check your inbox (and spam folder).'
      );
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        // Don't reveal whether the email exists (security best practice)
        setSuccessMessage(
          t('login.resetEmailSent') ||
          'Password reset email sent! Check your inbox (and spam folder).'
        );
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // ===== REGISTER HANDLER =====
  const handleEmailRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    // Validation
    if (!termsAccepted || !privacyAccepted) {
      setError(t('login.acceptTermsAndPrivacy'));
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError(t('login.passwordsDontMatch'));
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError(t('login.passwordTooShort'));
      setLoading(false);
      return;
    }

    try {
      await registerWithEmail(email, password, termsAccepted, privacyAccepted);
      setSuccessMessage(t('login.accountCreated'));
      
      // Reset form
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setTermsAccepted(false);
      setPrivacyAccepted(false);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setSuccessMessage(t('login.alreadyRegistered'));
        setTimeout(() => {
          setSuccessMessage('');
          setMode('login');
          setError('');
        }, 1000);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };


  // ===== MODE SWITCH HANDLERS =====
  const handleSwitchToRegister = () => {
    setMode('register');
    setError('');
    setSuccessMessage('');
  };

  const handleSwitchToLogin = () => {
    setMode('login');
    setError('');
    setSuccessMessage('');
    setTermsAccepted(false);
    setPrivacyAccepted(false);
  };

  const handleForgotPassword = () => {
    setMode('forgot');
    setError('');
    setSuccessMessage('');
  };

  const handleBackToLogin = () => {
    setMode('login');
    setError('');
    setSuccessMessage('');
  };

  // ===== RENDER =====
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      // 100vh keeps the centering stable regardless of keyboard state.
      // (var(--real-100vh) is NOT used here because it updates when the
      // virtual keyboard opens, collapsing the card to a tiny height.)
      minHeight: '100vh',
      backgroundColor: 'transparent',
      color: 'white',
      position: 'relative'
    }}>
      {/* Language Switcher */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        zIndex: 100
      }}>
        <LanguageSwitcher compact={true} />
      </div>

      <div style={{
        backgroundColor: 'rgba(30, 30, 60, 0.9)',
        padding: '2rem',
        borderRadius: '10px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        maxWidth: '400px',
        width: '90%',
        // 90vh keeps the card stable — using var(--real-100vh) here would
        // collapse the card whenever the virtual keyboard opened.
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Title */}
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          {mode === 'login' ? t('login.pageTitle') : mode === 'register' ? t('login.createAccountTitle') : t('login.resetPasswordTitle')}
        </h2>

        {/* Error Message */}
        {error && (
          <div style={{
            backgroundColor: '#ff6b6b',
            color: 'white',
            padding: '0.75rem',
            borderRadius: '5px',
            marginBottom: '1rem',
            textAlign: 'center',
            fontSize: '0.9rem'
          }}>
            {error}
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div style={{
            backgroundColor: '#51cf66',
            color: 'white',
            padding: '0.75rem',
            borderRadius: '5px',
            marginBottom: '1rem',
            textAlign: 'center',
            fontSize: '0.9rem'
          }}>
            {successMessage}
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <LoginForm
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            loading={loading}
            onSubmit={handleEmailLogin}
            onSwitchToRegister={handleSwitchToRegister}
            onForgotPassword={handleForgotPassword}
          />
        )}

        {/* REGISTER FORM */}
        {mode === 'register' && (
          <RegisterForm
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            termsAccepted={termsAccepted}
            setTermsAccepted={setTermsAccepted}
            privacyAccepted={privacyAccepted}
            setPrivacyAccepted={setPrivacyAccepted}
            loading={loading}
            onSubmit={handleEmailRegister}
            onSwitchToLogin={handleSwitchToLogin}
          />
        )}

        {/* FORGOT PASSWORD */}
        {mode === 'forgot' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ marginBottom: '1rem', color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
              {t('login.forgotPasswordInstructions') ||
                "Enter your email address and we'll send you a link to reset your password."}
            </p>
            <form
              onSubmit={handleSendPasswordReset}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}
            >
              <input
                type="email"
                placeholder={t('login.email') || 'Email'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={{
                  padding: '0.75rem',
                  borderRadius: '5px',
                  border: 'none',
                  fontSize: '1rem'
                }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '0.75rem',
                  borderRadius: '5px',
                  border: 'none',
                  backgroundColor: loading ? '#666' : '#4CAF50',
                  color: 'white',
                  fontSize: '1rem',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading
                  ? (t('login.sending') || 'Sending…')
                  : (t('login.sendResetLink') || 'Send Reset Link')}
              </button>
            </form>
            <button
              onClick={handleBackToLogin}
              style={{
                background: 'none',
                border: 'none',
                color: '#64B5F6',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              {t('login.backToLogin')}
            </button>
          </div>
        )}

        {/* SOCIAL PROVIDERS - Only on login and register, not forgot password */}
        {mode !== 'forgot' && (
          <SocialProviders
            mode={mode}
            termsAccepted={termsAccepted}
            privacyAccepted={privacyAccepted}
            loading={loading}
            setLoading={setLoading}
            setError={setError}
          />
        )}
      </div>
    </div>
  );
}

export default Login;
