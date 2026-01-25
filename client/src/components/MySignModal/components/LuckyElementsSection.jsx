import React from 'react';
import styles from '../MySignModal.module.css';

/**
 * LuckyElementsSection - Displays lucky numbers, colors, days, crystals
 * Formatted in a clean, organized layout
 */
export function LuckyElementsSection({ luckyElements }) {
  if (!luckyElements) return null;

  return (
    <div className={`${styles.detailSection} ${styles.luckySection}`}>
      <h4>Lucky Elements</h4>
      
      {luckyElements.numbers && (
        <p><strong>Numbers:</strong> {luckyElements.numbers.join(', ')}</p>
      )}
      
      {luckyElements.colors && (
        <p><strong>Colors:</strong> {luckyElements.colors.join(', ')}</p>
      )}
      
      {luckyElements.days && (
        <p><strong>Days:</strong> {luckyElements.days.join(', ')}</p>
      )}
      
      {luckyElements.stones && (
        <p><strong>Crystals:</strong> {luckyElements.stones.join(', ')}</p>
      )}
    </div>
  );
}
