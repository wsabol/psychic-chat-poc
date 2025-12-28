import { useState, useEffect, useRef, useCallback } from 'react';
import { useSpeech } from '../hooks/useSpeech';
import VoiceBar from '../components/VoiceBar';
import { fetchWithTokenRefresh } from '../utils/fetchWithTokenRefresh';
import { isBirthInfoError, isBirthInfoMissing } from '../utils/birthInfoErrorHandler';
import BirthInfoMissingPrompt from '../components/BirthInfoMissingPrompt';
import '../styles/responsive.css';
import './CosmicWeatherPage.css';

export default function CosmicWeatherPage({ userId, token, auth, onNavigateToPage }) {
  const [cosmicData, setCosmicData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [astroInfo, setAstroInfo] = useState(null);
  const [showingBrief, setShowingBrief] = useState(false);
  const [userPreference, setUserPreference] = useState('full');
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);
  const pollIntervalRef = useRef(null);
  const { speak, stop, pause, resume, isPlaying, isPaused, isLoading: isSpeechLoading, error: speechError, isSupported, volume, setVolume } = useSpeech();

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

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
        console.error('[COSMIC-WEATHER] Error fetching preferences:', err);
      }
    };
    fetchPreferences();
  }, [userId, token, API_URL]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

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

  const fetchAstroInfo = useCallback(async (headers) => {
    try {
      const response = await fetchWithTokenRefresh(`${API_URL}/user-astrology/${userId}`, { headers });
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
      console.error('[COSMIC-WEATHER] Error fetching astro info:', err);
    }
    return null;
  }, [API_URL, userId]);

  const loadCosmicWeather = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCosmicData(null);
    setGenerating(false);
    setHasAutoPlayed(false);

    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      if (!astroInfo) {
        await fetchAstroInfo(headers);
      }

      const response = await fetchWithTokenRefresh(`${API_URL}/astrology-insights/cosmic-weather/${userId}`, { headers });

      if (response.ok) {
        const data = await response.json();
        setCosmicData({
          text: data.weather,
          brief: data.brief,
          birthChart: data.birthChart,
          planets: data.currentPlanets || []
        });
        setLoading(false);
        return;
      }

      setGenerating(true);
      const generateResponse = await fetchWithTokenRefresh(`${API_URL}/astrology-insights/cosmic-weather/${userId}`, {
        method: 'POST',
        headers
      });

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json();
        const errorMsg = errorData.error || 'Could not generate cosmic weather';
        
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
          const pollResponse = await fetchWithTokenRefresh(`${API_URL}/astrology-insights/cosmic-weather/${userId}`, { headers });

          if (pollResponse.ok) {
            const data = await pollResponse.json();
            setCosmicData({
              text: data.weather,
              brief: data.brief,
              birthChart: data.birthChart,
              planets: data.currentPlanets || []
            });
            setGenerating(false);
            setLoading(false);
            clearInterval(pollIntervalRef.current);
            return;
          }
        } catch (err) {
          console.error('[COSMIC-WEATHER] Polling error:', err);
        }

        if (pollCount >= maxPolls) {
          setError('Cosmic weather generation is taking longer than expected. Please try again.');
          setGenerating(false);
          setLoading(false);
          clearInterval(pollIntervalRef.current);
        }
      }, 1000);
    } catch (err) {
      console.error('[COSMIC-WEATHER] Error loading cosmic weather:', err);
      setError('Unable to load today\'s cosmic weather. Please try again.');
      setLoading(false);
    }
  }, [userId, token, API_URL, astroInfo, fetchAstroInfo]);

  useEffect(() => {
    if (!loading) {
      loadCosmicWeather();
    }
  }, [userPreference]);

  const handleTogglePause = () => {
    if (isPlaying) {
      pause();
    } else if (isPaused) {
      resume();
    }
  };

  const handlePlayVoice = () => {
    const textToRead = showingBrief && cosmicData?.brief ? cosmicData.brief : cosmicData?.text;
    speak(textToRead, { rate: 0.95, pitch: 1.2 });
  };

  return (
    <div className="page-safe-area cosmic-weather-page">
      <div className="cosmic-header">
        <h2 className="heading-primary">🌍 Today's Cosmic Weather</h2>
        <p className="cosmic-subtitle">Current planetary positions and their influence</p>
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
        <div className="cosmic-content error">
          <p className="error-message">⚠️ {error}</p>
          <button onClick={loadCosmicWeather} className="btn-secondary">Try Again</button>
        </div>
      )}

      {loading && (
        <div className="cosmic-content loading">
          <div className="spinner">🌍</div>
          <p>{generating ? 'Reading today\'s planetary energies...' : 'Loading cosmic weather...'}</p>
        </div>
      )}

      {cosmicData && !loading && (
        <section className="cosmic-content">
          <div className="cosmic-date">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
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
            
            <button onClick={() => setShowingBrief(!showingBrief)} style={{ marginTop: '1.5rem', padding: '0.75rem 1.5rem', backgroundColor: '#7c63d8', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '1rem', fontWeight: '500' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#6b52c1'} onMouseLeave={(e) => e.target.style.backgroundColor = '#7c63d8'}>{showingBrief ? '📖 Tell me more' : '📋 Show less'}</button>
          </div>

          <div className="cosmic-columns">
            <div className="cosmic-column">
              <h3 className="column-title">Your Birth Chart</h3>
              {cosmicData.birthChart && (
                <div className="birth-chart-simple">
                  <div className="chart-item">
                    <span className="chart-icon">↗️</span>
                    <span className="chart-sign">{cosmicData.birthChart.rising_sign}</span>
                  </div>
                  <div className="chart-item">
                    <span className="chart-icon">🌙</span>
                    <span className="chart-sign">{cosmicData.birthChart.moon_sign}</span>
                  </div>
                  <div className="chart-item">
                    <span className="chart-icon">☀️</span>
                    <span className="chart-sign">{cosmicData.birthChart.sun_sign}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="cosmic-column">
              <h3 className="column-title">Current Planets</h3>
              {cosmicData.planets && cosmicData.planets.length > 0 ? (
                <div className="planets-list">
                  {cosmicData.planets.map((planet, idx) => (
                    <div key={idx} className={`planet-item ${planet.retrograde ? 'retrograde' : ''}`}>
                      <span className="planet-icon">{planet.icon}</span>
                      <span className="planet-name">{planet.name}</span>
                      <span className="planet-sign">{planet.sign}</span>
                      <span className="planet-degree">{planet.degree}°</span>
                      {planet.retrograde && <span className="retrograde-badge">♻️</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <p>No planets data available</p>
              )}
            </div>
          </div>

          <div className="cosmic-mobile">
            <div className="mobile-section">
              <h3>Your Birth Chart</h3>
              {cosmicData.birthChart && (
                <div className="birth-chart-simple">
                  <div className="chart-item">
                    <span className="chart-icon">↗️</span>
                    <span className="chart-sign">{cosmicData.birthChart.rising_sign}</span>
                  </div>
                  <div className="chart-item">
                    <span className="chart-icon">🌙</span>
                    <span className="chart-sign">{cosmicData.birthChart.moon_sign}</span>
                  </div>
                  <div className="chart-item">
                    <span className="chart-icon">☀️</span>
                    <span className="chart-sign">{cosmicData.birthChart.sun_sign}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mobile-section">
              <h3>Current Planets</h3>
              {cosmicData.planets && cosmicData.planets.length > 0 ? (
                <div className="planets-list">
                  {cosmicData.planets.map((planet, idx) => (
                    <div key={idx} className={`planet-item ${planet.retrograde ? 'retrograde' : ''}`}>
                      <span className="planet-icon">{planet.icon}</span>
                      <span className="planet-name">{planet.name}</span>
                      <span className="planet-sign">{planet.sign}</span>
                      <span className="planet-degree">{planet.degree}°</span>
                      {planet.retrograde && <span className="retrograde-badge">♻️</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <p>No planets data available</p>
              )}
            </div>
          </div>

          <div className="cosmic-disclaimer">
            <p>🌍 Cosmic weather is for inspiration and self-reflection. Your free will always guides your destiny.</p>
          </div>
        </section>
      )}
    </div>
  );
}
