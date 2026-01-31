/**
 * Generate Package Step Component
 * Step 2: Generate legal data package
 */

import React from 'react';
import styles from '../LegalDataRequests.module.css';

/**
 * @param {Object} props
 * @param {string} props.requestedBy - Requestor name
 * @param {function} props.setRequestedBy - Requestor setter
 * @param {string} props.requestReason - Request reason
 * @param {function} props.setRequestReason - Reason setter
 * @param {function} props.onSubmit - Form submit handler
 * @param {boolean} props.isLoading - Loading state
 */
export function GeneratePackageStep({
  requestedBy,
  setRequestedBy,
  requestReason,
  setRequestReason,
  onSubmit,
  isLoading
}) {
  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>Step 2: Generate Legal Data Package</h3>
      <form onSubmit={onSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Requested By (Your Name)</label>
          <input
            type="text"
            value={requestedBy}
            onChange={(e) => setRequestedBy(e.target.value)}
            placeholder="Admin Name"
            required
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Request Reason (Legal Basis)</label>
          <textarea
            value={requestReason}
            onChange={(e) => setRequestReason(e.target.value)}
            placeholder="e.g., Subpoena #12345, Court Order #67890, Legal Discovery Case #XYZ"
            required
            rows={3}
            className={styles.textarea}
          />
        </div>

        <div className={styles.buttonGroup}>
          <button
            type="submit"
            disabled={isLoading || !requestedBy || !requestReason}
            className={`${styles.button} ${styles.primaryButton}`}
            style={{
              opacity: (isLoading || !requestedBy || !requestReason) ? 0.6 : 1,
              cursor: (isLoading || !requestedBy || !requestReason) ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? '⏳ Generating...' : '📦 Generate Data Package'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default GeneratePackageStep;
