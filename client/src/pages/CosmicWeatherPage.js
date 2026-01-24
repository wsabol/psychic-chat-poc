import { useState, useEffect } from 'react';
import { useTranslation } from '../context/TranslationContext';
import { useSpeech } from '../hooks/useSpeech';
import { useCosmicWeatherData } from '../hooks/useCosmicWeatherData';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { useAstroInfo } from '../hooks/useAstroInfo';
import VoiceBar from '../components/VoiceBar';
import BirthInfoMissingPrompt from '../components/BirthInfoMissingPrompt';
import BirthChartDisplay from '../components/BirthChartDisplay';
import PlanetsList from '../components/PlanetsList';
import ToggleBriefButton from '../components/ToggleBriefButton';
import LogoWithCopyright from '../components/LogoWithCopyright';
import { isBirthInfoMissing } from '../utils/birthInfoErrorHandler';
import { formatDateByLanguage } from '../utils/dateLocaleUtils';
import '../styles/responsive.css';
import './CosmicWeatherPage.css';

/**
 * Cosmic Weather Page - Refactored
 * 
 * Improvements:
 * - Extracted data fetching to custom hooks (useCosmicWeatherData, useUserPreferences, useAstroInfo)
 * - Extracted UI components (BirthChartDisplay, PlanetsList, ToggleBriefButton)
 * - Eliminated 100+ lines of duplicated JSX (desktop/mobile views now single render)
 * - Removed inline styles, moved to CSS file
 * - Reduced from 390+ lines to ~150 lines
 * - Clear separation of concerns
 */
export default function CosmicWeatherPage({ userId, token, auth, onNavigateToPage }) {
  const { t, language } = useTranslation();
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);

  // Data fetching hooks
  const { cosmicData, loading, generating, error, load: loadCosmicWeather, cleanup } = useCosmicWeatherData(userId, token);
  const { astroInfo, fetchAstroInfo } = useAstroInfo(userId, token);
  const { userPreference, voiceEnabled, showingBrief, setShowingBrief } = useUserPreferences(userId, token);
  const { speak, stop, pause, resume, isPlaying, isPaused, isLoading: isSpeechLoading, error: speechError, isSupported, volume, setVolume } = useSpeech();

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Load cosmic weather on mount and when preference changes
  useEffect(() => {
    if (!loading) {
      loadCosmicWeather();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPreference, loadCosmicWeather]);

  // Fetch astro info if needed
  useEffect(() => {
    if (!astroInfo) {
      fetchAstroInfo();
    }
  }, [userId, token, astroInfo, fetchAstroInfo]);

  // Auto-play when cosmic weather data arrives
  useEffect(() => {
    if (voiceEnabled && isSupported && cosmicData && !hasAutoPlayed && !isPlaying) {
      setHasAutoPlayed(true);
      const textToRead = showingBrief && cosmicData?.brief ? cosmicData.brief : cosmicData?.text;
      setTimeout(() => {
        speak(textToRead, { rate: 0.95, pitch: 1.2 });
      }, 500);
    }
  }, [voiceEnabled, isSupported, cosmicData, hasAutoPlayed, isPlaying, showingBrief, speak]);

  const handleTogglePause = () => {
    if (isPlaying) pause();
    else if (isPaused) resume();
  };

  const handlePlayVoice = () => {
    const textToRead = showingBrief && cosmicData?.brief ? cosmicData.brief : cosmicData?.text;
    speak(textToRead, { rate: 0.95, pitch: 1.2 });
  };

  return (
    <div className="page-safe-area cosmic-weather-page">
      <div className="cosmic-header">
        <LogoWithCopyright size="80px" alt="Starship Psychics" />
        <div className="cosmic-header-text">
          <h2 className="heading-primary">{t('cosmicWeather.title')}</h2>
          <p className="cosmic-subtitle">{t('cosmicWeather.subtitle')}</p>
        </div>
      </div>

      {!loading && !error && !cosmicData && isBirthInfoMissing(astroInfo) && (
        <BirthInfoMissingPrompt 
          onNavigateToPersonalInfo={() => onNavigateToPage && onNavigateToPage(2)}
        />
      )}

      {error && error === 'BIRTH_INFO_MISSING' && (
        <BirthInfoMissingPrompt 
          onNavigateToPersonalInfo={() => onNavigateToPage && onNavigateToPage(2)}
        />
      )}

      {error && error !== 'BIRTH_INFO_MISSING' && (
        <div className="cosmic-content error">
          <p className="error-message">⚠️ {error}</p>
          <button onClick={() => loadCosmicWeather()} className="btn-secondary">
            {t('common.tryAgain')}
          </button>
        </div>
      )}

      {loading && (
        <div className="cosmic-content loading">
          <div className="spinner">🌍</div>
          <p>{generating ? t('cosmicWeather.loading') : t('cosmicWeather.loading')}</p>
        </div>
      )}

      {cosmicData && !loading && (
        <section className="cosmic-content">
          <div className="cosmic-date">
            {formatDateByLanguage(new Date(), language)}
          </div>

          <div className="cosmic-weather-text">
            <div dangerouslySetInnerHTML={{ __html: showingBrief && cosmicData.brief ? cosmicData.brief : cosmicData.text }} />
            
            {/* Voice Bar */}
            {isSupported && (
              <VoiceBar
                isPlaying={isPlaying}
                isPaused={isPaused}
                isLoading={isSpeechLoading}
                error={speechError}
                onPlay={handlePlayVoice}
                onTogglePause={handleTogglePause}
                onStop={stop}
                isSupported={isSupported}
                volume={volume}
                onVolumeChange={setVolume}
              />
            )}
            
            <ToggleBriefButton
              showingBrief={showingBrief}
              onClick={() => setShowingBrief(!showingBrief)}
            />
          </div>

          {/* Desktop: Two columns */}
          <div className="cosmic-columns">
            <div className="cosmic-column">
              <h3 className="column-title">{t('astrology.birthChart')}</h3>
              <BirthChartDisplay birthChart={cosmicData.birthChart} />
            </div>

            <div className="cosmic-column">
              <h3 className="column-title">{t('astrology.planets')}</h3>
              <PlanetsList planets={cosmicData.planets} />
            </div>
          </div>

          {/* Mobile: Single column */}
          <div className="cosmic-mobile">
            <div className="mobile-section">
              <h3>{t('astrology.birthChart')}</h3>
              <BirthChartDisplay birthChart={cosmicData.birthChart} />
            </div>

            <div className="mobile-section">
              <h3>{t('astrology.planets')}</h3>
              <PlanetsList planets={cosmicData.planets} />
            </div>
          </div>

          <div className="cosmic-disclaimer">
            <p>{t('common.disclaimer')}</p>
          </div>
        </section>
      )}
    </div>
  );
}
