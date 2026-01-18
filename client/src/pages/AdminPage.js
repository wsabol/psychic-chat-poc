/**
 * Admin Dashboard - Analytics Reports & Violation Monitoring
 * Only accessible to admin email: starshiptechnology1@gmail.com
 */

import React, { useState } from 'react';

import ViolationReportTab from '../components/AdminTabs/ViolationReportTab';
import { ComplianceDashboard } from '../components/admin/ComplianceDashboard';
import ErrorLogsReport from '../components/admin/ErrorLogsReport';
import ErrorLoggerTestHarness from '../components/admin/ErrorLoggerTestHarness';
import SubscriptionReportTab from '../components/admin/SubscriptionReportTab';
import { useAdminCheck } from './hooks/useAdminCheck';
import { useAnalyticsReport } from './hooks/useAnalyticsReport';
import { styles } from './admin-styles';
import { TabButton } from './admin-components/TabButton';
import { UnauthorizedView } from './admin-components/UnauthorizedView';
import { AnalyticsTab } from './admin-components/AnalyticsTab';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export default function AdminPage({ token, userId }) {
  const [activeTab, setActiveTab] = useState('subscriptions');
  const { userEmail, isAdmin } = useAdminCheck();
  const {
    isLoading,
    report,
    error,
    message,
    fetchReport,
    exportJSON,
    deleteAllData,
    cleanupOldData,
  } = useAnalyticsReport(token, API_URL);

  // Render unauthorized message
  if (userEmail && !isAdmin) {
    return <UnauthorizedView userEmail={userEmail} />;
  }

    return (
    <div className="page-safe-area" style={styles.pageContainer}>
      <div style={styles.contentWrapper}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.headerTitle}>⚡ Admin Dashboard</h1>
          <p style={styles.headerSubtitle}>
            Subscriptions, Error Reports, Analytics & Compliance
          </p>
        </div>

        {/* Tabs */}
        <div style={styles.tabBar}>
          <TabButton
            label="💳 Subscriptions"
            isActive={activeTab === 'subscriptions'}
            onClick={() => setActiveTab('subscriptions')}
          />
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

        {/* Subscription Report Tab */}
        {activeTab === 'subscriptions' && (
          <SubscriptionReportTab token={token} />
        )}

        {/* Error Logs Tab */}
        {activeTab === 'logs' && (
          <div>
            <ErrorLogsReport token={token} apiUrl={API_URL} />
            <ErrorLoggerTestHarness />
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <AnalyticsTab
            isLoading={isLoading}
            report={report}
            error={error}
            message={message}
            onFetchReport={fetchReport}
            onExportJSON={exportJSON}
            onCleanupOldData={cleanupOldData}
            onDeleteAllData={deleteAllData}
          />
        )}

        {/* Violation Reports Tab */}
        {activeTab === 'violations' && <ViolationReportTab token={token} />}

        {/* Compliance Tab */}
        {activeTab === 'compliance' && <ComplianceDashboard token={token} />}
      </div>
    </div>
  );
}
