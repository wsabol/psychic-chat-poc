/**
 * Manual IP Form Component
 * Form for manually adding IP addresses to whitelist
 */

import React, { useState } from 'react';
import styles from '../FreeTrialWhitelist.module.css';

export default function ManualIpForm({ loading, onSubmit }) {
  const [manualIp, setManualIp] = useState('');
  const [manualDescription, setManualDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(manualIp, manualDescription);
    // Clear form after submission
    setManualIp('');
    setManualDescription('');
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGroup}>
        <label className={styles.label}>IP Address:</label>
        <input
          type="text"
          value={manualIp}
          onChange={(e) => setManualIp(e.target.value)}
          placeholder="e.g., 192.168.1.1"
          className={styles.input}
          disabled={loading}
        />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>Description (optional):</label>
        <input
          type="text"
          value={manualDescription}
          onChange={(e) => setManualDescription(e.target.value)}
          placeholder="e.g., Office IP"
          className={styles.input}
          disabled={loading}
        />
      </div>
      <button type="submit" disabled={loading} className={styles.addButton}>
        {loading ? '⟳ Adding...' : '➕ Add to Whitelist'}
      </button>
    </form>
  );
}
