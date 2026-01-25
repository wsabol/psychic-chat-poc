import React from 'react';
import styles from '../MySignModal.module.css';

/**
 * MythologySection - Displays mythological information about the sign
 * Shows archetype, deity, and story
 */
export function MythologySection({ mythology }) {
  if (!mythology) return null;

  return (
    <div className={styles.detailSection}>
      <h4>Mythology</h4>
      
      {mythology.archetype && (
        <p><strong>Archetype:</strong> {mythology.archetype}</p>
      )}
      
      {mythology.deity && (
        <p><strong>Deity:</strong> {mythology.deity}</p>
      )}
      
      {mythology.story && (
        <p><strong>Story:</strong> {mythology.story}</p>
      )}
    </div>
  );
}
