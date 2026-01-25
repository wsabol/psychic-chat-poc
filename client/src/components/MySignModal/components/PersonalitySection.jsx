import React from 'react';
import styles from '../MySignModal.module.css';

/**
 * PersonalitySection - Displays personality traits and life path
 * Reusable component for personality-related information
 */
export function PersonalitySection({ personality, lifePath }) {
  if (!personality && !lifePath) return null;

  return (
    <>
      {personality && (
        <div className={styles.detailSection}>
          <h4>Personality Essence</h4>
          <p className={styles.italicText}>{personality}</p>
        </div>
      )}

      {lifePath && (
        <div className={styles.detailSection}>
          <h4>Life Path</h4>
          <p>{lifePath}</p>
        </div>
      )}
    </>
  );
}
