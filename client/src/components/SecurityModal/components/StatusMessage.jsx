/**
 * Reusable status message component
 * Displays error or success messages
 */

import React from 'react';
import styles from '../SecurityModal.module.css';

const StatusMessage = ({ type, message }) => {
  if (!message) return null;

  return (
    <div className={type === 'error' ? styles.errorMessage : styles.successMessage}>
      {message}
    </div>
  );
};

export default StatusMessage;
