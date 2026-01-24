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
 * 
 * FIX: Use fetchWithTokenRefresh to handle expired tokens
 */

import React, { useState, useEffect, useCallback } from 'react';
import './ComplianceDashboard.css';
import { API_ENDPOINTS, DASHBOARD_TABS, LOAD_ENDPOINTS } from './complianceConstants';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import { fetchWithTokenRefresh } from '../../utils/fetchWithTokenRefresh';
import { OverviewTabContent } from './tabs/OverviewTabContent';
import { VersionsTabContent } from './tabs/VersionsTabContent';
import { UsersTabContent } from './tabs/UsersTabContent';
import { NotificationsTabContent } from './tabs/NotificationsTabContent';
import { TimelineTabContent } from './tabs/TimelineTabContent';

export function ComplianceDashboard({ token }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [sendingNotifications, setSendingNotifications] = useState(false);
  const [notificationsSent, setNotificationsSent] = useState(false);
  const [notificationsAlreadySent, setNotificationsAlreadySent] = useState(false);
  const [data, setData] = useState({
    overview: null,
    acceptanceByVersion: null,
    userStatus: null,
    notificationMetrics: null,
    timeline: null
  });

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const results = {};

      for (const { key, url } of LOAD_ENDPOINTS) {
        const response = await fetchWithTokenRefresh(
          `${process.env.REACT_APP_API_URL}${url}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );

        if (!response.ok) throw new Error(`Failed to load ${key}`);
        results[key] = await response.json();
      }

      setData(results);

      // Check if notifications were already sent for current version
      try {
        const notificationCheckResponse = await fetchWithTokenRefresh(
          `${process.env.REACT_APP_API_URL}/auth/check-notifications-sent`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );

        if (notificationCheckResponse.ok) {
          const notificationData = await notificationCheckResponse.json();
          setNotificationsAlreadySent(notificationData.alreadySent);
        }
      } catch (checkErr) {
        // Non-critical error - just log it
      }

    } catch (err) {
      logErrorFromCatch(err, 'ComplianceDashboard', '[DASHBOARD] Error:');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleExport = async () => {
    try {
      const response = await fetchWithTokenRefresh(
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

  const handleSendPolicyNotifications = async () => {
    if (!window.confirm('This will send policy change notification emails to all users with outdated consent. Continue?')) {
      return;
    }

    try {
      setSendingNotifications(true);
      setError('');
      setSuccessMessage('');

      // Step 1: Flag users for update
      const flagResponse = await fetchWithTokenRefresh(
        `${process.env.REACT_APP_API_URL}/auth/flag-users-for-update`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ documentType: 'both' })
        }
      );

      if (!flagResponse.ok) {
        throw new Error('Failed to flag users for update');
      }

      const flagResult = await flagResponse.json();

      // Step 2: Send notifications
      const notifyResponse = await fetchWithTokenRefresh(
        `${process.env.REACT_APP_API_URL}/auth/send-policy-notifications`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!notifyResponse.ok) {
        throw new Error('Failed to send policy notifications');
      }

      const notifyResult = await notifyResponse.json();

      // Show success message
      setSuccessMessage(
        `âœ… Success! Sent ${notifyResult.results.successful} notifications to users. ` +
        `Failed: ${notifyResult.results.failed}. Grace period ends: ${new Date(notifyResult.results.gracePeriodEnd).toLocaleDateString()}`
      );

      // Mark notifications as sent (disable button)
      setNotificationsSent(true);

      // Auto-dismiss after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);

      // Reload dashboard data
      await loadDashboardData();

    } catch (err) {
      logErrorFromCatch(err, 'ComplianceDashboard', '[SEND NOTIFICATIONS] Error:');
      setError('Failed to send notifications: ' + err.message);
    } finally {
      setSendingNotifications(false);
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
          <button 
            onClick={handleSendPolicyNotifications} 
            className="btn-send-notifications"
            disabled={sendingNotifications || notificationsSent || notificationsAlreadySent}
          >
            {sendingNotifications ? '📧 Sending...' : (notificationsSent || notificationsAlreadySent) ? '✅ Notifications Sent' : '📧 Send Policy Notifications'}
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

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
