import React from 'react';
import styles from '../MySignModal.module.css';

/**
 * ZodiacSignSection - Traditional zodiac sign info (when no birth chart available)
 * Displays basic zodiac information from birth date only
 */
export function ZodiacSignSection({ astroData }) {
  const { sun_sign, name, emoji, symbol, dates, element, rulingPlanet } = astroData;

  // Only show if no calculated birth chart data
  if (sun_sign || !name) return null;

  return (
    <div className={styles.zodiacSignSection}>
      <h3 className={styles.zodiacTitle}>
        {emoji} {name}
        {symbol && <span className={styles.zodiacSymbol}>{symbol}</span>}
      </h3>
      <p><strong>Dates:</strong> {dates}</p>
      <p><strong>Element:</strong> {element}</p>
      <p><strong>Ruling Planet:</strong> {rulingPlanet}</p>
    </div>
  );
}
