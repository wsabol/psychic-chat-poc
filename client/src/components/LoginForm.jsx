import React from 'react';
import { useTranslation } from '../context/TranslationContext';
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
  const { t } = useTranslation();
  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <input
        type="email"
        placeholder={t('login.email')}
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
        placeholder={t('login.password')}
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
        {loading ? t('login.signingIn') : t('login.signIn')}
      </button>

      <div style={{ textAlign: 'center', fontSize: '0.9rem' }}>
        <p>
          {t('login.dontHaveAccount')}{' '}
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
            {t('login.register')}
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
            {t('login.forgotPassword')}
          </button>
        </p>
      </div>
    </form>
  );
}

export default LoginForm;
