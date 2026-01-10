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
import { API_ENDPOINTS, DASHBOARD_TABS, LOAD_ENDPOINTS } from './complianceConstants';
import { OverviewTabContent } from './tabs/OverviewTabContent';
import { VersionsTabContent } from './tabs/VersionsTabContent';
import { UsersTabContent } from './tabs/UsersTabContent';
import { NotificationsTabContent } from './tabs/NotificationsTabContent';
import { TimelineTabContent } from './tabs/TimelineTabContent';

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

      const results = {};

      for (const { key, url } of LOAD_ENDPOINTS) {
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
        `${process.env.REACT_APP_API_URL}${API_ENDPOINTS.export}`,
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
        {DASHBOARD_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && data.overview && (
        <OverviewTabContent data={data} />
      )}

      {/* By Version Tab */}
      {activeTab === 'versions' && data.acceptanceByVersion && (
        <VersionsTabContent data={data} />
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <UsersTabContent data={data} />
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && data.notificationMetrics && (
        <NotificationsTabContent data={data} />
      )}

      {/* Timeline Tab */}
      {activeTab === 'timeline' && data.timeline && (
        <TimelineTabContent data={data} />
      )}
    </div>
  );
}

export default ComplianceDashboard;
