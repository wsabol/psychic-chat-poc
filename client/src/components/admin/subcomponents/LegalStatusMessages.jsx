/**
 * Legal Status Messages Component
 * Displays error and success messages for legal data requests
 */

import React from 'react';
import styles from '../LegalDataRequests.module.css';

/**
 * @param {Object} props
 * @param {string|null} props.error - Error message to display
 * @param {string|null} props.success - Success message to display
 */
export function LegalStatusMessages({ error, success }) {
  if (!error && !success) return null;

  return (
    <>
      {error && (
        <div className={styles.error}>
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div className={styles.success}>
          {success}
        </div>
      )}
    </>
  );
}

export default LegalStatusMessages;
