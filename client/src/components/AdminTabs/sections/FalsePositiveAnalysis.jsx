/**
 * False Positive Analysis Section
 * Displays violations users reported as incorrect
 */

import React from 'react';
import { styles } from '../violationStyles';

export default function FalsePositiveAnalysis({ falsePositiveAnalysis }) {
  if (!falsePositiveAnalysis) return null;

  const hasData = (falsePositiveAnalysis.by_type?.length > 0 || 
                   falsePositiveAnalysis.top_reasons?.length > 0);

  if (!hasData) return null;

  return (
    <details style={styles.detailsSection}>
      <summary style={styles.detailsSummary}>
        ⚠️ False Positive Analysis
      </summary>
      <div style={{ marginTop: '1rem' }}>
        {falsePositiveAnalysis.by_type && falsePositiveAnalysis.by_type.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <h4>By Type:</h4>
            <div style={styles.smallCardGrid}>
              {falsePositiveAnalysis.by_type.map((row, idx) => (
                <div key={idx} style={styles.fpCard}>
                  <p style={styles.heading}>{row.type}</p>
                  <p style={styles.subtext}>Reported: {row.reported}</p>
                  <p style={styles.subtext}>Reporters: {row.unique_reporters}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {falsePositiveAnalysis.top_reasons && falsePositiveAnalysis.top_reasons.length > 0 && (
          <div>
            <h4>Top Reasons:</h4>
            <ol style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
              {falsePositiveAnalysis.top_reasons.map((row, idx) => (
                <li key={idx} style={{ fontSize: '12px', marginBottom: '0.25rem' }}>
                  <strong>{row.reason}</strong> ({row.count})
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </details>
  );
}
