import { useState, useEffect } from 'react';
import { useTranslation } from '../context/TranslationContext';
import { useSpeech } from '../hooks/useSpeech';
import VoiceBar from '../components/VoiceBar';
import { ComplianceUpdateModal } from '../components/ComplianceUpdateModal-CLEAN';
import { useAstroInfo } from '../hooks/useAstroInfo';
import { useHoroscopeFetch } from '../hooks/useHoroscopeFetch';
import { useHoroscopePreferences } from '../hooks/useHoroscopePreferences';
import { useSunSignData } from '../hooks/useSunSignData';

import { isBirthInfoMissing } from '../utils/birthInfoErrorHandler';
import { formatDateByLanguage } from '../utils/dateLocaleUtils';
import { getTextToSpeak, buildComplianceModalProps, HOROSCOPE_CONFIG } from '../utils/horoscopeUtils';
import BirthInfoMissingPrompt from '../components/BirthInfoMissingPrompt';
import '../styles/responsive.css';
import './HoroscopePage.css';

export default function HoroscopePage({ userId, token, auth, onExit, onNavigateToPage }) {
  const { t, language } = useTranslation();
  const {
    speak,
    stop,
    pause,
    resume,
    isPlaying,
    isPaused,
    isLoading: isSpeechLoading,
    error: speechError,
    isSupported,
    volume,
    setVolume
  } = useSpeech();

  // ============================================================
  // STATE
  // ============================================================
  const [horoscopeRange, setHoroscopeRange] = useState('daily');
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);

  // ============================================================
  // CONFIG
  // ============================================================
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

  // ============================================================
  // HOOKS
  // ============================================================
  const { astroInfo, fetchAstroInfo } = useAstroInfo(userId, token);

  const {
    horoscopeData,
    loading,
    generating,
    error,
    complianceStatus,
    loadHoroscope,
    setComplianceStatus,
    cleanup
  } = useHoroscopeFetch(userId, token, API_URL);

  const { userPreference, voiceEnabled, showingBrief, setShowingBrief } = useHoroscopePreferences(
    userId,
    token,
    API_URL
  );

  const sunSignData = useSunSignData(astroInfo, language);
  const astro = astroInfo?.astrology_data || {};

  // ============================================================
  // LIFECYCLE
  // ============================================================

  // Fetch astro info on mount
  useEffect(() => {
    if (!astroInfo) {
      fetchAstroInfo();
    }
  }, [userId, token, astroInfo, fetchAstroInfo]);

  // Load horoscope when range or preference changes
  useEffect(() => {
    if (!loading) {
      loadHoroscope(horoscopeRange);
    }
  }, [horoscopeRange, userPreference, loadHoroscope]);

  // Cleanup polling on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Auto-play voice when horoscope arrives
  useEffect(() => {
    if (voiceEnabled && isSupported && horoscopeData && !hasAutoPlayed && !isPlaying) {
      setHasAutoPlayed(true);
      const textToRead = getTextToSpeak(horoscopeData, showingBrief);
      setTimeout(() => {
        speak(textToRead, { rate: HOROSCOPE_CONFIG.VOICE_RATE, pitch: HOROSCOPE_CONFIG.VOICE_PITCH });
      }, HOROSCOPE_CONFIG.VOICE_AUTO_PLAY_DELAY_MS);
    }
  }, [voiceEnabled, isSupported, horoscopeData, hasAutoPlayed, isPlaying, showingBrief, speak]);

  // ============================================================
  // EVENT HANDLERS
  // ============================================================
  const handleClose = () => {
    if (onExit) {
      onExit();
    } else {
      console.warn('[HOROSCOPE] onExit prop not provided!');
    }
  };

  const handleTogglePause = () => {
    if (isPlaying) {
      pause();
    } else if (isPaused) {
      resume();
    }
  };

  const handlePlayVoice = () => {
    const textToRead = getTextToSpeak(horoscopeData, showingBrief);
    speak(textToRead, { rate: HOROSCOPE_CONFIG.VOICE_RATE, pitch: HOROSCOPE_CONFIG.VOICE_PITCH });
  };

  // ============================================================
  // COMPLIANCE CHECK
  // ============================================================
  if (complianceStatus?.requiresPrivacyUpdate || complianceStatus?.requiresTermsUpdate) {
    return (
      <ComplianceUpdateModal
        {...buildComplianceModalProps(userId, token, complianceStatus, () => {
          setComplianceStatus(null);
          loadHoroscope(horoscopeRange);
        })}
      />
    );
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="page-safe-area horoscope-page" style={{ position: 'relative' }}>
      {/* Exit button for temp accounts */}
      {auth?.isTemporaryAccount && (
        <div
          style={{
            position: 'fixed',
            top: '1rem',
            right: '1rem',
            zIndex: 1000
          }}
        >
          <button
            type="button"
            onClick={handleClose}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'rgba(124, 99, 216, 0.9)',
              border: '2px solid #7c63d8',
              color: 'white',
              fontSize: '0.95rem',
              fontWeight: '600',
              cursor: 'pointer',
              borderRadius: '5px',
              transition: 'all 0.2s ease'
            }}
            title="Exit free trial"
          >
            ✕ Exit
          </button>
        </div>
      )}

      {/* Header */}
      <div className="horoscope-header">
        <h2 className="heading-primary">{t('horoscope.title')}</h2>
        <p className="horoscope-subtitle">{t('horoscope.subtitle')}</p>
      </div>

      {/* Range toggle */}
      <div className="horoscope-toggle">
        {HOROSCOPE_CONFIG.RANGES.map((range) => (
          <button
            key={range}
            className={`toggle-btn ${horoscopeRange === range ? 'active' : ''}`}
            onClick={() => setHoroscopeRange(range)}
            disabled={loading || generating}
          >
            {t(`horoscope.${range}`)}
          </button>
        ))}
      </div>

      {/* Birth info check */}
      {!loading && !error && isBirthInfoMissing(astroInfo) && (
        <BirthInfoMissingPrompt onNavigateToPersonalInfo={() => onNavigateToPage && onNavigateToPage(2)} />
      )}

      {error && error === 'BIRTH_INFO_MISSING' && (
        <BirthInfoMissingPrompt onNavigateToPersonalInfo={() => onNavigateToPage && onNavigateToPage(2)} />
      )}

      {/* Error state */}
      {error && error !== 'BIRTH_INFO_MISSING' && (
        <div className="horoscope-content error">
          <p className="error-message">⚠️ {error}</p>
          <button onClick={() => loadHoroscope(horoscopeRange)} className="btn-secondary">
            {t('common.tryAgain')}
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="horoscope-content loading">
          <div className="spinner">🔮</div>
          <p>{generating ? t('horoscope.generatingMessage') : t('horoscope.loading')}</p>
        </div>
      )}

      {/* Birth chart cards */}
      {astro.sun_sign && !isBirthInfoMissing(astroInfo) && (
        <section className="horoscope-birth-chart">
          <div className="birth-chart-cards">
            {astro.rising_sign && (
              <div className="chart-card rising-card">
                <span className="chart-icon">↗️</span>
                <p className="chart-sign">{t(`mySign.${astro.rising_sign.toLowerCase()}`)}</p>
                {astro.rising_degree && <p className="chart-degree">{astro.rising_degree}°</p>}
              </div>
            )}
            {astro.moon_sign && (
              <div className="chart-card moon-card">
                <span className="chart-icon">🌙</span>
                <p className="chart-sign">{t(`mySign.${astro.moon_sign.toLowerCase()}`)}</p>
                {astro.moon_degree && <p className="chart-degree">{astro.moon_degree}°</p>}
              </div>
            )}
            {astro.sun_sign && (
              <div className="chart-card sun-card">
                <span className="chart-icon">☀️</span>
                <p className="chart-sign">{t(`mySign.${astro.sun_sign.toLowerCase()}`)}</p>
                {astro.sun_degree && <p className="chart-degree">{astro.sun_degree}°</p>}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Horoscope content */}
      {horoscopeData && !loading && (
        <section className="horoscope-content">
          <div className="horoscope-metadata">
            <p className="horoscope-range">
              {t('horoscope.reading', { range: t(`horoscope.${horoscopeData.range}`) })}
            </p>
            <p className="horoscope-date">{formatDateByLanguage(new Date(), language)}</p>
          </div>

          <div className="horoscope-text">
            <div
              dangerouslySetInnerHTML={{
                __html: getTextToSpeak(horoscopeData, showingBrief)
              }}
            />

            {/* Voice bar */}
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

            {/* Toggle brief/full button */}
            <button
              onClick={() => setShowingBrief(!showingBrief)}
              style={{
                marginTop: '1.5rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: '#7c63d8',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = '#6b52c1')}
              onMouseLeave={(e) => (e.target.style.backgroundColor = '#7c63d8')}
            >
              {showingBrief ? t('chat.toggleMore') : t('chat.toggleLess')}
            </button>
          </div>

          {/* Sun sign info */}
          {sunSignData && (
            <section className="sun-sign-info">
              <div className="sun-sign-header">
                <h3>{sunSignData.emoji} {sunSignData.name}</h3>
              </div>
              <div className="sun-info-grid">
                <div className="info-item">
                  <strong>{t('mySign.dates')}</strong>
                  <span>{sunSignData.dates}</span>
                </div>
                <div className="info-item">
                  <strong>{t('mySign.element')}</strong>
                  <span>
                    {sunSignData._englishElement
                      ? t(`elements.${sunSignData._englishElement.toLowerCase()}`)
                      : sunSignData.element}
                  </span>
                </div>
                <div className="info-item">
                  <strong>{t('mySign.rulingPlanet')}</strong>
                  <span>
                    {sunSignData._englishRulingPlanet
                      ? sunSignData._englishRulingPlanet
                          .split('/')
                          .map((p, i) => (
                            <span key={i}>
                              {i > 0 && ' / '} {t(`planets.${p.toLowerCase().trim()}`)}
                            </span>
                          ))
                      : sunSignData.rulingPlanet}
                  </span>
                </div>
              </div>
              {sunSignData.personality && (
                <div className="sun-detail">
                  <h4>{t('mySign.aboutYourSign')}</h4>
                  <p>{sunSignData.personality}</p>
                </div>
              )}
            </section>
          )}

          {/* Disclaimer */}
          <div className="horoscope-disclaimer">
            <p>{t('horoscope.disclaimer')}</p>
          </div>
        </section>
      )}
    </div>
  );
}
