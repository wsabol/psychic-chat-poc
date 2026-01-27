import React from 'react';
import styles from '../ReAuthModal.module.css';

/**
 * PasswordAuthForm - Password authentication form with show/hide toggle
 * Extracted component for better organization
 */
export function PasswordAuthForm({
  password,
  setPassword,
  showPassword,
  setShowPassword,
  loading,
  onSubmit,
  onForgotPassword,
  t
}) {
  return (
    <form onSubmit={onSubmit}>
      <div className={styles.formGroup}>
        <label className={styles.label}>
          {t('security.reauth.passwordLabel')}
        </label>
        <div className={styles.passwordInputContainer}>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('security.reauth.passwordPlaceholder')}
            autoFocus
            disabled={loading}
            className={styles.passwordInput}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={loading}
            className={styles.passwordToggle}
            title={showPassword ? t('security.reauth.hidePassword') : t('security.reauth.showPassword')}
          >
            {showPassword ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !password.trim()}
        className={styles.primaryButton}
      >
        {loading ? t('security.reauth.verifying') : t('security.reauth.verify')}
      </button>

      <button
        type="button"
        onClick={onForgotPassword}
        className={styles.linkButton}
      >
        {t('security.reauth.forgotPassword')}
      </button>
    </form>
  );
}
