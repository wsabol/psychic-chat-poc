/**
 * Legal Warning Box Component
 * Displays important legal notice for data request operations
 */

import React from 'react';
import styles from '../LegalDataRequests.module.css';

export function LegalWarningBox() {
  return (
    <div className={styles.warningBox}>
      <h4 className={styles.warningTitle}>⚠️ Important Legal Notice</h4>
      <ul className={styles.warningList}>
        <li>Only use this tool for legitimate legal requests (subpoenas, court orders, etc.)</li>
        <li>All requests are logged to the audit trail for chain of custody</li>
        <li>Downloaded data contains sensitive personal information - handle securely</li>
        <li>Maintain documentation of legal authorization for each request</li>
      </ul>
    </div>
  );
}

export default LegalWarningBox;
