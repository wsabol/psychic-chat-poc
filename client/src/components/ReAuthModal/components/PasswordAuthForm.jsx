import React from 'react';
import styles from '../ReAuthModal.module.css';

/**
 * PasswordAuthForm - Password authentication form with show/hide toggle
 * Extracted component for better organization
 * isLinked: true if email/password is a linked provider on this Firebase account.
 *           false = grey out the entire form (user didn't sign up with email/password).
 */
export function PasswordAuthForm({
  password,
  setPassword,
  showPassword,
  setShowPassword,
  loading,
  onSubmit,
  onForgotPassword,
  t,
  isLinked = true,
}) {
  const isDisabled = loading || !isLinked;

  return (
    <form
      onSubmit={onSubmit}
      style={!isLinked ? { opacity: 0.35, pointerEvents: 'none', userSelect: 'none' } : undefined}
      title={!isLinked ? t('security.reauth.providerNotLinked', { provider: 'Email/Password' }) : undefined}
    >
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
            autoFocus={isLinked}
            disabled={isDisabled}
            className={styles.passwordInput}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isDisabled}
            className={styles.passwordToggle}
            title={showPassword ? t('security.reauth.hidePassword') : t('security.reauth.showPassword')}
          >
            {showPassword ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={isDisabled || !password.trim()}
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
