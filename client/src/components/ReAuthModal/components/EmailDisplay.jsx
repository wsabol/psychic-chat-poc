import React from 'react';
import styles from '../ReAuthModal.module.css';

/**
 * EmailDisplay - Shows the user's email (read-only)
 * Extracted component for better organization
 */
export function EmailDisplay({ email, t }) {
  return (
    <div className={styles.formGroup}>
      <label className={styles.label}>
        {t('security.reauth.emailLabel')}
      </label>
      <input
        type="email"
        value={email}
        disabled
        className={styles.input}
      />
    </div>
  );
}
