/**
 * Download Results Step Component
 * Step 3: Download data package
 */

import React from 'react';
import styles from '../LegalDataRequests.module.css';

/**
 * @param {Object} props
 * @param {Object} props.dataPackage - Generated data package
 * @param {function} props.onDownload - Download handler
 * @param {function} props.onReset - Reset/new request handler
 */
export function DownloadResultsStep({ dataPackage, onDownload, onReset }) {
  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>Step 3: Download Data Package</h3>

      <PackageStatistics statistics={dataPackage.statistics} />

      <div className={styles.buttonGroup}>
        <button
          onClick={onDownload}
          className={`${styles.button} ${styles.successButton}`}
        >
          💾 Download JSON File
        </button>
        <button
          onClick={onReset}
          className={`${styles.button} ${styles.secondaryButton}`}
        >
          🔄 New Request
        </button>
      </div>

      <PackageContentsInfo />
    </div>
  );
}

/**
 * Package Statistics Display
 */
function PackageStatistics({ statistics }) {
  return (
    <div className={styles.statsGrid}>
      <StatBox label="Total Messages" value={statistics.total_messages} />
      <StatBox label="Audit Events" value={statistics.total_audit_events} />
      <StatBox label="Violations" value={statistics.total_violations} />
      <StatBox label="Account Status" value={statistics.account_status} />
    </div>
  );
}

/**
 * Stat Box Component
 */
function StatBox({ label, value }) {
  return (
    <div className={styles.statBox}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
    </div>
  );
}

/**
 * Package Contents Information
 */
function PackageContentsInfo() {
  return (
    <div className={styles.infoBox}>
      <h4 className={styles.infoTitle}>📋 Package Contents</h4>
      <ul className={styles.infoList}>
        <li>Complete user profile and personal information</li>
        <li>All messages (user inputs and oracle responses)</li>
        <li>Complete audit trail (login history, actions, IP addresses)</li>
        <li>Violation history (if any)</li>
        <li>Request metadata (who requested, when, why)</li>
      </ul>
    </div>
  );
}

export default DownloadResultsStep;
