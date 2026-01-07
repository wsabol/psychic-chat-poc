/**
 * Escalation Metrics Section
 * Displays what percentage of violations reach each enforcement stage
 */

import React from 'react';
import { styles } from '../violationStyles';

export default function EscalationMetrics({ escalationMetrics }) {
  if (!escalationMetrics || escalationMetrics.length === 0) return null;

  return (
    <details style={styles.detailsSection}>
      <summary style={styles.detailsSummary}>
        📈 Escalation Metrics ({escalationMetrics.length})
      </summary>
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th style={styles.tableHeaderCellLeft}>Type</th>
              <th style={styles.tableHeaderCell}>Total</th>
              <th style={styles.tableHeaderCell}>1st Offense %</th>
              <th style={styles.tableHeaderCell}>2nd Offense %</th>
              <th style={styles.tableHeaderCell}>Ban %</th>
            </tr>
          </thead>
          <tbody>
            {escalationMetrics.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                <td style={styles.tableCellLeft}>{row.violation_type}</td>
                <td style={styles.tableCell}>{row.total}</td>
                <td style={styles.tableCell}>{row.first_offense_pct}%</td>
                <td style={styles.tableCell}>{row.second_offense_pct}%</td>
                <td style={{ ...styles.tableCell, color: '#d32f2f', fontWeight: 'bold' }}>
                  {row.permanent_ban_pct}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
