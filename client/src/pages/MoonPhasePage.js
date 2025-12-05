import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { getAstrologyData } from '../utils/astroUtils';
import '../styles/responsive.css';
import './MoonPhasePage.css';

export default function MoonPhasePage({ userId, token, auth }) {
  const [moonPhaseData, setMoonPhaseData] = useState(null);
  const [currentPhase, setCurrentPhase] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [astroInfo, setAstroInfo] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const pollIntervalRef = useRef(null);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

  // Moon phase emojis and display info
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

  // Calculate current moon phase (client-side as fallback)
  const calculateMoonPhase = () => {
    const now = new Date();
    const knownNewMoonDate = new Date(2025, 0, 29).getTime();
    const currentDate = now.getTime();
    const lunarCycle = 29.53059 * 24 * 60 * 60 * 1000;
    
    const daysIntoPhase = ((currentDate - knownNewMoonDate) % lunarCycle) / (24 * 60 * 60 * 1000);
    const phaseIndex = Math.floor((daysIntoPhase / 29.53059) * 8) % 8;
    
    return moonPhaseOrder[phaseIndex];
  };

  // Load moon phase data on mount
  useEffect(() => {
    loadMoonPhaseData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

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

    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      // Fetch astro info if not already loaded
      if (!astroInfo) {
        await fetchAstroInfo(headers);
      }

      // Determine current moon phase (use Python calculation if available)
      const calculatedPhase = calculateMoonPhase();
      setCurrentPhase(calculatedPhase);

      // Try to fetch cached moon phase commentary
      const response = await fetch(`${API_URL}/moon-phase/${userId}?phase=${calculatedPhase}`, { headers });

      if (response.ok) {
        const data = await response.json();
        setMoonPhaseData({
          text: data.commentary,
          generatedAt: data.generated_at,
          phase: calculatedPhase
        });
        setLastUpdated(new Date(data.generated_at).toLocaleString());
        setLoading(false);
        return;
      }

      // No cached commentary - trigger generation
      setGenerating(true);
      const generateResponse = await fetch(`${API_URL}/moon-phase/${userId}`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: calculatedPhase })
      });

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json();
        setError(errorData.error || 'Could not generate moon phase commentary');
        setLoading(false);
        return;
      }

      // Start polling for generated commentary
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

  return (
    <div className="page-safe-area moon-phase-page">
      {/* Header */}
      <div className="moon-phase-header">
        <h2 className="heading-primary">🌙 Moon Phase Insight</h2>
        <p className="moon-phase-subtitle">Current lunar energy and its effect on you</p>
      </div>

      {/* Current Moon Phase Display */}
      {currentPhase && (
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

      {/* Birth Chart Info */}
      {astro.sun_sign && (
        <section className="moon-phase-birth-chart">
          <div className="birth-chart-cards">
            {astro.sun_sign && (
              <div className="chart-card sun-card">
                <span className="chart-icon">☀️</span>
                <p className="chart-sign">{astro.sun_sign}</p>
                {astro.sun_degree && <p className="chart-degree">{astro.sun_degree}°</p>}
              </div>
            )}
            {astro.moon_sign && (
              <div className="chart-card moon-card">
                <span className="chart-icon">🌙</span>
                <p className="chart-sign">{astro.moon_sign}</p>
                {astro.moon_degree && <p className="chart-degree">{astro.moon_degree}°</p>}
              </div>
            )}
            {astro.rising_sign && (
              <div className="chart-card rising-card">
                <span className="chart-icon">↗️</span>
                <p className="chart-sign">{astro.rising_sign}</p>
                {astro.rising_degree && <p className="chart-degree">{astro.rising_degree}°</p>}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Loading State */}
      {loading && (
        <div className="moon-phase-content loading">
          <div className="spinner">🌙</div>
          <p>
            {generating ? 'The Oracle is sensing the lunar energy for you...' : 'Loading moon phase insight...'}
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="moon-phase-content error">
          <p className="error-message">⚠️ {error}</p>
          <button onClick={loadMoonPhaseData} className="btn-secondary">
            Try Again
          </button>
        </div>
      )}

      {/* Moon Phase Content */}
      {moonPhaseData && !loading && (
        <section className="moon-phase-content">
          <div className="moon-phase-insight">
            <ReactMarkdown
              components={{
                p: ({ node, ...props }) => <p className="markdown-p" {...props} />,
                strong: ({ node, ...props }) => <strong className="markdown-strong" {...props} />,
                em: ({ node, ...props }) => <em className="markdown-em" {...props} />,
                ul: ({ node, ...props }) => <ul className="markdown-ul" {...props} />,
                ol: ({ node, ...props }) => <ol className="markdown-ol" {...props} />,
                li: ({ node, ...props }) => <li className="markdown-li" {...props} />,
              }}
            >
              {moonPhaseData.text}
            </ReactMarkdown>
          </div>

          {lastUpdated && (
            <div className="moon-phase-timestamp">
              <p className="text-muted">Generated: {lastUpdated}</p>
            </div>
          )}

          {/* Lunar Cycle Visualization */}
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

          {/* Sun Sign Info Below */}
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

          {/* Info Box */}
          <div className="moon-phase-info">
            <p>🌙 The moon completes a full cycle approximately every 29.5 days. Each phase carries unique energy that influences all zodiac signs differently based on your personal birth chart.</p>
          </div>

          {/* Disclaimer */}
          <div className="moon-phase-disclaimer">
            <p>🔮 Moon phase insights are for inspiration and spiritual reflection. Your choices and actions are always your own.</p>
          </div>
        </section>
      )}
    </div>
  );
}
