/**
 * Security Metrics Dashboard
 * Intrusion Detection System Monitoring
 */

import React, { useState, useEffect, useCallback } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export default function SecurityMetrics({ token }) {
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/admin/security-metrics/overview`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch security metrics');
      }

      setMetrics(data.metrics);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const getSeverityColor = (count, threshold) => {
    if (count === 0) return '#4ade80'; // green
    if (count >= threshold) return '#ef4444'; // red
    return '#fbbf24'; // yellow
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>🛡️ Security Metrics Dashboard</h2>
          <p style={styles.subtitle}>Intrusion Detection System Monitoring</p>
        </div>
        <button 
          onClick={fetchMetrics} 
          disabled={isLoading}
          style={{
            ...styles.refreshButton,
            opacity: isLoading ? 0.6 : 1,
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? '🔄 Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      {lastRefresh && (
        <p style={styles.lastRefresh}>
          Last refreshed: {lastRefresh.toLocaleTimeString()}
        </p>
      )}

      {/* Error Message */}
      {error && (
        <div style={styles.error}>
          ⚠️ {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && !metrics && (
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading security metrics...</p>
        </div>
      )}

      {/* Metrics Display */}
      {metrics && (
        <>
          {/* Failed Logins Card */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>🚨 Failed Login Attempts</h3>
            <div style={styles.metricRow}>
              <div style={styles.metricLabel}>Last 24 Hours:</div>
              <div style={{
                ...styles.metricValue,
                color: getSeverityColor(metrics.failedLoginsLast24h, 50)
              }}>
                {metrics.failedLoginsLast24h}
              </div>
            </div>
            {metrics.failedLoginsLast24h > 50 && (
              <div style={styles.warning}>
                ⚠️ High number of failed logins detected
              </div>
            )}
          </div>

          {/* Suspicious IPs Card */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>🔍 Suspicious IP Addresses</h3>
            {metrics.suspiciousIPs && metrics.suspiciousIPs.length > 0 ? (
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.tableHeader}>IP Address</th>
                      <th style={styles.tableHeader}>Failed Attempts</th>
                      <th style={styles.tableHeader}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.suspiciousIPs.map((ip, index) => (
                      <tr key={index} style={styles.tableRow}>
                        <td style={styles.tableCell}>{ip.ip_address}</td>
                        <td style={styles.tableCell}>{ip.failed_count}</td>
                        <td style={styles.tableCell}>
                          <span style={{
                            ...styles.badge,
                            backgroundColor: ip.failed_count >= 20 ? '#ef4444' : '#fbbf24'
                          }}>
                            {ip.failed_count >= 20 ? 'CRITICAL' : 'HIGH'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={styles.noData}>
                ✅ No suspicious IPs detected in the last hour
              </div>
            )}
          </div>

          {/* Blocked Accounts Card */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>🔒 Account Security</h3>
            <div style={styles.metricRow}>
              <div style={styles.metricLabel}>Currently Locked Accounts:</div>
              <div style={{
                ...styles.metricValue,
                color: metrics.blockedAccounts > 0 ? '#fbbf24' : '#4ade80'
              }}>
                {metrics.blockedAccounts}
              </div>
            </div>
          </div>

          {/* Account Enumeration Card */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>🎯 Account Enumeration Attempts</h3>
            {metrics.enumerationAttempts && metrics.enumerationAttempts.length > 0 ? (
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.tableHeader}>IP Address</th>
                      <th style={styles.tableHeader}>Unique Accounts Tested</th>
                      <th style={styles.tableHeader}>Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.enumerationAttempts.map((attempt, index) => (
                      <tr key={index} style={styles.tableRow}>
                        <td style={styles.tableCell}>{attempt.ip_address}</td>
                        <td style={styles.tableCell}>{attempt.unique_accounts}</td>
                        <td style={styles.tableCell}>
                          <span style={{
                            ...styles.badge,
                            backgroundColor: '#ef4444'
                          }}>
                            HIGH
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={styles.noData}>
                ✅ No enumeration attempts detected in the last hour
              </div>
            )}
          </div>

          {/* Info Box */}
          <div style={styles.infoBox}>
            <h4 style={styles.infoTitle}>ℹ️ About This Dashboard</h4>
            <ul style={styles.infoList}>
              <li>Failed logins are monitored for brute force attack patterns</li>
              <li>Suspicious IPs have 5+ failed logins in the last 15 minutes</li>
              <li>Account enumeration detects attempts to test multiple accounts from single IPs</li>
              <li>All security events are logged in the audit trail</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '15px'
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1a1a1a',
    margin: '0 0 5px 0'
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: 0
  },
  refreshButton: {
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s'
  },
  lastRefresh: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '15px'
  },
  error: {
    padding: '15px',
    backgroundColor: '#fee',
    color: '#c00',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #fcc'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#666'
  },
  spinner: {
    width: '40px',
    height: '40px',
    margin: '0 auto 15px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 0,
    marginBottom: '15px'
  },
  metricRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0'
  },
  metricLabel: {
    fontSize: '14px',
    color: '#666'
  },
  metricValue: {
    fontSize: '24px',
    fontWeight: 'bold'
  },
  warning: {
    marginTop: '10px',
    padding: '10px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: '6px',
    fontSize: '14px'
  },
  tableContainer: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  tableHeader: {
    textAlign: 'left',
    padding: '10px',
    borderBottom: '2px solid #e5e7eb',
    fontWeight: '600',
    color: '#374151'
  },
  tableRow: {
    borderBottom: '1px solid #f3f4f6'
  },
  tableCell: {
    padding: '10px',
    color: '#1f2937'
  },
  badge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    color: 'white'
  },
  noData: {
    padding: '20px',
    textAlign: 'center',
    color: '#059669',
    backgroundColor: '#d1fae5',
    borderRadius: '6px',
    fontSize: '14px'
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    borderRadius: '8px',
    padding: '20px',
    border: '1px solid #bfdbfe'
  },
  infoTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e40af',
    marginTop: 0,
    marginBottom: '10px'
  },
  infoList: {
    margin: 0,
    paddingLeft: '20px',
    color: '#1e40af',
    fontSize: '14px',
    lineHeight: '1.8'
  }
};
