/**
 * MessageDisplay - Show error or success messages
 */

import React from 'react';
import { styles } from '../admin-styles';

export function MessageDisplay({ error, message }) {
  if (!error && !message) {
    return null;
  }

  if (error) {
    return (
      <div style={{ ...styles.messageContainer, ...styles.errorMessage }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ ...styles.messageContainer, ...styles.successMessage }}>
      {message}
    </div>
  );
}
