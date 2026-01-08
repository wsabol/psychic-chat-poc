import React, { useState, useMemo } from 'react';
import { useTranslation } from '../context/TranslationContext';
import { PasswordInput } from './PasswordInput';
import { TermsCheckbox } from './TermsCheckbox';

/**
 * Password Validation Rules
 */
const PASSWORD_REQUIREMENTS = {
  minLength: { regex: /.{8,}/, label: 'At least 8 characters' },
  hasUpperCase: { regex: /[A-Z]/, label: 'One uppercase letter (A-Z)' },
  hasLowerCase: { regex: /[a-z]/, label: 'One lowercase letter (a-z)' },
  hasNumber: { regex: /[0-9]/, label: 'One number (0-9)' },
  hasSpecialChar: { regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,./<>?]/, label: 'One special character (!@#$%...)' },
};

function validatePassword(pwd) {
  const results = {};
  Object.entries(PASSWORD_REQUIREMENTS).forEach(([key, { regex }]) => {
    results[key] = regex.test(pwd);
  });
  return results;
}

function getPasswordStrength(pwd) {
  if (!pwd) return 0;
  const validation = validatePassword(pwd);
  const passedChecks = Object.values(validation).filter(Boolean).length;
  return passedChecks;
}

function getStrengthColor(strength) {
  if (strength < 2) return '#d32f2f'; // Red
  if (strength < 4) return '#f57c00'; // Orange
  return '#388e3c'; // Green
}

function getStrengthLabel(strength) {
  if (strength === 0) return 'No requirements met';
  if (strength < 2) return 'Weak';
  if (strength < 4) return 'Fair';
  if (strength < 5) return 'Good';
  return 'Strong';
}

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
    onSwitchToLogin,
  isFreeTrial = false
}) {
  const { t } = useTranslation();
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  
  const passwordValidation = useMemo(() => validatePassword(password), [password]);
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  const allRequirementsMet = Object.values(passwordValidation).every(Boolean);
  const passwordsMatch = password === confirmPassword && password.length > 0;
  
  // For free trial users converting to permanent account, skip Terms requirement
  const termsRequired = !isFreeTrial;
  const isFormValid = (!termsRequired || (termsAccepted && privacyAccepted)) && allRequirementsMet && passwordsMatch;

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
      
      <div>
                <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onFocus={() => setShowPasswordRequirements(true)}
          placeholder={t('login.password')}
          autoComplete="new-password"
        />
        
        {/* Password Strength Indicator */}
        {password && (
          <div style={{ marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.5rem' }}>
              {[1, 2, 3, 4, 5].map((idx) => (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    backgroundColor: idx <= passwordStrength ? getStrengthColor(passwordStrength) : '#ddd',
                    transition: 'all 0.3s',
                  }}
                />
              ))}
            </div>
            <small style={{ color: getStrengthColor(passwordStrength), fontWeight: '600' }}>
              {getStrengthLabel(passwordStrength)}
            </small>
          </div>
        )}
        
        {/* Password Requirements Checklist */}
        {(showPasswordRequirements || password) && (
          <div style={{
            marginTop: '0.75rem',
            padding: '0.75rem',
            backgroundColor: '#f5f5f5',
            borderRadius: '5px',
            fontSize: '0.85rem',
          }}>
                        <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#333' }}>
              {t('validation.passwordRequirements')}
            </div>
            {Object.entries(PASSWORD_REQUIREMENTS).map(([key, { label }]) => {
              const isMet = passwordValidation[key];
              return (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.4rem',
                    color: isMet ? '#388e3c' : '#999',
                  }}
                >
                  <span style={{ fontWeight: 'bold' }}>
                    {isMet ? '✓' : '○'}
                  </span>
                  <span>{label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      <div>
                <PasswordInput
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder={t('login.confirmPassword')}
          autoComplete="new-password"
        />
        
        {/* Password Match Indicator */}
        {confirmPassword && (
          <small style={{
            marginTop: '0.25rem',
            display: 'block',
            color: passwordsMatch ? '#388e3c' : '#d32f2f',
            fontWeight: '600',
          }}>
            {passwordsMatch ? t('validation.passwordsMatch') : t('validation.passwordsMismatch')}
          </small>
        )}
      </div>

            {/* T&C Checkboxes - Skip for free trial users */}
      {!isFreeTrial && (
        <TermsCheckbox
          termsAccepted={termsAccepted}
          privacyAccepted={privacyAccepted}
          onTermsChange={setTermsAccepted}
          onPrivacyChange={setPrivacyAccepted}
          disabled={loading}
        />
      )}
      
      {/* Free Trial User Notice */}
      {isFreeTrial && (
        <div style={{
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          border: '1px solid #4CAF50',
          borderRadius: '5px',
          padding: '0.75rem',
          fontSize: '0.85rem',
          color: '#2e7d32'
        }}>
          Check Converting your free trial to a permanent account
        </div>
      )}

      <button 
        type="submit" 
        disabled={loading || !isFormValid}
        style={{
          padding: '0.75rem',
          borderRadius: '5px',
          border: 'none',
          backgroundColor: (loading || !isFormValid) ? '#999' : '#4CAF50',
          color: 'white',
          fontSize: '1rem',
          fontWeight: '600',
          cursor: (loading || !isFormValid) ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s',
        }}
      >
        {loading ? t('login.creatingAccount') : t('login.signUp')}
      </button>

      <div style={{ textAlign: 'center', fontSize: '0.9rem' }}>
        <p>
                    {t('login.noAccount')}{' '}
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
            {t('login.signIn')}
          </button>
        </p>
      </div>
    </form>
  );
}

export default RegisterForm;

