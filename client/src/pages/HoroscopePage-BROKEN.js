import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../context/TranslationContext';
import { useSpeech } from '../hooks/useSpeech';
import { useHoroscopePreferences } from '../hooks/useHoroscopePreferences';
import { useHoroscopeFetch } from '../hooks/useHoroscopeFetch';
import BirthChartCard from '../components/BirthChartCard';
import ExitButton from '../components/ExitButton';
import SunSignInfo from '../components/SunSignInfo';
import HoroscopeTextSection from '../components/HoroscopeTextSection';
import { ComplianceUpdateModal } from '../components/ComplianceUpdateModal-CLEAN';
import { useAstroInfo } from '../hooks/useAstroInfo';
import { getTranslatedAstrologyData } from '../utils/translatedAstroUtils';
import { isBirthInfoMissing } from '../utils/birthInfoErrorHandler';
import BirthInfoMissingPrompt from '../components/BirthInfoMissingPrompt';
import { formatDateByLanguage } from '../utils/dateLocaleUtils';
import '../styles/responsive.css';
import './HoroscopePage.css';

/**
 * HoroscopePage - Displays daily/weekly horoscopes with voice support
 * 
 * Features:
 * - Fetches existing or generates new horoscopes
 * - Polls for generation status
 * - Voice-to-speech playback
 * - Brief/full text toggle
 * - Sun sign detailed info
 * - Birth chart display (sun/moon/rising)
 * 
 * Refactored: Extracted logic into hooks and sub-components
 * - useHoroscopePreferences: Manages user preferences
 * - useHoroscopeFetch: Handles all horoscope fetching/generation/polling
 * - ExitButton: Temporary account exit
 * - SunSignInfo: Sun sign details
 * - HoroscopeTextSection: Text + voice controls
 */
