/**
 * Compliance Dashboard Component
 * 
 * Admin dashboard for monitoring:
 * - Acceptance rates by version
 * - User compliance status
 * - Notification effectiveness
 * - Timeline of acceptances
 * 
 * Props:
 *   - token: string - Admin auth token
 *   - onExport: function - Called when user exports data
 */

import React, { useState, useEffect } from 'react';
import './ComplianceDashboard.css';

export function ComplianceDashboard({ token }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState({
    overview: null,
    acceptanceByVersion: null,
    userStatus: null,
    notificationMetrics: null,
    timeline: null
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const endpoints = [
        { key: 'overview', url: '/admin/compliance-dashboard/overview' },
        { key: 'acceptanceByVersion', url: '/admin/compliance-dashboard/acceptance-by-version' },
        { key: 'notificationMetrics', url: '/admin/compliance-dashboard/notification-metrics' },
        { key: 'timeline', url: '/admin/compliance-dashboard/timeline?days=30' }
      ];

      const results = {};

      for (const { key, url } of endpoints) {
        const response = await fetch(
          `${process.env.REACT_APP_API_URL}${url}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );

        if (!response.ok) throw new Error(`Failed to load ${key}`);
        results[key] = await response.json();
      }

      setData(results);
    } catch (err) {
      console.error('[DASHBOARD] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/admin/compliance-dashboard/export`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-export-${new Date().getTime()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Export failed: ' + err.message);
    }
  };

  if (loading) {
    return <div className="compliance-dashboard loading">Loading dashboard...</div>;
  }

  const overview = data.overview?.data || data.overview;

  return (
    <div className="compliance-dashboard">
      <div className="dashboard-header">
        <h1>📊 Compliance Dashboard</h1>
        <div className="dashboard-actions">
          <button onClick={loadDashboardData} className="btn-refresh">
            🔄 Refresh
          </button>
          <button onClick={handleExport} className="btn-export">
            📥 Export
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Tabs */}
      <div className="dashboard-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'versions' ? 'active' : ''}`}
          onClick={() => setActiveTab('versions')}
        >
          By Version
        </button>
        <button
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button
          className={`tab ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          Notifications
        </button>
        <button
          className={`tab ${activeTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          Timeline
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && overview && (
        <div className="tab-content">
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">Total Users</div>
              <div className="metric-value">{overview.metrics?.totalUsers || 0}</div>
              <div className="metric-help">Registered users</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Overall Compliance</div>
              <div className="metric-value">{overview.metrics?.compliancePercentage}%</div>
              <div className="metric-help">{overview.metrics?.fullyCompliant} compliant users</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Terms Compliance</div>
              <div className="metric-value">{overview.metrics?.termsCompliancePercentage}%</div>
              <div className="metric-help">v{overview.currentVersions?.terms.version}</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Privacy Compliance</div>
              <div className="metric-value">{overview.metrics?.privacyCompliancePercentage}%</div>
              <div className="metric-help">v{overview.currentVersions?.privacy.version}</div>
            </div>

            <div className="metric-card warning">
              <div className="metric-label">Requires Action</div>
              <div className="metric-value">{overview.metrics?.requiresAction}</div>
              <div className="metric-help">{overview.metrics?.requiresActionPercentage}% of users</div>
            </div>
          </div>

          <div className="current-versions">
            <h3>Current Versions</h3>
            <div className="version-info">
              <div className="version-item">
                <strong>Terms of Service</strong>
                <span className="version-badge">{overview.currentVersions?.terms.version}</span>
                <small>{overview.currentVersions?.terms.changeType}</small>
              </div>
              <div className="version-item">
                <strong>Privacy Policy</strong>
                <span className="version-badge">{overview.currentVersions?.privacy.version}</span>
                <small>{overview.currentVersions?.privacy.changeType}</small>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* By Version Tab */}
      {activeTab === 'versions' && data.acceptanceByVersion && (
        <div className="tab-content">
          <table className="data-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Version</th>
                <th>Total Users</th>
                <th>Accepted</th>
                <th>Acceptance %</th>
                <th>Requires Action</th>
                <th>Latest Acceptance</th>
              </tr>
            </thead>
            <tbody>
              {data.acceptanceByVersion.breakdown?.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.documentType === 'terms' ? '📋 Terms' : '🔒 Privacy'}</td>
                  <td><strong>{row.version}</strong></td>
                  <td>{row.totalUsers}</td>
                  <td>{row.acceptedCount}</td>
                  <td className={`acceptance-rate ${row.acceptancePercentage >= 80 ? 'high' : row.acceptancePercentage >= 50 ? 'medium' : 'low'}`}>
                    {row.acceptancePercentage}%
                  </td>
                  <td>{row.requiresAction}</td>
                  <td>{new Date(row.latestAcceptance).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="tab-content">
          <div className="users-filter">
            <label>Filter:</label>
            <select defaultValue="all" className="filter-select">
              <option value="all">All Users</option>
              <option value="compliant">Compliant</option>
              <option value="non-compliant">Non-Compliant</option>
              <option value="requires-action">Requires Action</option>
            </select>
          </div>
          <p className="info-text">
            Total users in this view: {data.userStatus?.pagination?.total || 0}
          </p>
          {/* User list would be rendered here with pagination */}
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && data.notificationMetrics && (
        <div className="tab-content">
          <div className="notification-metrics">
            <div className="metric-block">
              <h4>Notification Delivery</h4>
              <div className="metric-pair">
                <span>Notified Users:</span>
                <strong>{data.notificationMetrics.metrics?.notificationStats.notified}</strong>
              </div>
              <div className="metric-pair">
                <span>Not Yet Notified:</span>
                <strong>{data.notificationMetrics.metrics?.notificationStats.notYetNotified}</strong>
              </div>
              <div className="metric-pair">
                <span>Notification Rate:</span>
                <strong>{data.notificationMetrics.metrics?.notificationStats.notificationRate}%</strong>
              </div>
            </div>

            <div className="metric-block">
              <h4>Acceptance After Notification</h4>
              <div className="metric-pair">
                <span>Accepted After Notification:</span>
                <strong>{data.notificationMetrics.metrics?.acceptanceAfterNotification.accepted}</strong>
              </div>
              <div className="metric-pair">
                <span>Still Requires Action:</span>
                <strong>{data.notificationMetrics.metrics?.acceptanceAfterNotification.stillRequiresAction}</strong>
              </div>
              <div className="metric-pair">
                <span>Acceptance Rate:</span>
                <strong>{data.notificationMetrics.metrics?.acceptanceAfterNotification.acceptanceRate}%</strong>
              </div>
            </div>

            <div className="metric-block">
              <h4>Notification Statistics</h4>
              <div className="metric-pair">
                <span>Avg Notifications per User:</span>
                <strong>{data.notificationMetrics.metrics?.averageNotificationsPerUser}</strong>
              </div>
              <div className="metric-pair">
                <span>Max Notifications Sent:</span>
                <strong>{data.notificationMetrics.metrics?.maxNotificationsSent}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Tab */}
      {activeTab === 'timeline' && data.timeline && (
        <div className="tab-content">
          <h3>Acceptance Timeline (Last 30 Days)</h3>
          <table className="timeline-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Terms Acceptances</th>
                <th>Privacy Acceptances</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {data.timeline.timeline?.map((day, idx) => (
                <tr key={idx}>
                  <td>{new Date(day.date).toLocaleDateString()}</td>
                  <td>{day.terms}</td>
                  <td>{day.privacy}</td>
                  <td><strong>{day.terms + day.privacy}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ComplianceDashboard;
