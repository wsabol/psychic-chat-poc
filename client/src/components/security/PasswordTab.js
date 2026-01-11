import React, { useState } from 'react';
import { useTranslation } from '../../context/TranslationContext';
import { getAuth, updatePassword } from 'firebase/auth';

/**
 * PasswordTab - Change password via Firebase
 */
export default function PasswordTab({ userId, token, apiUrl }) {
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showPasswords, setShowPasswords] = useState(false);

  const validatePassword = (password) => {
    if (password.length < 8) {
      return t('security.passwordTab.minLength');
    }
    if (!/[A-Z]/.test(password)) {
      return t('security.passwordTab.uppercase');
    }
    if (!/[a-z]/.test(password)) {
      return t('security.passwordTab.lowercase');
    }
    if (!/[0-9]/.test(password)) {
      return t('security.passwordTab.number');
    }
    if (!/[!@#$%^&*]/.test(password)) {
      return t('security.passwordTab.specialChar');
    }
    return null;
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!newPassword.trim() || !confirmPassword.trim()) {
      setError(t('security.passwordTab.fillAllFields'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('security.passwordTab.passwordsMismatch'));
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    try {
      setLoading(true);
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        throw new Error(t('security.passwordTab.errorNoUser'));
      }

      // Update password via Firebase
      await updatePassword(user, newPassword);

      setSuccess(t('security.passwordTab.successMessage'));
      
      // Clear form
      setNewPassword('');
      setConfirmPassword('');

      // Also notify backend to invalidate other sessions
      try {
        await fetch(`${apiUrl}/security/password-changed/${userId}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (err) {
      }
    } catch (err) {
      console.error('[PASSWORD] Error changing password:', err);
      setError(err.message || t('security.passwordTab.errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>{t('security.passwordTab.title')}</h2>
      <p style={{ color: '#666' }}>
        {t('security.passwordTab.subtitle')}
      </p>

      {error && (
        <div style={{
          backgroundColor: '#ffebee',
          color: '#d32f2f',
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          backgroundColor: '#e8f5e9',
          color: '#2e7d32',
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          {success}
        </div>
      )}

      <form onSubmit={handleChangePassword} style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
        maxWidth: '500px'
      }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: 'bold'
          }}>
            {t('security.passwordTab.newPasswordLabel')}
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t('security.passwordTab.newPasswordPlaceholder')}
              style={{
                width: '100%',
                padding: '0.75rem',
                paddingRight: '2.5rem',
                borderRadius: '4px',
                border: '1px solid #ccc',
                boxSizing: 'border-box'
              }}
            />
            <button
              type="button"
              onClick={() => setShowPasswords(!showPasswords)}
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px'
              }}
            >
              {showPasswords ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          <p style={{ fontSize: '12px', color: '#999', marginTop: '0.5rem' }}>
            {t('security.passwordTab.requirements')}
          </p>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: 'bold'
          }}>
            {t('security.passwordTab.confirmPasswordLabel')}
          </label>
          <input
            type={showPasswords ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={t('security.passwordTab.confirmPasswordPlaceholder')}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '4px',
              border: '1px solid #ccc',
              boxSizing: 'border-box'
            }}
          />
          {newPassword && confirmPassword && newPassword === confirmPassword && (
            <p style={{ fontSize: '12px', color: '#2e7d32', marginTop: '0.5rem' }}>
              {t('security.passwordTab.passwordsMatch')}
            </p>
          )}
          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <p style={{ fontSize: '12px', color: '#d32f2f', marginTop: '0.5rem' }}>
              {t('security.passwordTab.passwordsDoNotMatch')}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !newPassword.trim() || !confirmPassword.trim()}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: '#7c63d8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          {loading ? t('security.passwordTab.changingPassword') : t('security.passwordTab.changePasswordButton')}
        </button>
      </form>

      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        backgroundColor: '#fff3e0',
        borderRadius: '8px',
        fontSize: '14px',
        color: '#e65100'
      }}>
        {t('security.passwordTab.warningNote')}
      </div>
    </div>
  );
}

