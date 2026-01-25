import React from 'react';
import { useMySignModal } from './hooks/useMySignModal';
import { BirthChartSection } from './components/BirthChartSection';
import { ZodiacSignSection } from './components/ZodiacSignSection';
import { PersonalitySection } from './components/PersonalitySection';
import { StrengthsWeaknessesSection } from './components/StrengthsWeaknessesSection';
import { LuckyElementsSection } from './components/LuckyElementsSection';
import { CompatibilitySection } from './components/CompatibilitySection';
import { SeasonalSection } from './components/SeasonalSection';
import { MythologySection } from './components/MythologySection';
import { HealthSection } from './components/HealthSection';
import { CareerSection } from './components/CareerSection';
import styles from './MySignModal.module.css';

/**
 * MySignModal - Refactored version
 * Now uses modular components and custom hooks for better maintainability
 * Reduced from 400+ lines to ~80 lines by extracting concerns
 */
function MySignModal({ userId, token, isOpen, onClose }) {
  const { astroData, loading, error } = useMySignModal(userId, token, isOpen);

  if (!isOpen) return null;

  const astro = astroData?.astrology_data;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Your Astrological Profile</h2>
          <button onClick={onClose} className={styles.closeButton} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Loading State */}
        {loading && <p className={styles.loadingText}>Loading your astrological data...</p>}

        {/* Error State */}
        {error && <p className={styles.errorText}>⚠️ {error}</p>}

        {/* Content */}
        {astro && (
          <div className={styles.content}>
            {/* Info Banner */}
            <div className={styles.infoBanner}>
              <p>
                <strong>📝 About Your Astrology:</strong> Your birth chart has been calculated 
                using Swiss Ephemeris based on your birth date, time, and location. These precise 
                astronomical calculations show your Sun, Moon, and Rising signs.
              </p>
            </div>

            {/* Birth Chart Section (if calculated data available) */}
            <BirthChartSection astroData={astro} />

            {/* Zodiac Sign Section (if only basic data available) */}
            <ZodiacSignSection astroData={astro} />

            {/* Personality Details */}
            <PersonalitySection 
              personality={astro.personality} 
              lifePath={astro.lifePath} 
            />

            {/* Strengths & Weaknesses */}
            <StrengthsWeaknessesSection 
              strengths={astro.strengths} 
              weaknesses={astro.weaknesses} 
            />

            {/* Lucky Elements */}
            <LuckyElementsSection luckyElements={astro.luckyElements} />

            {/* Compatibility */}
            <CompatibilitySection compatibility={astro.compatibility} />

            {/* Seasonal Influence */}
            <SeasonalSection seasonal={astro.seasonal} />

            {/* Mythology */}
            <MythologySection mythology={astro.mythology} />

            {/* Health & Wellness */}
            <HealthSection health={astro.health} />

            {/* Career & Purpose */}
            <CareerSection careerSpecific={astro.careerSpecific} />
          </div>
        )}
      </div>
    </div>
  );
}

export default MySignModal;
