import React from 'react';
import { PasswordInput } from './PasswordInput';
import { TermsCheckbox } from './TermsCheckbox';

/**
 * RegisterForm Component
 * Email, password, and T&C checkbox form for registration
 */
export function RegisterForm({
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  termsAccepted,
  setTermsAccepted,
  privacyAccepted,
  setPrivacyAccepted,
  loading,
  onSubmit,
  onSwitchToLogin
}) {
  const isFormValid = termsAccepted && privacyAccepted && password === confirmPassword && password.length >= 6;

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
        placeholder="Password (min 6 characters)"
        autoComplete="new-password"
      />
      
      <PasswordInput
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirm Password"
        autoComplete="new-password"
      />

      {/* T&C Checkboxes */}
      <TermsCheckbox
        termsAccepted={termsAccepted}
        privacyAccepted={privacyAccepted}
        onTermsChange={setTermsAccepted}
        onPrivacyChange={setPrivacyAccepted}
        disabled={loading}
      />

      <button 
        type="submit" 
        disabled={loading || !isFormValid}
        style={{
          padding: '0.75rem',
          borderRadius: '5px',
          border: 'none',
          backgroundColor: (loading || !isFormValid) ? '#666' : '#4CAF50',
          color: 'white',
          fontSize: '1rem',
          cursor: (loading || !isFormValid) ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Creating account...' : 'Create Account'}
      </button>

      <div style={{ textAlign: 'center', fontSize: '0.9rem' }}>
        <p>
          Already have an account?{' '}
          <button 
            type="button"
            onClick={onSwitchToLogin}
            style={{
              background: 'none',
              border: 'none',
              color: '#64B5F6',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Sign in
          </button>
        </p>
      </div>
    </form>
  );
}

export default RegisterForm;
