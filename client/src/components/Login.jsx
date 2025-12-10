import React, { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { useRegistrationFlow } from '../hooks/useRegistrationFlow';

/**
 * Login Component (Refactored)
 * Handles mode switching between login and register
 * Delegates form logic to sub-components
 * Delegates registration flow to custom hook
 */
export function Login() {
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
      setError('You must accept Terms of Service and Privacy Policy to create an account');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      await registerWithEmail(email, password, termsAccepted, privacyAccepted);
      setSuccessMessage('Account created! Check your email to verify your account.');
      
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
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: 'white'
    }}>
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
          {mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Reset Password'}
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
            <p>Forgot password flow coming soon</p>
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
              Back to login
            </button>
          </div>
        )}

        {/* DIVIDER */}
        {mode !== 'forgot' && (
          <>
            <div style={{ margin: '1rem 0', textAlign: 'center' }}>
              <p style={{ marginBottom: '0.5rem' }}>or</p>
            </div>

            {/* GOOGLE LOGIN */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '5px',
                border: '1px solid #ddd',
                backgroundColor: '#fff',
                color: '#333',
                fontSize: '1rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              Sign In with Google
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Login;
