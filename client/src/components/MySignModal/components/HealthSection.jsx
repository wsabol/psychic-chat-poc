import React from 'react';
import styles from '../MySignModal.module.css';

/**
 * HealthSection - Displays health and wellness information
 * Shows vulnerable areas, tendencies, and recommendations
 */
export function HealthSection({ health }) {
  if (!health) return null;

  return (
    <div className={styles.detailSection}>
      <h4>Health & Wellness</h4>
      
      {health.bodyParts && (
        <p>
          <strong>Vulnerable Areas:</strong>{' '}
          {Array.isArray(health.bodyParts)
            ? health.bodyParts.join(', ')
            : health.bodyParts}
        </p>
      )}
      
      {health.tendencies && (
        <div>
          <p><strong>Health Tendencies:</strong></p>
          <ul>
            {Array.isArray(health.tendencies)
              ? health.tendencies.map((tendency, idx) => (
                  <li key={idx}>{tendency}</li>
                ))
              : <li>{health.tendencies}</li>}
          </ul>
        </div>
      )}
      
      {health.recommendations && (
        <div>
          <p><strong>Wellness Recommendations:</strong></p>
          <ul>
            {Array.isArray(health.recommendations)
              ? health.recommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))
              : <li>{health.recommendations}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
