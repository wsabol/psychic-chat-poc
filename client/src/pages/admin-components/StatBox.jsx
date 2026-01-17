/**
 * StatBox - Display a single statistic
 */

import React from 'react';
import { styles } from '../admin-styles';

export function StatBox({ label, value }) {
  return (
    <div style={styles.statBox}>
      <p style={styles.statLabel}>{label}</p>
      <p style={styles.statValue}>{value}</p>
    </div>
  );
}
