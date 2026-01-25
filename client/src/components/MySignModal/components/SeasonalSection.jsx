import React from 'react';
import styles from '../MySignModal.module.css';

/**
 * SeasonalSection - Displays seasonal influences and energies
 * Shows season, energy, and connection information
 */
export function SeasonalSection({ seasonal }) {
  if (!seasonal) return null;

  return (
    <div className={`${styles.detailSection} ${styles.seasonalSection}`}>
      <h4>Seasonal Influence</h4>
      
      {seasonal.season && (
        <p><strong>Season:</strong> {seasonal.season}</p>
      )}
      
      {seasonal.energy && (
        <p><strong>Energy:</strong> {seasonal.energy}</p>
      )}
      
      {seasonal.connection && (
        <p><strong>Connection:</strong> {seasonal.connection}</p>
      )}
    </div>
  );
}
