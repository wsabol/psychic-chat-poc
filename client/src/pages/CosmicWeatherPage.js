import { useState, useEffect, useRef, useCallback } from 'react';
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
  const [showingBrief, setShowingBrief] = useState(false); // Default to full
  const [userPreference, setUserPreference] = useState('full');
  const pollIntervalRef = useRef(null);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

  // Fetch user preferences once on mount
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${API_URL}/user-profile/${userId}/preferences`, { headers });
        if (response.ok) {
          const data = await response.json();
          setUserPreference(data.response_type || 'full');
          // Set initial showing state based on preference
          // If preference is 'full', show full (showingBrief = false)
          // If preference is 'brief', show brief (showingBrief = true)
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

    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      // Fetch astro info if not already loaded
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
        
        // Check if this is a birth info error
        if (isBirthInfoError(errorMsg)) {
          setError('BIRTH_INFO_MISSING');
        } else {
          setError(errorMsg);
        }
        setLoading(false);
        return;
      }

                  let pollCount = 0;
      const maxPolls = 30;  // 30 seconds polling

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

  // Load cosmic weather AFTER preferences are loaded
  useEffect(() => {
    if (!loading) {
      loadCosmicWeather();
    }
  }, [userPreference]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="page-safe-area cosmic-weather-page">
      <div className="cosmic-header">
        <h2 className="heading-primary">🌍 Today's Cosmic Weather</h2>
        <p className="cosmic-subtitle">Current planetary positions and their influence</p>
      </div>

      {/* Birth Info Missing State */}
      {!loading && !error && isBirthInfoMissing(astroInfo) && (
        <BirthInfoMissingPrompt 
          onNavigateToPersonalInfo={() => onNavigateToPage && onNavigateToPage(2)}
        />
      )}

      {/* Error State - Birth Info Missing */}
      {error && error === 'BIRTH_INFO_MISSING' && (
        <BirthInfoMissingPrompt 
          onNavigateToPersonalInfo={() => onNavigateToPage && onNavigateToPage(2)}
        />
      )}

      {/* Error State - Other Errors */}
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
            <button onClick={() => setShowingBrief(!showingBrief)} style={{ marginTop: '1.5rem', padding: '0.75rem 1.5rem', backgroundColor: '#7c63d8', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '1rem', fontWeight: '500' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#6b52c1'} onMouseLeave={(e) => e.target.style.backgroundColor = '#7c63d8'}>{showingBrief ? '📖 Tell me more' : '📋 Show less'}</button>
          </div>

          {/* Desktop: Two Columns */}
          <div className="cosmic-columns">
            {/* Column 1: Birth Chart */}
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

            {/* Column 2: Planets */}
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

          {/* Mobile: Single Column */}
          <div className="cosmic-mobile">
            {/* Birth Chart */}
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

            {/* Planets */}
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
