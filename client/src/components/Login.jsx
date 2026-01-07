import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { useTranslation } from '../context/TranslationContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { useRegistrationFlow } from '../hooks/useRegistrationFlow';

/**
 * Login Component (Refactored)
 * Handles mode switching between login and register
 * Delegates form logic to sub-components
 * Delegates registration flow to custom hook
 * Supports browser back button to return from register/forgot to login
 */
export function Login() {
  const { t } = useTranslation();
  const [mode, setMode] = useState('login');
  
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
  const googleProvider = new GoogleAuthProvider();

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
      setError(err.message);
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ===== GOOGLE LOGIN =====
  const handleGoogleLogin = async () => {
    // On register mode, check terms/privacy acceptance
    if (mode === 'register') {
      if (!termsAccepted || !privacyAccepted) {
        setError(t('login.acceptTermsAndPrivacy'));
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(err.message);
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

        {/* FORGOT PASSWORD PLACEHOLDER */}
        {mode === 'forgot' && (
          <div style={{ textAlign: 'center' }}>
            <p>{t('login.forgotPasswordMessage')}</p>
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

        {/* DIVIDER AND GOOGLE LOGIN - Only on login and register, not forgot password */}
        {mode !== 'forgot' && (
          <>
            <div style={{ margin: '1rem 0', textAlign: 'center' }}>
              <p style={{ marginBottom: '0.5rem' }}>{t('login.or')}</p>
            </div>

            {/* GOOGLE LOGIN */}
            {/* On register mode: disabled until terms and privacy are accepted */}
            {/* On login mode: always enabled */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading || (mode === 'register' && (!termsAccepted || !privacyAccepted))}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '5px',
                border: '1px solid #ddd',
                backgroundColor: mode === 'register' && (!termsAccepted || !privacyAccepted) ? '#ccc' : '#fff',
                color: mode === 'register' && (!termsAccepted || !privacyAccepted) ? '#999' : '#333',
                fontSize: '1rem',
                cursor: loading || (mode === 'register' && (!termsAccepted || !privacyAccepted)) ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                opacity: mode === 'register' && (!termsAccepted || !privacyAccepted) ? 0.6 : 1
              }}
              title={mode === 'register' && (!termsAccepted || !privacyAccepted) ? t('login.acceptTermsAndPrivacy') : ''}
            >
              {t('login.googleSignIn')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Login;
