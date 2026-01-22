/**
 * Free Trial Whitelist Tab
 * Manage IP addresses that can access unlimited free trials
 * REFACTORED: Split into multiple components and custom hooks
 */

import React from 'react';
import useWhitelist from './hooks/useWhitelist';
import CurrentIpCard from './whitelist/CurrentIpCard';
import ManualIpForm from './whitelist/ManualIpForm';
import WhitelistTable from './whitelist/WhitelistTable';
import styles from './FreeTrialWhitelist.module.css';

export default function FreeTrialWhitelist({ token }) {
  const {
    whitelist,
    currentIp,
    loading,
    error,
    success,
    lastUpdated,
    fetchWhitelist,
    whitelistCurrentIp,
    whitelistManualIp,
    removeFromWhitelist
  } = useWhitelist(token);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>🔓 Free Trial Whitelist</h2>
        <button 
          onClick={fetchWhitelist} 
          disabled={loading} 
          className={styles.refreshButton}
        >
          {loading ? '⟳ Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      <p className={styles.description}>
        Whitelisted IP addresses can test the free trial unlimited times.
      </p>

      {lastUpdated && (
        <p className={styles.timestamp}>Last updated: {lastUpdated}</p>
      )}

      {/* Error Message */}
      {error && (
        <div className={styles.errorBox}>
          <p className={styles.errorText}>❌ {error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className={styles.successBox}>
          <p className={styles.successText}>{success}</p>
        </div>
      )}

      {/* Current IP Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>📍 Your Current IP</h3>
        <CurrentIpCard 
          currentIp={currentIp}
          loading={loading}
          onWhitelist={whitelistCurrentIp}
        />
      </div>

      {/* Manual IP Entry Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>➕ Add IP Manually</h3>
        <ManualIpForm 
          loading={loading}
          onSubmit={whitelistManualIp}
        />
      </div>

      {/* Whitelist Table */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>📋 Whitelisted IPs ({whitelist.length})</h3>
        <WhitelistTable 
          whitelist={whitelist}
          loading={loading}
          onRemove={removeFromWhitelist}
        />
      </div>
    </div>
  );
}
