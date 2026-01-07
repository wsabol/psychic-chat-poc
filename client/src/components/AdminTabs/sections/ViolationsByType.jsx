/**
 * Violations by Type Section
 * Displays breakdown of violations by type with metrics
 */

import React from 'react';
import { styles } from '../violationStyles';

function ViolationTypeCard({ data }) {
  return (
    <div style={styles.card()}>
      <p style={styles.heading}>{data.type}</p>
      <div style={{ fontSize: '11px', color: '#666', lineHeight: '1.6' }}>
        <div style={{ marginBottom: '0.25rem' }}><strong>Total:</strong> {data.total}</div>
        <div style={{ marginBottom: '0.25rem' }}><strong>Warnings:</strong> {data.warnings}</div>
        <div style={{ marginBottom: '0.25rem' }}><strong>Suspensions:</strong> {data.suspensions}</div>
        <div style={{ marginBottom: '0.25rem' }}><strong>Escalations:</strong> {data.escalations}</div>
        <div style={{ marginBottom: '0.25rem' }}><strong>FP Rate:</strong> {(data.false_positive_rate * 100).toFixed(2)}%</div>
        <div style={{ marginBottom: '0.25rem' }}><strong>Avg Confidence:</strong> {(data.avg_confidence_score * 100).toFixed(1)}%</div>
      </div>
    </div>
  );
}

export default function ViolationsByType({ byType }) {
  if (!byType || byType.length === 0) return null;

  return (
    <details style={styles.detailsSection}>
      <summary style={styles.detailsSummary}>
        📊 Violations by Type ({byType.length})
      </summary>
      <div style={styles.cardGrid}>
        {byType.map((violationType, idx) => (
          <ViolationTypeCard key={idx} data={violationType} />
        ))}
      </div>
    </details>
  );
}
