/**
 * Current IP Card Component
 * Displays current admin IP and whitelist button
 */

import React from 'react';
import styles from '../FreeTrialWhitelist.module.css';

export default function CurrentIpCard({ currentIp, loading, onWhitelist }) {
  if (!currentIp) {
    return <p className={styles.loadingText}>Loading current IP...</p>;
  }

  return (
    <div className={styles.currentIpBox}>
      <div className={styles.ipInfo}>
        <p className={styles.ipLabel}>IP Address:</p>
        <p className={styles.ipValue}>{currentIp.ipAddress}</p>
      </div>
      <div className={styles.ipInfo}>
        <p className={styles.ipLabel}>Status:</p>
        <p className={`${styles.ipValue} ${currentIp.isWhitelisted ? styles.whitelisted : styles.notWhitelisted}`}>
          {currentIp.isWhitelisted ? '✅ Whitelisted' : '❌ Not Whitelisted'}
        </p>
      </div>
      {!currentIp.isWhitelisted && (
        <button
          onClick={onWhitelist}
          disabled={loading}
          className={styles.whitelistButton}
        >
          ✅ Whitelist Current IP
        </button>
      )}
    </div>
  );
}
