/**
 * Admin Dashboard - Analytics Reports & Violation Monitoring
 * Only accessible to admin email: starshiptechnology1@gmail.com
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from '../context/TranslationContext';
import { getAuth } from 'firebase/auth';
import ViolationReportTab from '../components/AdminTabs/ViolationReportTab';
import { ComplianceDashboard } from '../components/admin/ComplianceDashboard';
import ErrorLogsReport from '../components/admin/ErrorLogsReport';
import ErrorLoggerTestHarness from '../components/admin/ErrorLoggerTestHarness';
import { logErrorFromCatch } from '../shared/errorLogger.js';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export default function AdminPage({ token, userId }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('logs');
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [userEmail, setUserEmail] = useState('');

  // Check if user is admin
  useEffect(() => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (currentUser?.email) {
      setUserEmail(currentUser.email);
      if (currentUser.email !== 'starshiptechnology1@gmail.com') {
        setError('Unauthorized: Admin access required');
      }
    }
  }, []);

  // Fetch analytics report
  const handleFetchReport = async () => {
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(`${API_URL}/analytics/report`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch report');
      }

      const data = await response.json();
      setReport(data);
      setMessage('Report loaded successfully');
    } catch (err) {
      logErrorFromCatch('Error fetching report:', err);
      setError(err.message || 'Failed to fetch analytics report');
    } finally {
      setIsLoading(false);
    }
  };

  // Export report as JSON
  const handleExportJSON = () => {
    if (!report) return;

    const jsonString = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Delete all analytics data
  const handleDeleteAllData = async () => {
    if (!window.confirm('⚠️ Are you sure? This will DELETE ALL analytics data. This cannot be undone!')) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/analytics/data`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete data');
      }

      const result = await response.json();
      setMessage(`✅ Deleted ${result.rows_deleted} analytics records`);
      setReport(null);
    } catch (err) {
      logErrorFromCatch('Error deleting data:', err);
      setError(err.message || 'Failed to delete analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup old data (90+ days)
  const handleCleanupOldData = async () => {
    if (!window.confirm('Delete analytics data older than 90 days?')) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/analytics/cleanup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to cleanup data');
      }

      const result = await response.json();
      setMessage(`✅ Deleted ${result.rows_deleted} old analytics records`);
      setReport(null);
    } catch (err) {
      logErrorFromCatch('Error cleaning up data:', err);
      setError(err.message || 'Failed to cleanup old data');
    } finally {
      setIsLoading(false);
    }
  };

  // Render unauthorized message
  if (userEmail && userEmail !== 'starshiptechnology1@gmail.com') {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>⚠️ Unauthorized</h1>
        <p style={{ color: '#666' }}>Admin access required. Current user: {userEmail}</p>
      </div>
    );
  }

  return (
    <div className="page-safe-area" style={{ padding: '0.75rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '24px' }}>⚡ Admin Dashboard</h1>
          <p style={{ color: '#666', marginBottom: 0, fontSize: '13px' }}>Analytics Reports, Violation Monitoring & Data Management</p>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          borderBottom: '2px solid #e0e0e0',
        }}>
                    <TabButton
            label="🚨 Error Logs"
            isActive={activeTab === 'logs'}
            onClick={() => setActiveTab('logs')}
          />
          <TabButton
            label="📊 Analytics"
            isActive={activeTab === 'analytics'}
            onClick={() => setActiveTab('analytics')}
          />
          <TabButton
            label="🚨 Violation Reports"
            isActive={activeTab === 'violations'}
            onClick={() => setActiveTab('violations')}
          />
          <TabButton
            label="✅ Compliance"
            isActive={activeTab === 'compliance'}
            onClick={() => setActiveTab('compliance')}
          />
        </div>

                {/* Error Logs Tab */}
        {activeTab === 'logs' && (
          <div>
            <ErrorLogsReport token={token} apiUrl={API_URL} />
            <ErrorLoggerTestHarness />
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div>
            {/* Messages */}
            {error && (
              <div style={{
                padding: '0.75rem',
                marginBottom: '1rem',
                borderRadius: '6px',
                backgroundColor: '#ffebee',
                color: '#c62828',
                fontSize: '13px',
                border: '1px solid #ef5350',
              }}>
                {error}
              </div>
            )}

            {message && (
              <div style={{
                padding: '0.75rem',
                marginBottom: '1rem',
                borderRadius: '6px',
                backgroundColor: '#e8f5e9',
                color: '#2e7d32',
                fontSize: '13px',
                border: '1px solid #81c784',
              }}>
                {message}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
            }}>
              <button
                onClick={handleFetchReport}
                disabled={isLoading}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#7c63d8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                📊 Load Report
              </button>

              <button
                onClick={handleExportJSON}
                disabled={!report || isLoading}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#4caf50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: (!report || isLoading) ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  opacity: (!report || isLoading) ? 0.6 : 1,
                }}
              >
                💾 Export JSON
              </button>

              <button
                onClick={handleCleanupOldData}
                disabled={isLoading}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#ff9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                🧹 Cleanup (90+ days)
              </button>

              <button
                onClick={handleDeleteAllData}
                disabled={isLoading}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#d32f2f',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                🗑️ Delete All Data
              </button>
            </div>

            {/* Report Display */}
            {report && (
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.97)',
                padding: '1.5rem',
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
              }}>
                <h2 style={{ marginTop: 0, fontSize: '18px', marginBottom: '1rem' }}>Report Summary</h2>

                {/* Summary Stats */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  marginBottom: '2rem',
                }}>
                  <StatBox label="Total Events" value={report.summary.total_events} />
                  <StatBox label="Data Period" value={`${report.summary.data_period_days} days`} />
                  <StatBox label="Unique Dates" value={report.summary.unique_dates} />
                  <StatBox label="Generated" value={new Date(report.generated_at).toLocaleDateString()} />
                </div>

                {/* Detailed Data Preview */}
                <details style={{ marginBottom: '1rem' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    📊 Feature Usage ({report.feature_usage?.length || 0} items)
                  </summary>
                  <pre style={{
                    backgroundColor: '#f5f5f5',
                    padding: '1rem',
                    borderRadius: '4px',
                    overflow: 'auto',
                    fontSize: '11px',
                    maxHeight: '300px',
                  }}>
                    {JSON.stringify(report.feature_usage?.slice(0, 10) || [], null, 2)}
                  </pre>
                </details>

                <details style={{ marginBottom: '1rem' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    📍 Daily Active Users by Location ({report.daily_active_by_location?.length || 0} items)
                  </summary>
                  <pre style={{
                    backgroundColor: '#f5f5f5',
                    padding: '1rem',
                    borderRadius: '4px',
                    overflow: 'auto',
                    fontSize: '11px',
                    maxHeight: '300px',
                  }}>
                    {JSON.stringify(report.daily_active_by_location?.slice(0, 10) || [], null, 2)}
                  </pre>
                </details>

                <details style={{ marginBottom: '1rem' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    ⚠️ Error Tracking ({report.error_tracking?.length || 0} items)
                  </summary>
                  <pre style={{
                    backgroundColor: '#ffebee',
                    padding: '1rem',
                    borderRadius: '4px',
                    overflow: 'auto',
                    fontSize: '11px',
                    maxHeight: '300px',
                    color: '#c62828',
                  }}>
                    {JSON.stringify(report.error_tracking?.slice(0, 10) || [], null, 2)}
                  </pre>
                </details>

                <details style={{ marginBottom: '1rem' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    📉 Drop-off Analysis ({report.dropoff_analysis?.length || 0} items)
                  </summary>
                  <pre style={{
                    backgroundColor: '#f5f5f5',
                    padding: '1rem',
                    borderRadius: '4px',
                    overflow: 'auto',
                    fontSize: '11px',
                    maxHeight: '300px',
                  }}>
                    {JSON.stringify(report.dropoff_analysis?.slice(0, 10) || [], null, 2)}
                  </pre>
                </details>

                <p style={{ color: '#999', fontSize: '12px', marginTop: '1rem' }}>
                  💡 Tip: Click "Export JSON" to download the full report for analysis in VS Code or Excel
                </p>
              </div>
            )}

            {!report && (
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.97)',
                padding: '2rem',
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
                textAlign: 'center',
                color: '#999',
              }}>
                <p>Click "Load Report" to view analytics data</p>
              </div>
            )}
          </div>
        )}

        {/* Violation Reports Tab */}
        {activeTab === 'violations' && (
          <ViolationReportTab token={token} />
        )}

        {/* Compliance Tab */}
        {activeTab === 'compliance' && (
          <ComplianceDashboard token={token} />
        )}
      </div>
    </div>
  );
}

/**
 * TabButton - Navigation tab button
 */
function TabButton({ label, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.75rem 1.5rem',
        backgroundColor: 'transparent',
        color: isActive ? '#7c63d8' : '#999',
        border: 'none',
        borderBottom: isActive ? '3px solid #7c63d8' : '3px solid transparent',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: isActive ? 'bold' : 'normal',
        transition: 'all 0.2s ease',
      }}
    >
      {label}
    </button>
  );
}

/**
 * StatBox - Display a single stat
 */
function StatBox({ label, value }) {
  return (
    <div style={{
      backgroundColor: '#f5f5f5',
      padding: '1rem',
      borderRadius: '6px',
      textAlign: 'center',
      border: '1px solid #e0e0e0',
    }}>
      <p style={{ margin: '0 0 0.5rem 0', color: '#999', fontSize: '12px' }}>{label}</p>
      <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#333' }}>{value}</p>
    </div>
  );
}
