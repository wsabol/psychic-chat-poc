/**
 * SummaryTable Component
 * Display error summary data in table format
 */

import { styles, colors } from '../../../styles/errorLogsStyles.js';

export function SummaryTable({ data }) {
  const getSeverityBadgeStyle = (severity) => {
    const baseStyle = { ...styles.severityBadge };
    if (severity === 'critical') {
      return { ...baseStyle, ...styles.severityBadgeCritical };
    } else if (severity === 'warning') {
      return { ...baseStyle, ...styles.severityBadgeWarning };
    } else {
      return { ...baseStyle, ...styles.severityBadgeSuccess };
    }
  };

  const getRowBackgroundColor = (index) => {
    return index % 2 === 0 ? colors.bg_white : colors.bg_light;
  };

  return (
    <div style={styles.tableContainer}>
      <table style={styles.table}>
        <thead>
          <tr style={styles.tableHeader}>
            <th style={styles.tableHeaderCell}>Service</th>
            <th style={styles.tableHeaderCell}>Severity</th>
            <th style={styles.tableHeaderCell}>Count</th>
            <th style={styles.tableHeaderCell}>Date</th>
            <th style={styles.tableHeaderCell}>Affected Users</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={row.id || `${row.service}-${row.error_date}-${row.error_count}`}
              style={{
                ...styles.tableBody,
                backgroundColor: getRowBackgroundColor(index),
              }}
            >
              <td style={styles.tableBodyCell}>{row.service}</td>
              <td style={styles.tableBodyCell}>
                <span style={getSeverityBadgeStyle(row.severity)}>
                  {row.severity}
                </span>
              </td>
              <td style={{ ...styles.tableBodyCell, fontWeight: 'bold' }}>{row.error_count}</td>
              <td style={styles.tableBodyCell}>{new Date(row.error_date).toLocaleDateString()}</td>
              <td style={styles.tableBodyCell}>{row.affected_users}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
