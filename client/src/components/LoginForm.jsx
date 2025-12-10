import React from 'react';
import { PasswordInput } from './PasswordInput';

/**
 * LoginForm Component
 * Simple email/password login form
 */
export function LoginForm({ 
  email, 
  setEmail, 
  password, 
  setPassword, 
  loading, 
  onSubmit,
  onSwitchToRegister,
  onForgotPassword
}) {
  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
      
      <PasswordInput
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        autoComplete="current-password"
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

      <div style={{ textAlign: 'center', fontSize: '0.9rem' }}>
        <p>
          Don't have an account?{' '}
          <button 
            type="button"
            onClick={onSwitchToRegister}
            style={{
              background: 'none',
              border: 'none',
              color: '#64B5F6',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Register
          </button>
        </p>
        <p>
          <button 
            type="button"
            onClick={onForgotPassword}
            style={{
              background: 'none',
              border: 'none',
              color: '#64B5F6',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Forgot password?
          </button>
        </p>
      </div>
    </form>
  );
}

export default LoginForm;
