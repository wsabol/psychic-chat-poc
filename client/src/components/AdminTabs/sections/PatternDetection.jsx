/**
 * Pattern Detection Section
 * Displays automatically detected violation patterns
 */

import React from 'react';
import { styles } from '../violationStyles';

export default function PatternDetection({ patterns }) {
  if (!patterns) return null;

  const hasPatterns = (patterns.patterns_detected?.length > 0 || 
                       patterns.requiring_manual_review?.length > 0);

  if (!hasPatterns) return null;

  return (
    <details style={styles.detailsSection}>
      <summary style={styles.detailsSummary}>
        🔍 Violation Patterns
      </summary>
      <div style={{ marginTop: '1rem' }}>
        {patterns.patterns_detected && patterns.patterns_detected.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h4>Detected Patterns:</h4>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ddd' }}>
                    <th style={styles.tableHeaderCellLeft}>Pattern</th>
                    <th style={styles.tableHeaderCell}>Severity</th>
                    <th style={styles.tableHeaderCell}>Count</th>
                    <th style={styles.tableHeaderCell}>Reviewed</th>
                    <th style={styles.tableHeaderCell}>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {patterns.patterns_detected.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={styles.tableCellLeft}>{row.pattern_type}</td>
                      <td style={{
                        ...styles.tableCell,
                        color: styles.severityColor(row.severity),
                        fontWeight: 'bold'
                      }}>
                        {row.severity}
                      </td>
                      <td style={styles.tableCell}>{row.detected_count}</td>
                      <td style={styles.tableCell}>{row.reviewed}</td>
                      <td style={styles.tableCell}>{row.avg_pattern_score.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {patterns.requiring_manual_review && patterns.requiring_manual_review.length > 0 && (
          <div style={styles.warningCard}>
            <h4 style={{ marginTop: 0, color: '#c62828' }}>⚠️ Requiring Manual Review:</h4>
            <ul style={{ paddingLeft: '1.5rem', marginBottom: 0 }}>
              {patterns.requiring_manual_review.map((row, idx) => (
                <li key={idx} style={{ fontSize: '12px', marginBottom: '0.25rem' }}>
                  <strong>{row.pattern_type}</strong>: {row.pending_review} pending
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}
