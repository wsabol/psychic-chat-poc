/**
 * Whitelist Table Component
 * Displays whitelisted IP addresses in a table
 */

import React from 'react';
import styles from '../FreeTrialWhitelist.module.css';

export default function WhitelistTable({ whitelist, loading, onRemove }) {
  if (whitelist.length === 0) {
    return <p className={styles.emptyMessage}>No IPs whitelisted yet.</p>;
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr className={styles.tableHeader}>
          <th className={styles.th}>IP Hash</th>
          <th className={styles.th}>Device</th>
          <th className={styles.th}>Browser</th>
          <th className={styles.th}>Added</th>
          <th className={styles.th}>Last Used</th>
          <th className={styles.th}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {whitelist.map((entry) => (
          <tr key={entry.id} className={styles.tableRow}>
            <td className={styles.td}>
              {entry.ip_address_hash.substring(0, 16)}...
            </td>
            <td className={styles.td}>
              {entry.device_name || 'Unknown'}
            </td>
            <td className={styles.td} title={entry.browser_info}>
              {entry.browser_info 
                ? entry.browser_info.substring(0, 30) + '...' 
                : 'Unknown'}
            </td>
            <td className={styles.td}>
              {new Date(entry.added_at).toLocaleDateString()}
            </td>
            <td className={styles.td}>
              {new Date(entry.last_used_at).toLocaleDateString()}
            </td>
            <td className={styles.td}>
              <button
                onClick={() => onRemove(entry.id)}
                disabled={loading}
                className={styles.removeButton}
              >
                🗑️ Remove
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
