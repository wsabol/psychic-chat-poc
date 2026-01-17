/**
 * ReportDisplay - Display analytics report summary and details
 */

import React from 'react';
import { styles } from '../admin-styles';
import { StatBox } from './StatBox';

export function ReportDisplay({ report }) {
  if (!report) {
    return (
      <div style={styles.placeholderContainer}>
        <p>Click "Load Report" to view analytics data</p>
      </div>
    );
  }

  return (
    <div style={styles.reportContainer}>
      <h2 style={styles.reportTitle}>Report Summary</h2>

      {/* Summary Stats */}
      <div style={styles.statsGrid}>
        <StatBox label="Total Events" value={report.summary.total_events} />
        <StatBox label="Data Period" value={`${report.summary.data_period_days} days`} />
        <StatBox label="Unique Dates" value={report.summary.unique_dates} />
        <StatBox label="Generated" value={new Date(report.generated_at).toLocaleDateString()} />
      </div>

      {/* Detailed Data Preview */}
      <details style={styles.detailsSection}>
        <summary style={styles.detailsSummary}>
          📊 Feature Usage ({report.feature_usage?.length || 0} items)
        </summary>
        <pre style={styles.preformatted}>
          {JSON.stringify(report.feature_usage?.slice(0, 10) || [], null, 2)}
        </pre>
      </details>

      <details style={styles.detailsSection}>
        <summary style={styles.detailsSummary}>
          📍 Daily Active Users by Location ({report.daily_active_by_location?.length || 0} items)
        </summary>
        <pre style={styles.preformatted}>
          {JSON.stringify(report.daily_active_by_location?.slice(0, 10) || [], null, 2)}
        </pre>
      </details>

      <details style={styles.detailsSection}>
        <summary style={styles.detailsSummary}>
          ⚠️ Error Tracking ({report.error_tracking?.length || 0} items)
        </summary>
        <pre style={{ ...styles.preformatted, ...styles.preformattedError }}>
          {JSON.stringify(report.error_tracking?.slice(0, 10) || [], null, 2)}
        </pre>
      </details>

      <details style={styles.detailsSection}>
        <summary style={styles.detailsSummary}>
          📉 Drop-off Analysis ({report.dropoff_analysis?.length || 0} items)
        </summary>
        <pre style={styles.preformatted}>
          {JSON.stringify(report.dropoff_analysis?.slice(0, 10) || [], null, 2)}
        </pre>
      </details>

      <p style={styles.tip}>
        💡 Tip: Click "Export JSON" to download the full report for analysis in VS Code or Excel
      </p>
    </div>
  );
}
