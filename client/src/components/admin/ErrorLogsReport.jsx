/**
 * ErrorLogsReport Component (~90 lines)
 * Displays error logs dashboard with critical errors and 7-day summary
 * Delegates to:
 * - useErrorLogs hook for state/fetch logic + auto-fetch on tab change
 * - Subcomponents: TabButton, ErrorCard, SummaryTable
 * - errorLogsStyles for all styling
 */

import React from 'react';
import { useErrorLogs } from './hooks/useErrorLogs.js';
import { TabButton } from './subcomponents/TabButton.jsx';
import { ErrorCard } from './subcomponents/ErrorCard.jsx';
import { SummaryTable } from './subcomponents/SummaryTable.jsx';
import { styles } from '../../styles/errorLogsStyles.js';

export default function ErrorLogsReport({ token, apiUrl }) {
  const {
    activeTab,
    data,
    isLoading,
    error,
    handleTabChange,
    handleRefresh,
    handleMarkResolved,
  } = useErrorLogs(token, apiUrl);

  const getHeaderTitle = () => {
    return activeTab === 'critical' 
      ? '🚨 Unresolved Critical Errors' 
      : '📊 Error Summary (Last 7 Days)';
  };

  return (
    <div style={styles.container}>
      {/* Tabs */}
      <div style={styles.tabsContainer}>
        <TabButton
          label="🚨 Critical Errors (24h)"
          isActive={activeTab === 'critical'}
          onClick={() => handleTabChange('critical')}
        />
        <TabButton
          label="📊 Error Summary (7d)"
          isActive={activeTab === 'summary'}
          onClick={() => handleTabChange('summary')}
        />
      </div>

      {/* Header with refresh button */}
      <div style={styles.headerContainer}>
        <h3 style={styles.headerTitle}>
          {getHeaderTitle()}
        </h3>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          style={{
            ...styles.refreshButton,
            opacity: isLoading ? 0.6 : 1,
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div style={styles.errorMessage}>
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div style={styles.loadingContainer}>
          Loading...
        </div>
      )}

      {/* Critical Errors Tab */}
      {activeTab === 'critical' && !isLoading && (
        <>
          {data && data.length > 0 ? (
            <div style={styles.errorCardsGrid}>
              {data.map((error) => (
                <ErrorCard
                  key={error.id}
                  error={error}
                  onResolve={() => handleMarkResolved(error.id)}
                />
              ))}
            </div>
          ) : (
            <div style={styles.emptyState}>
              ✅ No critical errors in the last 24 hours
            </div>
          )}
        </>
      )}

      {/* Summary Tab */}
      {activeTab === 'summary' && !isLoading && (
        <>
          {data && data.length > 0 ? (
            <SummaryTable data={data} />
          ) : (
            <div style={styles.emptyState}>
              ✅ No errors in the last 7 days
            </div>
          )}
        </>
      )}
    </div>
  );
}