export default function HoroscopePage({ userId, token, auth, onExit, onNavigateToPage }) {
  const { t, language } = useTranslation();
  const [horoscopeRange, setHoroscopeRange] = useState('daily');
  const [sunSignData, setSunSignData] = useState(null);
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);
  
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";
  
  // Hooks
  const { speak, stop, pause, resume, isPlaying, isPaused, isLoading: isSpeechLoading, error: speechError, isSupported, volume, setVolume } = useSpeech();
  const { showingBrief, setShowingBrief, voiceEnabled } = useHoroscopePreferences(userId, token, API_URL);
  const { horoscopeState, complianceStatus, setComplianceStatus, loadHoroscope, stopPolling } = useHoroscopeFetch(userId, token, API_URL, horoscopeRange);
  const { astroInfo, fetchAstroInfo } = useAstroInfo(userId, token);

  // Fetch astro info on mount
  useEffect(() => {
    if (!astroInfo) fetchAstroInfo();
  }, [userId, token, astroInfo, fetchAstroInfo]);

      // Load horoscope when range changes - use ref to prevent duplicate calls
  const hasLoadedRef = useRef(false);
  useEffect(() => {
    const shouldLoad = !horoscopeState.loading && !horoscopeState.data && !hasLoadedRef.current;
    if (shouldLoad) {
      hasLoadedRef.current = true;
      loadHoroscope();
    } else if (horoscopeRange !== 'daily' && !horoscopeState.loading) {
      // Reset ref when range changes to allow new load
      hasLoadedRef.current = false;
    }
  }, [horoscopeRange, horoscopeState.loading, horoscopeState.data, loadHoroscope]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // Auto-play when horoscope arrives
  useEffect(() => {
    if (voiceEnabled && isSupported && horoscopeState.data && !hasAutoPlayed && !isPlaying) {
      setHasAutoPlayed(true);
      const textToRead = showingBrief && horoscopeState.data?.brief 
        ? horoscopeState.data.brief 
        : horoscopeState.data?.text;
      setTimeout(() => {
        speak(textToRead, { rate: 0.95, pitch: 1.2 });
      }, 500);
    }
  }, [voiceEnabled, isSupported, horoscopeState.data, hasAutoPlayed, isPlaying, showingBrief, speak]);

  // Load sun sign data
  useEffect(() => {
    const loadSunSignData = async () => {
      if (astroInfo?.astrology_data?.sun_sign) {
        const signKey = astroInfo.astrology_data.sun_sign.toLowerCase();
        const data = await getTranslatedAstrologyData(signKey, language);
        const englishData = await getTranslatedAstrologyData(signKey, 'en-US');
        setSunSignData({
          ...data,
          _englishElement: englishData?.element,
          _englishRulingPlanet: englishData?.rulingPlanet
        });
      } else {
        setSunSignData(null);
      }
    };
    loadSunSignData();
  }, [astroInfo, language]);

  // Handlers
  const handleClose = () => onExit?.();
  const handleTogglePause = () => (isPlaying ? pause() : isPaused ? resume() : null);
  const handlePlayVoice = () => {
    const textToRead = showingBrief && horoscopeState.data?.brief 
      ? horoscopeState.data.brief 
      : horoscopeState.data?.text;
    speak(textToRead, { rate: 0.95, pitch: 1.2 });
  };

  const astro = astroInfo?.astrology_data || {};

  // Compliance modal
  if (complianceStatus?.requiresPrivacyUpdate || complianceStatus?.requiresTermsUpdate) {
    return (
      <ComplianceUpdateModal
        userId={userId}
        token={token}
        compliance={{
          blocksAccess: true,
          requiresTermsUpdate: complianceStatus.requiresTermsUpdate,
          requiresPrivacyUpdate: complianceStatus.requiresPrivacyUpdate,
          termsVersion: {
            requiresReacceptance: complianceStatus.requiresTermsUpdate,
            current: complianceStatus.termsVersion
          },
          privacyVersion: {
            requiresReacceptance: complianceStatus.requiresPrivacyUpdate,
            current: complianceStatus.privacyVersion
          }
        }}
        onConsentUpdated={() => {
          setComplianceStatus(null);
          loadHoroscope();
        }}
      />
    );
  }

  return (
    <div className="page-safe-area horoscope-page" style={{ position: 'relative' }}>
      <ExitButton isTemporaryAccount={auth?.isTemporaryAccount} onClick={handleClose} />

      <div className="horoscope-header">
        <h2 className="heading-primary">{t('horoscope.title')}</h2>
        <p className="horoscope-subtitle">{t('horoscope.subtitle')}</p>
      </div>

      <div className="horoscope-toggle">
        {['daily', 'weekly'].map((range) => (
          <button
            key={range}
            className={`toggle-btn ${horoscopeRange === range ? 'active' : ''}`}
            onClick={() => setHoroscopeRange(range)}
            disabled={horoscopeState.loading || horoscopeState.generating}
          >
            {t(`horoscope.${range}`)}
          </button>
        ))}
      </div>

      {/* Birth Info Missing */}
      {!horoscopeState.loading && !horoscopeState.error && isBirthInfoMissing(astroInfo) && (
        <BirthInfoMissingPrompt onNavigateToPersonalInfo={() => onNavigateToPage?.(2)} />
      )}
      {horoscopeState.error === 'BIRTH_INFO_MISSING' && (
        <BirthInfoMissingPrompt onNavigateToPersonalInfo={() => onNavigateToPage?.(2)} />
      )}
      
      {/* Error State */}
      {horoscopeState.error && horoscopeState.error !== 'BIRTH_INFO_MISSING' && (
        <div className="horoscope-content error">
          <p className="error-message">⚠️ {horoscopeState.error}</p>
          <button onClick={loadHoroscope} className="btn-secondary">
            {t('common.tryAgain')}
          </button>
        </div>
      )}

      {/* Loading State */}
      {horoscopeState.loading && (
        <div className="horoscope-content loading">
          <div className="spinner">🔮</div>
          <p>
            {horoscopeState.generating ? t('horoscope.generatingMessage') : t('horoscope.loading')}
          </p>
        </div>
      )}

      {/* Birth Chart */}
      {astro.sun_sign && !isBirthInfoMissing(astroInfo) && (
        <section className="horoscope-birth-chart">
          <div className="birth-chart-cards">
            <BirthChartCard sign={astro.rising_sign} degree={astro.rising_degree} icon="↗️" type="rising" />
            <BirthChartCard sign={astro.moon_sign} degree={astro.moon_degree} icon="🌙" type="moon" />
            <BirthChartCard sign={astro.sun_sign} degree={astro.sun_degree} icon="☀️" type="sun" />
          </div>
        </section>
      )}

      {/* Horoscope Content */}
      {horoscopeState.data && !horoscopeState.loading && (
        <section className="horoscope-content">
          <div className="horoscope-metadata">
            <p className="horoscope-range">
              {t('horoscope.reading', { range: t(`horoscope.${horoscopeState.data.range}`) })}
            </p>
            <p className="horoscope-date">{formatDateByLanguage(new Date(), language)}</p>
          </div>

          <HoroscopeTextSection
            horoscopeData={horoscopeState.data}
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

          <SunSignInfo sunSignData={sunSignData} />

          <div className="horoscope-disclaimer">
            <p>{t('horoscope.disclaimer')}</p>
          </div>
        </section>
      )}
    </div>
  );
}
