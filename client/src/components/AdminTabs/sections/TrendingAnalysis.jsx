/**
 * Trending Analysis Section
 * Displays trending violations over the last 30 days
 */

import React from 'react';
import { styles } from '../violationStyles';

export default function TrendingAnalysis({ trending }) {
  if (!trending) return null;

  const hasTrending = trending.daily_trend?.length > 0;

  if (!hasTrending) return null;

  return (
    <details style={styles.detailsSection}>
      <summary style={styles.detailsSummary}>
        📊 Trending (Last 30 Days)
      </summary>
      <div style={{ marginTop: '1rem' }}>
        {trending.daily_trend && trending.daily_trend.length > 0 && (
          <div>
            <h4>Daily Trend:</h4>
            <div style={{
              backgroundColor: '#f5f5f5',
              padding: '0.75rem',
              borderRadius: '6px',
              fontSize: '11px',
              marginBottom: '1rem',
            }}>
              {trending.daily_trend.slice(0, 10).map((row, idx) => (
                <div key={idx} style={{ 
                  padding: '0.25rem 0', 
                  borderBottom: idx < 9 ? '1px solid #eee' : 'none' 
                }}>
                  <strong>{row.date}</strong>: {row.violations} violations, {row.unique_types} types
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </details>
  );
}
