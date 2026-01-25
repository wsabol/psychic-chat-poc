import React from 'react';
import styles from '../MySignModal.module.css';

/**
 * CompatibilitySection - Displays compatibility information with other signs
 * Shows most compatible, least compatible, and description
 */
export function CompatibilitySection({ compatibility }) {
  if (!compatibility) return null;

  return (
    <div className={styles.detailSection}>
      <h4>Compatibility</h4>
      
      {compatibility.mostCompatible && (
        <p>
          <strong>Most Compatible:</strong>{' '}
          {Array.isArray(compatibility.mostCompatible)
            ? compatibility.mostCompatible.join(', ')
            : compatibility.mostCompatible}
        </p>
      )}
      
      {compatibility.leastCompatible && (
        <p>
          <strong>Challenges:</strong>{' '}
          {Array.isArray(compatibility.leastCompatible)
            ? compatibility.leastCompatible.join(', ')
            : compatibility.leastCompatible}
        </p>
      )}
      
      {compatibility.description && (
        <p className={styles.italicText}>{compatibility.description}</p>
      )}
    </div>
  );
}
