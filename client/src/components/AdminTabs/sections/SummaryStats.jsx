/**
 * Summary Statistics Section
 * Displays key violation metrics at a glance
 */

import React from 'react';
import { styles } from '../violationStyles';

function StatBox({ label, value, color }) {
  return (
    <div style={styles.statBox(color)}>
      <p style={styles.statLabel}>{label}</p>
      <p style={{ ...styles.statValue, color: color || '#333' }}>{value}</p>
    </div>
  );
}

export default function SummaryStats({ summary }) {
  if (!summary) return null;

  return (
    <div style={styles.summaryGrid}>
      <StatBox label="Total Violations" value={summary.total_active_violations} color="#ff9800" />
      <StatBox label="Warnings Issued" value={summary.warnings_issued} color="#4caf50" />
      <StatBox label="Suspensions" value={summary.suspensions_issued} color="#ff6f00" />
      <StatBox label="Permanent Bans" value={summary.permanent_bans} color="#d32f2f" />
      <StatBox label="Successful Redemptions" value={summary.successful_redemptions} color="#2196f3" />
      <StatBox label="False Positives" value={summary.reported_false_positives} color="#9c27b0" />
      <StatBox label="Avg Confidence" value={`${(summary.avg_detection_confidence * 100).toFixed(1)}%`} color="#00bcd4" />
    </div>
  );
}
