/**
 * UnauthorizedView - Display when user is not an admin
 */

import React from 'react';
import { styles } from '../admin-styles';

export function UnauthorizedView({ userEmail }) {
  return (
    <div style={styles.unauthorized}>
      <h1 style={styles.unauthorizedTitle}>⚠️ Unauthorized</h1>
      <p style={styles.unauthorizedMessage}>
        Admin access required. Current user: {userEmail}
      </p>
    </div>
  );
}
