import { useState, useEffect, useRef } from 'react';
import '../styles/responsive.css';
import './CosmicWeatherPage.css';

export default function CosmicWeatherPage({ userId, token, auth }) {
  const [cosmicData, setCosmicData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const pollIntervalRef = useRef(null);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const loadCosmicWeather = async () => {
    setLoading(true);
    setError(null);
    setCosmicData(null);
    setGenerating(false);

    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      const response = await fetch(`${API_URL}/astrology-insights/cosmic-weather/${userId}`, { headers });

      if (response.ok) {
        const data = await response.json();
        setCosmicData({
          text: data.weather,
          birthChart: data.birthChart,
          planets: data.currentPlanets || []
        });
        setLoading(false);
        return;
      }

      setGenerating(true);
      const generateResponse = await fetch(`${API_URL}/astrology-insights/cosmic-weather/${userId}`, {
        method: 'POST',
        headers
      });

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json();
        setError(errorData.error || 'Could not generate cosmic weather');
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
          const pollResponse = await fetch(`${API_URL}/astrology-insights/cosmic-weather/${userId}`, { headers });

          if (pollResponse.ok) {
            const data = await pollResponse.json();
            setCosmicData({
              text: data.weather,
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
  };

  useEffect(() => {
    loadCosmicWeather();
  }, [userId, token, API_URL]);

  return (
    <div className="page-safe-area cosmic-weather-page">
      <div className="cosmic-header">
        <h2 className="heading-primary">🌍 Today's Cosmic Weather</h2>
        <p className="cosmic-subtitle">Current planetary positions and their influence</p>
      </div>

      {loading && (
        <div className="cosmic-content loading">
          <div className="spinner">🌍</div>
          <p>{generating ? 'Reading today\'s planetary energies...' : 'Loading cosmic weather...'}</p>
        </div>
      )}

      {error && (
        <div className="cosmic-content error">
          <p className="error-message">⚠️ {error}</p>
          <button onClick={loadCosmicWeather} className="btn-secondary">Try Again</button>
        </div>
      )}

      {cosmicData && !loading && (
        <section className="cosmic-content">
          <div className="cosmic-date">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </div>

          <div className="cosmic-weather-text">
            <div dangerouslySetInnerHTML={{ __html: cosmicData.text }} />
          </div>

          {/* Desktop: Two Columns */}
          <div className="cosmic-columns">
            {/* Column 1: Birth Chart */}
            <div className="cosmic-column">
              <h3 className="column-title">Your Birth Chart</h3>
              {cosmicData.birthChart && (
                <div className="birth-chart-simple">
                  <div className="chart-item">
                    <span className="chart-icon">☀️</span>
                    <span className="chart-sign">{cosmicData.birthChart.sun_sign}</span>
                  </div>
                  <div className="chart-item">
                    <span className="chart-icon">🌙</span>
                    <span className="chart-sign">{cosmicData.birthChart.moon_sign}</span>
                  </div>
                  <div className="chart-item">
                    <span className="chart-icon">↗️</span>
                    <span className="chart-sign">{cosmicData.birthChart.rising_sign}</span>
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
                    <span className="chart-icon">☀️</span>
                    <span className="chart-sign">{cosmicData.birthChart.sun_sign}</span>
                  </div>
                  <div className="chart-item">
                    <span className="chart-icon">🌙</span>
                    <span className="chart-sign">{cosmicData.birthChart.moon_sign}</span>
                  </div>
                  <div className="chart-item">
                    <span className="chart-icon">↗️</span>
                    <span className="chart-sign">{cosmicData.birthChart.rising_sign}</span>
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
