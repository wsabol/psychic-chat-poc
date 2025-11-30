import React, { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth } from '../firebase';

export function Login() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const googleProvider = new GoogleAuthProvider();

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

  const handleEmailRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');
    
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
      console.log('[AUTH] Creating user with email:', email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('[AUTH] User created successfully:', userCredential.user.uid);
      
      // Send verification email with actionCodeSettings
      console.log('[EMAIL-VERIFY] Attempting to send verification email...');
      try {
        const actionCodeSettings = {
          url: window.location.origin,
          handleCodeInApp: false
        };
        console.log('[EMAIL-VERIFY] Action code settings:', actionCodeSettings);
        console.log('[EMAIL-VERIFY] Window location origin:', window.location.origin);
        
        await sendEmailVerification(userCredential.user, actionCodeSettings);
        console.log('[EMAIL-VERIFY] ✓ Verification email sent');
        setSuccessMessage('Account created! Check your email to verify your account.');
      } catch (verifyErr) {
        console.error('[EMAIL-VERIFY] ✗ Failed to send verification email');
        console.error('[EMAIL-VERIFY] Error code:', verifyErr.code);
        console.error('[EMAIL-VERIFY] Error message:', verifyErr.message);
        
        setSuccessMessage('Account created! Proceeding to verification screen...');
        console.log('[EMAIL-VERIFY] Note: User will go to verification screen regardless');
      }
      
    } catch (err) {
      console.error('[AUTH] Registration failed:', err.code, err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
        width: '90%'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          {mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Reset Password'}
        </h2>
        
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
        
        {/* LOGIN MODE */}
        {mode === 'login' && (
          <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input
              type="email"
              placeholder="Email"
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
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
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
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* REGISTER MODE */}
        {mode === 'register' && (
          <form onSubmit={handleEmailRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input
              type="email"
              placeholder="Email"
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
            <input
              type="password"
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              style={{
                padding: '0.75rem',
                borderRadius: '5px',
                border: 'none',
                fontSize: '1rem'
              }}
            />
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
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
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}
        
        <div style={{ margin: '1rem 0', textAlign: 'center' }}>
          <p style={{ marginBottom: '0.5rem' }}>or</p>
        </div>
        
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
        
        <div style={{
          marginTop: '1.5rem',
          textAlign: 'center',
          fontSize: '0.9rem'
        }}>
          {mode === 'login' && (
            <>
              <p>Don't have an account? <button onClick={() => { setMode('register'); setError(''); setSuccessMessage(''); }} style={{background: 'none', border: 'none', color: '#64B5F6', cursor: 'pointer', textDecoration: 'underline'}}>Register</button></p>
              <p><button onClick={() => { setMode('forgot'); setError(''); setSuccessMessage(''); }} style={{background: 'none', border: 'none', color: '#64B5F6', cursor: 'pointer', textDecoration: 'underline'}}>Forgot password?</button></p>
            </>
          )}
          {mode === 'register' && (
            <p>Already have an account? <button onClick={() => { setMode('login'); setError(''); setSuccessMessage(''); }} style={{background: 'none', border: 'none', color: '#64B5F6', cursor: 'pointer', textDecoration: 'underline'}}>Sign in</button></p>
          )}
          {mode === 'forgot' && (
            <p><button onClick={() => { setMode('login'); setError(''); setSuccessMessage(''); }} style={{background: 'none', border: 'none', color: '#64B5F6', cursor: 'pointer', textDecoration: 'underline'}}>Back to login</button></p>
          )}
        </div>
      </div>
    </div>
  );
}
