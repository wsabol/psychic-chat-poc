import { useState, useEffect, useRef } from 'react';
import { useSpeech } from '../hooks/useSpeech';
import VoiceBar from '../components/VoiceBar';
import { getAstrologyData } from '../utils/astroUtils';
import { isBirthInfoError, isBirthInfoMissing } from '../utils/birthInfoErrorHandler';
import BirthInfoMissingPrompt from '../components/BirthInfoMissingPrompt';
import '../styles/responsive.css';
import './MoonPhasePage.css';

export default function MoonPhasePage({ userId, token, auth, onNavigateToPage }) {
  const [moonPhaseData, setMoonPhaseData] = useState(null);
  const [currentPhase, setCurrentPhase] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [astroInfo, setAstroInfo] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showingBrief, setShowingBrief] = useState(false);
  const [userPreference, setUserPreference] = useState('full');
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);
  const pollIntervalRef = useRef(null);
  const { speak, stop, pause, resume, isPlaying, isPaused, isLoading: isSpeechLoading, error: speechError, isSupported, volume, setVolume } = useSpeech();

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

  const moonPhaseEmojis = {
    newMoon: '🌑',
    waxingCrescent: '🌒',
    firstQuarter: '🌓',
    waxingGibbous: '🌔',
    fullMoon: '🌕',
    waningGibbous: '🌖',
    lastQuarter: '🌗',
    waningCrescent: '🌘'
  };

  const moonPhaseOrder = ['newMoon', 'waxingCrescent', 'firstQuarter', 'waxingGibbous', 'fullMoon', 'waningGibbous', 'lastQuarter', 'waningCrescent'];

  const calculateMoonPhase = () => {
    const now = new Date();
    const knownNewMoonDate = new Date(2025, 0, 29).getTime();
    const currentDate = now.getTime();
    const lunarCycle = 29.53059 * 24 * 60 * 60 * 1000;
    
    const daysIntoPhase = ((currentDate - knownNewMoonDate) % lunarCycle) / (24 * 60 * 60 * 1000);
    const phaseIndex = Math.floor((daysIntoPhase / 29.53059) * 8) % 8;
    
    return moonPhaseOrder[phaseIndex];
  };

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
        console.error('[MOON-PHASE] Error fetching preferences:', err);
      }
    };
    fetchPreferences();
  }, [userId, token, API_URL]);

  useEffect(() => {
    if (!loading) {
      loadMoonPhaseData();
    }
  }, [userPreference]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Auto-play when moon phase data arrives
  useEffect(() => {
    if (voiceEnabled && isSupported && moonPhaseData && !hasAutoPlayed && !isPlaying) {
      setHasAutoPlayed(true);
      const textToRead = showingBrief && moonPhaseData?.brief ? moonPhaseData.brief : moonPhaseData?.text;
      setTimeout(() => {
        speak(textToRead, { rate: 0.95, pitch: 1.2 });
      }, 500);
    }
  }, [voiceEnabled, isSupported, moonPhaseData, hasAutoPlayed, isPlaying, showingBrief, speak]);

  const fetchAstroInfo = async (headers) => {
    try {
      const response = await fetch(`${API_URL}/user-astrology/${userId}`, { headers });
      if (response.ok) {
        const data = await response.json();
        let astroDataObj = data.astrology_data;
        if (typeof astroDataObj === 'string') {
          astroDataObj = JSON.parse(astroDataObj);
        }
        setAstroInfo({
          ...data,
          astrology_data: astroDataObj
        });
        return astroDataObj;
      }
    } catch (err) {
      console.error('[MOON-PHASE] Error fetching astro info:', err);
    }
    return null;
  };

  const loadMoonPhaseData = async () => {
    setLoading(true);
    setError(null);
    setMoonPhaseData(null);
    setGenerating(false);
    setHasAutoPlayed(false);

    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      if (!astroInfo) {
        await fetchAstroInfo(headers);
      }

      const calculatedPhase = calculateMoonPhase();
      setCurrentPhase(calculatedPhase);

      const response = await fetch(`${API_URL}/moon-phase/${userId}?phase=${calculatedPhase}`, { headers });

      if (response.ok) {
        const data = await response.json();
        setMoonPhaseData({
          text: data.commentary,
          brief: data.brief,
          generatedAt: data.generated_at,
          phase: calculatedPhase
        });
        setLastUpdated(new Date(data.generated_at).toLocaleString());
        setLoading(false);
        return;
      }

      setGenerating(true);
      const generateResponse = await fetch(`${API_URL}/moon-phase/${userId}`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: calculatedPhase })
      });

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json();
        const errorMsg = errorData.error || 'Could not generate moon phase commentary';
        
        if (isBirthInfoError(errorMsg)) {
          setError('BIRTH_INFO_MISSING');
        } else {
          setError(errorMsg);
        }
        setLoading(false);
        return;
      }

      let pollCount = 0;
      const maxPolls = 30;

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      pollIntervalRef.current = setInterval(async () => {
        pollCount++;

        try {
          const pollResponse = await fetch(`${API_URL}/moon-phase/${userId}?phase=${calculatedPhase}`, { headers });

          if (pollResponse.ok) {
            const data = await pollResponse.json();
            setMoonPhaseData({
              text: data.commentary,
              brief: data.brief,
              generatedAt: data.generated_at,
              phase: calculatedPhase
            });
            setLastUpdated(new Date(data.generated_at).toLocaleString());
            setGenerating(false);
            setLoading(false);
            clearInterval(pollIntervalRef.current);
            return;
          }
        } catch (err) {
          console.error('[MOON-PHASE] Polling error:', err);
        }

        if (pollCount >= maxPolls) {
          setError('Moon phase commentary generation is taking longer than expected. Please try again.');
          setGenerating(false);
          setLoading(false);
          clearInterval(pollIntervalRef.current);
        }
      }, 1000);
    } catch (err) {
      console.error('[MOON-PHASE] Error loading moon phase:', err);
      setError('Unable to load moon phase data. Please try again.');
      setLoading(false);
    }
  };

  const getSunSignInfo = () => {
    if (!astroInfo?.astrology_data?.sun_sign) return null;
    const sunSignKey = astroInfo.astrology_data.sun_sign.toLowerCase();
    return getAstrologyData(sunSignKey);
  };

  const sunSignData = getSunSignInfo();
  const astro = astroInfo?.astrology_data || {};

  const handleTogglePause = () => {
    if (isPlaying) {
      pause();
    } else if (isPaused) {
      resume();
    }
  };

  const handlePlayVoice = () => {
    const textToRead = showingBrief && moonPhaseData?.brief ? moonPhaseData.brief : moonPhaseData?.text;
    speak(textToRead, { rate: 0.95, pitch: 1.2 });
  };

  return (
    <div className="page-safe-area moon-phase-page">
      <div className="moon-phase-header">
        <h2 className="heading-primary">🌙 Moon Phase Insight</h2>
        <p className="moon-phase-subtitle">Current lunar energy and its effect on you</p>
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
        <div className="moon-phase-content error">
          <p className="error-message">⚠️ {error}</p>
          <button onClick={loadMoonPhaseData} className="btn-secondary">
            Try Again
          </button>
        </div>
      )}

      {loading && (
        <div className="moon-phase-content loading">
          <div className="spinner">🌙</div>
          <p>
            {generating ? 'The Oracle is sensing the lunar energy for you...' : 'Loading moon phase insight...'}
          </p>
        </div>
      )}

      {currentPhase && !isBirthInfoMissing(astroInfo) && (
        <section className="moon-phase-display">
          <div className="moon-phase-emoji">
            {moonPhaseEmojis[currentPhase]}
          </div>
          <h3 className="moon-phase-name">
            {currentPhase.replace(/([A-Z])/g, ' $1').trim()}
          </h3>
          <p className="moon-phase-date">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </section>
      )}

      {astro.sun_sign && !isBirthInfoMissing(astroInfo) && (
        <section className="moon-phase-birth-chart">
          <div className="birth-chart-cards">
            {astro.rising_sign && (
              <div className="chart-card rising-card">
                <span className="chart-icon">↗️</span>
                <p className="chart-sign">{astro.rising_sign}</p>
                {astro.rising_degree && <p className="chart-degree">{astro.rising_degree}°</p>}
              </div>
            )}
            {astro.moon_sign && (
              <div className="chart-card moon-card">
                <span className="chart-icon">🌙</span>
                <p className="chart-sign">{astro.moon_sign}</p>
                {astro.moon_degree && <p className="chart-degree">{astro.moon_degree}°</p>}
              </div>
            )}
            {astro.sun_sign && (
              <div className="chart-card sun-card">
                <span className="chart-icon">☀️</span>
                <p className="chart-sign">{astro.sun_sign}</p>
                {astro.sun_degree && <p className="chart-degree">{astro.sun_degree}°</p>}
              </div>
            )}
          </div>
        </section>
      )}

      {moonPhaseData && !loading && (
        <section className="moon-phase-content">
          <div className="moon-phase-insight">
            <div dangerouslySetInnerHTML={{ __html: showingBrief && moonPhaseData.brief ? moonPhaseData.brief : moonPhaseData.text }} />
            
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
            
            <button onClick={() => setShowingBrief(!showingBrief)} style={{ marginTop: '1.5rem', padding: '0.75rem 1.5rem', backgroundColor: '#7c63d8', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '1rem', fontWeight: '500' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#6b52c1'} onMouseLeave={(e) => e.target.style.backgroundColor = '#7c63d8'}>{showingBrief ? '📖 Tell me more' : '📋 Show less'}</button>
          </div>

          {lastUpdated && (
            <div className="moon-phase-timestamp">
              <p className="text-muted">Generated: {lastUpdated}</p>
            </div>
          )}

          <section className="lunar-cycle">
            <h3>Lunar Cycle</h3>
            <div className="moon-phases-grid">
              {moonPhaseOrder.map((phase) => (
                <div
                  key={phase}
                  className={`moon-phase-item ${phase === currentPhase ? 'active' : ''}`}
                >
                  <div className="moon-emoji">{moonPhaseEmojis[phase]}</div>
                  <p className="phase-name">
                    {phase.replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {sunSignData && (
            <section className="sun-sign-info">
              <div className="sun-sign-header">
                <h3>
                  {sunSignData.emoji} {sunSignData.name}
                </h3>
              </div>

              <div className="sun-info-grid">
                <div className="info-item">
                  <strong>Element:</strong>
                  <span>{sunSignData.element}</span>
                </div>
                <div className="info-item">
                  <strong>Ruling Planet:</strong>
                  <span>{sunSignData.rulingPlanet}</span>
                </div>
                <div className="info-item">
                  <strong>Dates:</strong>
                  <span>{sunSignData.dates}</span>
                </div>
              </div>

              {sunSignData.personality && (
                <div className="sun-detail">
                  <h4>About Your Sign</h4>
                  <p>{sunSignData.personality}</p>
                </div>
              )}
            </section>
          )}

          <div className="moon-phase-info">
            <p>🌙 The moon completes a full cycle approximately every 29.5 days. Each phase carries unique energy that influences all zodiac signs differently based on your personal birth chart.</p>
          </div>

          <div className="moon-phase-disclaimer">
            <p>🔮 Moon phase insights are for inspiration and spiritual reflection. Your choices and actions are always your own.</p>
          </div>
        </section>
      )}
    </div>
  );
}
