/**
 * Redemption Analytics Section
 * Displays how many users successfully redeemed violations
 */

import React from 'react';
import { styles } from '../violationStyles';

export default function RedemptionAnalytics({ redemptionAnalytics }) {
  if (!redemptionAnalytics || redemptionAnalytics.length === 0) return null;

  return (
    <details style={styles.detailsSection}>
      <summary style={styles.detailsSummary}>
        ✨ Redemption Analytics ({redemptionAnalytics.length})
      </summary>
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th style={styles.tableHeaderCellLeft}>Type</th>
              <th style={styles.tableHeaderCell}>Eligible</th>
              <th style={styles.tableHeaderCell}>Redeemed</th>
              <th style={styles.tableHeaderCell}>Rate</th>
              <th style={styles.tableHeaderCell}>Avg Hours</th>
            </tr>
          </thead>
          <tbody>
            {redemptionAnalytics.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                <td style={styles.tableCellLeft}>{row.violation_type}</td>
                <td style={styles.tableCell}>{row.total_eligible}</td>
                <td style={{ ...styles.tableCell, color: '#4caf50', fontWeight: 'bold' }}>
                  {row.successfully_redeemed}
                </td>
                <td style={styles.tableCell}>{row.redemption_rate}%</td>
                <td style={styles.tableCell}>{row.avg_hours_to_redemption.toFixed(1)}h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
