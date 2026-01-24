import { useEffect, useRef } from 'react';
import { useTranslation } from '../context/TranslationContext';
import { useSpeech } from '../hooks/useSpeech';
import { useAstroInfo } from '../hooks/useAstroInfo';
import { useSunSignData } from '../hooks/useSunSignData';
import { useMoonPhaseCalculation } from './MoonPhasePage/hooks/useMoonPhaseCalculation';
import { useMoonPhasePreferences } from './MoonPhasePage/hooks/useMoonPhasePreferences';
import { useMoonPhaseFetch } from './MoonPhasePage/hooks/useMoonPhaseFetch';
import { MoonPhaseDisplaySection } from './MoonPhasePage/components/MoonPhaseDisplaySection';
import { BirthChartSection } from './MoonPhasePage/components/BirthChartSection';
import { MoonPhaseTextSection } from './MoonPhasePage/components/MoonPhaseTextSection';
import { LunarCycleGrid } from './MoonPhasePage/components/LunarCycleGrid';
import SunSignInfo from '../components/SunSignInfo';
import BirthInfoMissingPrompt from '../components/BirthInfoMissingPrompt';
import { isBirthInfoMissing } from '../utils/birthInfoErrorHandler';
import '../styles/responsive.css';
import './MoonPhasePage.css';

/**
 * MoonPhasePage - Displays personalized moon phase commentary
 * REFACTORED: Clean architecture with custom hooks and extracted components
 * Following HoroscopePage pattern for consistency
 */
export default function MoonPhasePage({ userId, token, auth, onNavigateToPage }) {
  const { t, language } = useTranslation();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

  // Refs to prevent duplicate loads
  const initLoadDoneRef = useRef(false);

  // Calculate current moon phase
  const currentPhase = useMoonPhaseCalculation();

  // Hooks
  const { speak, stop, pause, resume, isPlaying, isPaused, isLoading: isSpeechLoading, error: speechError, isSupported, volume, setVolume } = useSpeech();
  const { showingBrief, setShowingBrief, voiceEnabled } = useMoonPhasePreferences(userId, token, API_URL);
  const { moonPhaseState, hasAutoPlayed, setHasAutoPlayed, loadMoonPhase, stopPolling } = useMoonPhaseFetch(userId, token, currentPhase);
  const { astroInfo, fetchAstroInfo } = useAstroInfo(userId, token);
  const sunSignData = useSunSignData(astroInfo, language);

  // Fetch astro info on mount only
  useEffect(() => {
    if (!astroInfo) fetchAstroInfo();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ CRITICAL FIX: Load moon phase only on mount
  // Do NOT include loadMoonPhase in deps - it changes on every render
  useEffect(() => {
    if (!initLoadDoneRef.current && currentPhase) {
      initLoadDoneRef.current = true;
      loadMoonPhase();
    }
  }, [currentPhase]); // Only depend on currentPhase!

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // Auto-play when moon phase data arrives
  useEffect(() => {
    if (voiceEnabled && isSupported && moonPhaseState.data && !hasAutoPlayed && !isPlaying) {
      setHasAutoPlayed(true);
      const textToRead = showingBrief && moonPhaseState.data?.brief 
        ? moonPhaseState.data.brief 
        : moonPhaseState.data?.text;
      setTimeout(() => {
        speak(textToRead, { rate: 0.95, pitch: 1.2 });
      }, 500);
    }
  }, [voiceEnabled, isSupported, moonPhaseState.data, hasAutoPlayed, isPlaying, showingBrief, speak, setHasAutoPlayed]);

  // Handlers
  const handleTogglePause = () => (isPlaying ? pause() : isPaused ? resume() : null);
  const handlePlayVoice = () => {
    const textToRead = showingBrief && moonPhaseState.data?.brief 
      ? moonPhaseState.data.brief 
      : moonPhaseState.data?.text;
    speak(textToRead, { rate: 0.95, pitch: 1.2 });
  };

  const astro = astroInfo?.astrology_data || {};

  return (
    <div className="page-safe-area moon-phase-page">
      <div className="moon-phase-header">
        <h2 className="heading-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/StarshipPsychics_Logo.png" alt="Starship Psychics" style={{ width: '80px', height: '80px' }} />
          {t('moonPhase.title')}
        </h2>
        <p className="moon-phase-subtitle">{t('moonPhase.subtitle')}</p>
      </div>

      {/* Birth Info Missing Prompt */}
      {!moonPhaseState.loading && !moonPhaseState.error && !moonPhaseState.data && isBirthInfoMissing(astroInfo) && (
        <BirthInfoMissingPrompt 
          onNavigateToPersonalInfo={() => onNavigateToPage && onNavigateToPage(2)}
        />
      )}
      {moonPhaseState.error === 'BIRTH_INFO_MISSING' && (
        <BirthInfoMissingPrompt 
          onNavigateToPersonalInfo={() => onNavigateToPage && onNavigateToPage(2)}
        />
      )}

      {/* Error State */}
      {moonPhaseState.error && moonPhaseState.error !== 'BIRTH_INFO_MISSING' && (
        <div className="moon-phase-content error">
          <p className="error-message">⚠️ {moonPhaseState.error}</p>
          <button onClick={loadMoonPhase} className="btn-secondary">
            {t('common.tryAgain')}
          </button>
        </div>
      )}

      {/* Loading State */}
      {moonPhaseState.loading && (
        <div className="moon-phase-content loading">
          <div className="spinner">🌙</div>
          <p>
            {moonPhaseState.generating ? t('moonPhase.loading') : t('moonPhase.loading')}
          </p>
        </div>
      )}

      {/* Current Moon Phase Display */}
      {currentPhase && !isBirthInfoMissing(astroInfo) && (
        <MoonPhaseDisplaySection currentPhase={currentPhase} language={language} />
      )}

      {/* Birth Chart */}
      {!isBirthInfoMissing(astroInfo) && (
        <BirthChartSection astroData={astro} />
      )}

      {/* Moon Phase Content */}
      {moonPhaseState.data && !moonPhaseState.loading && (
        <section className="moon-phase-content">
          <MoonPhaseTextSection
            moonPhaseData={moonPhaseState.data}
            showingBrief={showingBrief}
            onToggleBrief={() => setShowingBrief(!showingBrief)}
            isSupported={isSupported}
            isPlaying={isPlaying}
            isPaused={isPaused}
            isSpeechLoading={isSpeechLoading}
            speechError={speechError}
            onPlayVoice={handlePlayVoice}
            onTogglePause={handleTogglePause}
            onStop={stop}
            volume={volume}
            onVolumeChange={setVolume}
          />

          {/* Sun Sign Info */}
          <SunSignInfo sunSignData={sunSignData} />

          {/* Last Updated Timestamp */}
          {moonPhaseState.lastUpdated && (
            <div className="moon-phase-timestamp">
              <p className="text-muted">Generated: {moonPhaseState.lastUpdated}</p>
            </div>
          )}

          {/* Lunar Cycle Grid */}
          <LunarCycleGrid currentPhase={currentPhase} />

          {/* Info and Disclaimer */}
          <div className="moon-phase-info">
            <p>{t('moonPhase.cycleInfo')}</p>
          </div>

          <div className="moon-phase-disclaimer">
            <p>{t('moonPhase.disclaimer')}</p>
          </div>
        </section>
      )}
    </div>
  );
}
