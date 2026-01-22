/**
 * Subscription Report Tab
 * Displays subscription status summary and user lists
 * FIX: Use fetchWithTokenRefresh to handle expired tokens
 */

import React, { useState, useEffect, useCallback } from 'react';
import { fetchWithTokenRefresh } from '../../utils/fetchWithTokenRefresh';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export default function SubscriptionReportTab({ token }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithTokenRefresh(`${API_URL}/admin/subscriptions/report`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setReport(data);
      setLastUpdated(new Date().toLocaleString());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch on mount
  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>💳 Subscription Report</h2>
        <button onClick={fetchReport} disabled={loading} style={styles.refreshButton}>
          {loading ? '⟳ Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      {lastUpdated && (
        <p style={styles.timestamp}>Last updated: {lastUpdated}</p>
      )}

      {error && (
        <div style={styles.errorBox}>
          <p style={styles.errorText}>❌ Error: {error}</p>
        </div>
      )}

      {loading && !report && (
        <div style={styles.loadingBox}>
          <p>Loading subscription data...</p>
        </div>
      )}

      {report && (
        <div style={styles.reportContent}>
          {/* Summary Cards */}
          <div style={styles.summarySection}>
            <h3 style={styles.sectionTitle}>📊 Summary</h3>
            <div style={styles.cardsGrid}>
              <SummaryCard label="Total Users" value={report.summary.total_users} color="#3498db" />
              <SummaryCard label="Active" value={report.summary.active} color="#2ecc71" />
              <SummaryCard label="Trialing" value={report.summary.trialing} color="#f39c12" />
              <SummaryCard label="Past Due" value={report.summary.past_due} color="#e74c3c" />
              <SummaryCard label="Canceled" value={report.summary.canceled} color="#95a5a6" />
              <SummaryCard label="No Subscription" value={report.summary.no_subscription} color="#34495e" />
              <SummaryCard 
                label="Avg Hours Since Check" 
                value={parseFloat(report.summary.avg_hours_since_last_check || 0).toFixed(2)} 
                color="#9b59b6"
              />
            </div>
          </div>

          {/* Status Breakdown */}
          {report.usersByStatus && report.usersByStatus.length > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>📈 Breakdown by Status</h3>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Count</th>
                    <th style={styles.th}>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {report.usersByStatus.map((row, idx) => (
                    <tr key={idx} style={styles.tableRow}>
                      <td style={styles.td}>{row.status}</td>
                      <td style={styles.td}>{row.count}</td>
                      <td style={styles.td}>{row.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Recently Cancelled */}
          {report.recentlyCancelled && report.recentlyCancelled.count > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>🚫 Cancelled (Last 30 Days) - {report.recentlyCancelled.count}</h3>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.th}>User ID</th>
                    <th style={styles.th}>Cancelled</th>
                    <th style={styles.th}>Days Ago</th>
                    <th style={styles.th}>Plan</th>
                  </tr>
                </thead>
                <tbody>
                  {report.recentlyCancelled.users.map((user, idx) => (
                    <tr key={idx} style={styles.tableRow}>
                      <td style={styles.td}>{user.userId.substring(0, 20)}...</td>
                      <td style={styles.td}>{new Date(user.cancelledAt).toLocaleDateString()}</td>
                      <td style={styles.td}>{user.daysSinceCancellation}</td>
                      <td style={styles.td}>{user.planName || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Payment Issues */}
          {report.paymentIssues && report.paymentIssues.count > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>⚠️ Payment Issues - {report.paymentIssues.count}</h3>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.th}>User ID</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Issue Type</th>
                    <th style={styles.th}>Last Checked</th>
                  </tr>
                </thead>
                <tbody>
                  {report.paymentIssues.users.map((user, idx) => (
                    <tr key={idx} style={{...styles.tableRow, backgroundColor: '#ffe6e6'}}>
                      <td style={styles.td}>{user.userId.substring(0, 20)}...</td>
                      <td style={styles.td}>{user.status}</td>
                      <td style={styles.td}>{user.issueType}</td>
                      <td style={styles.td}>{new Date(user.lastChecked).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* No Subscription */}
          {report.noSubscription && report.noSubscription.count > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>❌ No Subscription - {report.noSubscription.count}</h3>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.th}>User ID</th>
                    <th style={styles.th}>Created</th>
                    <th style={styles.th}>Onboarding</th>
                  </tr>
                </thead>
                <tbody>
                  {report.noSubscription.users.map((user, idx) => (
                    <tr key={idx} style={styles.tableRow}>
                      <td style={styles.td}>{user.userId.substring(0, 20)}...</td>
                      <td style={styles.td}>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td style={styles.td}>{user.onboardingCompleted ? '✓' : '✗'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Job Status */}
          {report.jobStatus && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>🔄 Job Status</h3>
              <div style={styles.jobStatus}>
                <p><strong>Schedule:</strong> {report.jobStatus.schedule}</p>
                <p><strong>Next Run:</strong> {new Date(report.jobStatus.nextRun).toLocaleString()}</p>
                <p><strong>Stripe Available:</strong> {report.jobStatus.environmentVariables.checkAvailable ? '✓' : '✗'}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Summary Card Component
function SummaryCard({ label, value, color }) {
  return (
    <div style={{...styles.card, borderLeft: `4px solid ${color}`}}>
      <p style={styles.cardLabel}>{label}</p>
      <p style={{...styles.cardValue, color}}>{value}</p>
    </div>
  );
}

// Styles
const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0
  },
  refreshButton: {
    padding: '8px 16px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'background-color 0.2s'
  },
  timestamp: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '16px'
  },
  errorBox: {
    padding: '16px',
    backgroundColor: '#ffe6e6',
    border: '1px solid #e74c3c',
    borderRadius: '4px',
    marginBottom: '20px'
  },
  errorText: {
    color: '#c0392b',
    margin: 0
  },
  loadingBox: {
    padding: '40px',
    textAlign: 'center',
    color: '#666'
  },
  reportContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  summarySection: {
    marginBottom: '20px'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '2px solid #3498db'
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px'
  },
  card: {
    padding: '16px',
    backgroundColor: 'white',
    borderRadius: '4px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  cardLabel: {
    fontSize: '12px',
    color: '#666',
    margin: '0 0 8px 0'
  },
  cardValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0
  },
  section: {
    backgroundColor: 'white',
    padding: '16px',
    borderRadius: '4px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  tableHeader: {
    backgroundColor: '#ecf0f1',
    borderBottom: '2px solid #bdc3c7'
  },
  th: {
    padding: '12px',
    textAlign: 'left',
    fontWeight: 'bold',
    color: '#333'
  },
  tableRow: {
    borderBottom: '1px solid #ecf0f1',
    backgroundColor: '#fff'
  },
  td: {
    padding: '12px',
    color: '#555'
  },
  jobStatus: {
    padding: '12px',
    backgroundColor: '#ecf0f1',
    borderRadius: '4px',
    fontSize: '14px'
  }
};
