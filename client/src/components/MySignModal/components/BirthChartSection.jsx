import React from 'react';
import styles from '../MySignModal.module.css';

/**
 * BirthChartSection - Displays Sun, Moon, and Rising signs
 * Extracted from MySignModal for better modularity
 */
export function BirthChartSection({ astroData }) {
  const { sun_sign, sun_degree, rising_sign, rising_degree, moon_sign, moon_degree } = astroData;

  if (!sun_sign) return null;

  return (
    <div className={styles.birthChartSection}>
      <h3 className={styles.birthChartTitle}>🔯 Your Birth Chart</h3>
      
      {/* Rising Sign */}
      {rising_sign && (
        <div className={`${styles.signCard} ${styles.risingSignCard}`}>
          <p><strong>↗️ Rising Sign (Ascendant):</strong> {rising_sign} {rising_degree}°</p>
          <p className={styles.signDescription}>
            How others perceive you; your outward personality and first impression
          </p>
        </div>
      )}

      {/* Moon Sign */}
      {moon_sign && (
        <div className={`${styles.signCard} ${styles.moonSignCard}`}>
          <p><strong>🌙 Moon Sign:</strong> {moon_sign} {moon_degree}°</p>
          <p className={styles.signDescription}>
            Your inner emotional world, subconscious needs, and private self
          </p>
        </div>
      )}

      {/* Sun Sign */}
      <div className={`${styles.signCard} ${styles.sunSignCard}`}>
        <p><strong>☀️ Sun Sign:</strong> {sun_sign} {sun_degree}°</p>
        <p className={styles.signDescription}>
          Your core identity, ego, and fundamental essence
        </p>
      </div>
    </div>
  );
}
