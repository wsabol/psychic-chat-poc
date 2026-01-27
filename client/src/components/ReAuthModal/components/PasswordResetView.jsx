import React from 'react';
import styles from '../ReAuthModal.module.css';

/**
 * PasswordResetView - Password reset interface
 * Extracted component for better organization
 */
export function PasswordResetView({ loading, onSendReset, onBack, t }) {
  return (
    <div>
      <p className={styles.resetText}>
        {t('security.reauth.passwordResetText')}
      </p>
      <button
        onClick={onSendReset}
        disabled={loading}
        className={styles.primaryButton}
      >
        {loading ? t('security.reauth.sending') : t('security.reauth.sendResetEmail')}
      </button>
      <button
        onClick={onBack}
        className={styles.secondaryButton}
      >
        {t('security.reauth.back')}
      </button>
    </div>
  );
}
