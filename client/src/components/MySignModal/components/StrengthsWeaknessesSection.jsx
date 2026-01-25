import React from 'react';
import styles from '../MySignModal.module.css';

/**
 * StrengthsWeaknessesSection - Displays strengths and weaknesses/challenges
 * Reusable list component for trait information
 */
export function StrengthsWeaknessesSection({ strengths, weaknesses }) {
  if (!strengths && !weaknesses) return null;

  return (
    <>
      {strengths && (
        <div className={styles.detailSection}>
          <h4>Strengths</h4>
          <ul>
            {strengths.map((strength, idx) => (
              <li key={idx}>{strength}</li>
            ))}
          </ul>
        </div>
      )}

      {weaknesses && (
        <div className={styles.detailSection}>
          <h4>Challenges to Balance</h4>
          <ul>
            {weaknesses.map((weakness, idx) => (
              <li key={idx}>{weakness}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
