import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../context/TranslationContext';
import { useSpeech } from '../hooks/useSpeech';
import { useHoroscopePreferences } from '../hooks/useHoroscopePreferences';
import { useHoroscopeFetch } from '../hooks/useHoroscopeFetch';
import BirthChartCard from '../components/BirthChartCard';
import ExitButton from '../components/ExitButton';
import SunSignInfo from '../components/SunSignInfo';
import HoroscopeTextSection from '../components/HoroscopeTextSection';
import { ComplianceUpdateModal } from '../components/ComplianceUpdateModal';
import { useAstroInfo } from '../hooks/useAstroInfo';
import { useFreeTrial } from '../hooks/useFreeTrial';
import { getTranslatedAstrologyData } from '../utils/translatedAstroUtils';
import { isBirthInfoMissing } from '../utils/birthInfoErrorHandler';
import BirthInfoMissingPrompt from '../components/BirthInfoMissingPrompt';
import { formatDateByLanguage } from '../utils/dateLocaleUtils';
import { formatTimestampToLocal } from '../utils/timestampFormatter';
import LogoWithCopyright from '../components/LogoWithCopyright';
import '../styles/responsive.css';
import './HoroscopePage.css';

/**
 * HoroscopePage - Displays daily/weekly horoscopes with voice support
 * FIXED: Prevents infinite re-render loop by only loading on mount + range change
 */
export default function HoroscopePage({ userId, token, auth, onExit, onNavigateToPage }) {
  const { t, language } = useTranslation();
  const [horoscopeRange, setHoroscopeRange] = useState('daily');
  const [sunSignData, setSunSignData] = useState(null);
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);
  
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";
  
  // Refs to prevent duplicate loads
  const initLoadDoneRef = useRef(false);
  const prevRangeRef = useRef('daily');
  
  // Hooks
  const { speak, stop, pause, resume, isPlaying, isPaused, isLoading: isSpeechLoading, error: speechError, isSupported, volume, setVolume } = useSpeech();
  const { showingBrief, setShowingBrief, voiceEnabled } = useHoroscopePreferences(userId, token, API_URL);
  const { horoscopeState, complianceStatus, setComplianceStatus, loadHoroscope, stopPolling } = useHoroscopeFetch(userId, token, API_URL, horoscopeRange, auth?.isAuthenticated || !!token);
  const { astroInfo, fetchAstroInfo } = useAstroInfo(userId, token);
  const { completeTrial: completeFreeTrial } = useFreeTrial(auth?.isTemporaryAccount, userId);

  // Fetch astro info on mount only
  useEffect(() => {
    if (!astroInfo) fetchAstroInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mark free trial as completed when horoscope loads (for temp accounts)
  useEffect(() => {
    if (auth?.isTemporaryAccount && horoscopeState.data && !horoscopeState.loading) {
      completeFreeTrial().catch(err => {
      });
    }
  }, [auth?.isTemporaryAccount, horoscopeState.data, horoscopeState.loading, completeFreeTrial]);

  // ✅ CRITICAL FIX: Load horoscope only on mount and when range changes
  // Do NOT include loadHoroscope in deps - it changes on every render
  useEffect(() => {
    // First mount: load initial horoscope
    if (!initLoadDoneRef.current) {
      initLoadDoneRef.current = true;
      loadHoroscope();
      return;
    }
    
    // Range changed: reload
    if (horoscopeRange !== prevRangeRef.current) {
      prevRangeRef.current = horoscopeRange;
      loadHoroscope();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horoscopeRange]); // Only depend on horoscopeRange!

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
        <LogoWithCopyright size="80px" alt="Starship Psychics" />
        <div className="horoscope-header-text">
          <h2 className="heading-primary">{t('horoscope.title')}</h2>
          <p className="horoscope-subtitle">{t('horoscope.subtitle')}</p>
        </div>
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
        <BirthInfoMissingPrompt onNavigateToPersonalInfo={() => onNavigateToPage?.(1)} />
      )}
      {horoscopeState.error === 'BIRTH_INFO_MISSING' && (
        <BirthInfoMissingPrompt onNavigateToPersonalInfo={() => onNavigateToPage?.(1)} />
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
            <p className="horoscope-date">
              {horoscopeState.data.generatedAt 
                ? formatTimestampToLocal(horoscopeState.data.generatedAt, language)
                : formatDateByLanguage(new Date(), language)}
            </p>
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
