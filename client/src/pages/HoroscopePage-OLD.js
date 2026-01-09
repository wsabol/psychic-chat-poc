
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../context/TranslationContext';
import { useSpeech } from '../hooks/useSpeech';
import VoiceBar from '../components/VoiceBar';
import { ComplianceUpdateModal } from '../components/ComplianceUpdateModal-CLEAN';
import { useAstroInfo } from '../hooks/useAstroInfo';

import { getTranslatedAstrologyData } from '../utils/translatedAstroUtils';
import { isBirthInfoError, isBirthInfoMissing } from '../utils/birthInfoErrorHandler';
import BirthInfoMissingPrompt from '../components/BirthInfoMissingPrompt';
import { formatDateByLanguage } from '../utils/dateLocaleUtils';
import { fetchWithTokenRefresh } from '../utils/fetchWithTokenRefresh';
import '../styles/responsive.css';
import './HoroscopePage.css';

export default function HoroscopePage({ userId, token, auth, onExit, onNavigateToPage }) {
  const { t, language } = useTranslation();
  const [horoscopeRange, setHoroscopeRange] = useState('daily');
  const [horoscopeData, setHoroscopeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [showingBrief, setShowingBrief] = useState(false);
  const [userPreference, setUserPreference] = useState('full');
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);
  const [sunSignData, setSunSignData] = useState(null);
  const [complianceStatus, setComplianceStatus] = useState(null);
  const pollIntervalRef = useRef(null);
  const { speak, stop, pause, resume, isPlaying, isPaused, isLoading: isSpeechLoading, error: speechError, isSupported, volume, setVolume } = useSpeech();

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

  // Use the astroInfo hook - THIS IS HOW COSMICWEATHERPAGE DOES IT
  const { astroInfo, fetchAstroInfo } = useAstroInfo(userId, token);
  
  // DEBUG: Log astroInfo changes
  useEffect(() => {
    console.log('[HOROSCOPE-DEBUG] astroInfo changed:', astroInfo);
    if (astroInfo?.astrology_data) {
      console.log('[HOROSCOPE-DEBUG] astrology_data keys:', Object.keys(astroInfo.astrology_data));
      console.log('[HOROSCOPE-DEBUG] sun_sign:', astroInfo.astrology_data.sun_sign);
      console.log('[HOROSCOPE-DEBUG] moon_sign:', astroInfo.astrology_data.moon_sign);
      console.log('[HOROSCOPE-DEBUG] rising_sign:', astroInfo.astrology_data.rising_sign);
    }
  }, [astroInfo]);

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${API_URL}/user-profile/${userId}/preferences`, { headers });
        if (response.ok) {
          const data = await response.json();
          setUserPreference(data.response_type || 'full');
          setVoiceEnabled(data.voice_enabled !== false);
          setShowingBrief(data.response_type === 'brief');
        }
      } catch (err) {
        console.error('[HOROSCOPE] Error fetching preferences:', err);
      }
    };
    fetchPreferences();
  }, [userId, token, API_URL]);

  // Fetch astro info on mount and when it's not loaded - EXACT PATTERN FROM COSMICWEATHERPAGE
  useEffect(() => {
    if (!astroInfo) {
      fetchAstroInfo();
    }
  }, [userId, token, astroInfo, fetchAstroInfo]);

  useEffect(() => {
    if (!loading) {
      loadHoroscope();
    }
  }, [horoscopeRange, userPreference]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Auto-play when horoscope data arrives
  useEffect(() => {
    if (voiceEnabled && isSupported && horoscopeData && !hasAutoPlayed && !isPlaying) {
      setHasAutoPlayed(true);
      const textToRead = showingBrief && horoscopeData?.brief ? horoscopeData.brief : horoscopeData?.text;
      setTimeout(() => {
        speak(textToRead, { rate: 0.95, pitch: 1.2 });
      }, 500);
    }
  }, [voiceEnabled, isSupported, horoscopeData, hasAutoPlayed, isPlaying, showingBrief, speak]);

  const loadHoroscope = async () => {
    setLoading(true);
    setError(null);
    setHoroscopeData(null);
    setGenerating(false);
    setHasAutoPlayed(false);

    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      const response = await fetchWithTokenRefresh(`${API_URL}/horoscope/${userId}/${horoscopeRange}`, { headers });

      // CHECK FOR COMPLIANCE REQUIREMENT (HTTP 451)
      if (response.status === 451) {
        const complianceData = await response.json();
        console.log('[HOROSCOPE] Compliance required:', complianceData);
        setComplianceStatus(complianceData.details);
        setLoading(false);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setHoroscopeData({
          text: data.horoscope,
          brief: data.brief,
          generatedAt: data.generated_at,
          range: horoscopeRange
        });
        setComplianceStatus(null);
        setLoading(false);
        return;
      }

      setGenerating(true);
      const generateResponse = await fetchWithTokenRefresh(`${API_URL}/horoscope/${userId}/${horoscopeRange}`, {
        method: 'POST',
        headers
      });

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json();
        const errorMsg = errorData.error || 'Could not generate horoscope';
        
        if (isBirthInfoError(errorMsg)) {
          setError('BIRTH_INFO_MISSING');
        } else {
          setError(errorMsg);
        }
        setLoading(false);
        return;
      }

      let pollCount = 0;
      const maxPolls = 60;

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      await new Promise(resolve => setTimeout(resolve, 2000));

      pollIntervalRef.current = setInterval(async () => {
        pollCount++;

        try {
          const pollResponse = await fetchWithTokenRefresh(`${API_URL}/horoscope/${userId}/${horoscopeRange}`, { headers });

          if (pollResponse.ok) {
            const data = await pollResponse.json();
            setHoroscopeData({
              text: data.horoscope,
              brief: data.brief,
              generatedAt: data.generated_at,
              range: horoscopeRange
            });
            setGenerating(false);
            setLoading(false);
            clearInterval(pollIntervalRef.current);
            return;
          }
        } catch (err) {
          console.error('[HOROSCOPE] Polling error:', err);
        }

        if (pollCount >= maxPolls) {
          setError('Horoscope generation is taking longer than expected (60+ seconds). Please try again.');
          setGenerating(false);
          setLoading(false);
          clearInterval(pollIntervalRef.current);
        }
      }, 1000);
    } catch (err) {
      console.error('[HOROSCOPE] Error loading horoscope:', err);
      setError('Unable to load your horoscope. Please try again.');
      setLoading(false);
    }
  };

  // Load translated sun sign data based on language and sun sign
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

  const astro = astroInfo?.astrology_data || {};

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
          setLoading(false);
          loadHoroscope();
        }}
      />
    );
  }

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
    const textToRead = showingBrief && horoscopeData?.brief ? horoscopeData.brief : horoscopeData?.text;
    speak(textToRead, { rate: 0.95, pitch: 1.2 });
  };

  return (
    <div className="page-safe-area horoscope-page" style={{ position: 'relative' }}>
      {auth?.isTemporaryAccount && (
        <div style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          zIndex: 1000
        }}>
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
            disabled={loading || generating}
          >
            {t(`horoscope.${range}`)}
          </button>
        ))}
      </div>

      {!loading && !error && isBirthInfoMissing(astroInfo) && (
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
        <div className="horoscope-content error">
          <p className="error-message">⚠️ {error}</p>
          <button onClick={loadHoroscope} className="btn-secondary">
            {t('common.tryAgain')}
          </button>
        </div>
      )}

      {loading && (
        <div className="horoscope-content loading">
          <div className="spinner">🔮</div>
          <p>
            {generating ? t('horoscope.generatingMessage') : t('horoscope.loading')}
          </p>
        </div>
      )}

      {(() => {
        const hasSunSign = !!astro.sun_sign;
        const isMissing = isBirthInfoMissing(astroInfo);
        console.log('[HOROSCOPE-DEBUG] Birth chart render check - hasSunSign:', hasSunSign, 'isMissing:', isMissing, 'astro:', astro, 'astroInfo:', astroInfo);
        return hasSunSign && !isMissing;
      })() && (
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

      {horoscopeData && !loading && (
        <section className="horoscope-content">
          <div className="horoscope-metadata">
            <p className="horoscope-range">
              {t('horoscope.reading', { range: t(`horoscope.${horoscopeData.range}`) })}
            </p>
            <p className="horoscope-date">
              {formatDateByLanguage(new Date(), language)}
            </p>
          </div>

          <div className="horoscope-text">
            <div dangerouslySetInnerHTML={{ __html: showingBrief && horoscopeData.brief ? horoscopeData.brief : horoscopeData.text }} />
            
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
            
            <button onClick={() => setShowingBrief(!showingBrief)} style={{ marginTop: '1.5rem', padding: '0.75rem 1.5rem', backgroundColor: '#7c63d8', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '1rem', fontWeight: '500' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#6b52c1'} onMouseLeave={(e) => e.target.style.backgroundColor = '#7c63d8'}>{showingBrief ? t('chat.toggleMore') : t('chat.toggleLess')}</button>
          </div>

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
                  <span>{sunSignData._englishElement ? t(`elements.${sunSignData._englishElement.toLowerCase()}`) : sunSignData.element}</span>
                </div>
                <div className="info-item">
                  <strong>{t('mySign.rulingPlanet')}</strong>
                  <span>{sunSignData._englishRulingPlanet ? sunSignData._englishRulingPlanet.split('/').map((p, i) => <span key={i}>{i > 0 && ' / '} {t(`planets.${p.toLowerCase().trim()}`)}</span>) : sunSignData.rulingPlanet}</span>
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

          <div className="horoscope-disclaimer">
            <p>{t('horoscope.disclaimer')}</p>
          </div>
        </section>
      )}
    </div>
  );
}
