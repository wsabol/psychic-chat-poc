import React from 'react';
import styles from '../ReAuthModal.module.css';

/**
 * StatusMessage - Displays error or success messages
 * Extracted component for better reusability
 */
export function StatusMessage({ error, success }) {
  if (!error && !success) return null;

  return (
    <>
      {error && (
        <p className={styles.errorMessage}>
          {error}
        </p>
      )}
      {success && (
        <p className={styles.successMessage}>
          {success}
        </p>
      )}
    </>
  );
}
