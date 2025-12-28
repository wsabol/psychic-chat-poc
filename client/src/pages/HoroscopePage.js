import { useState, useEffect, useRef } from 'react';
import { getAstrologyData } from '../utils/astroUtils';
import { isBirthInfoError, isBirthInfoMissing } from '../utils/birthInfoErrorHandler';
import BirthInfoMissingPrompt from '../components/BirthInfoMissingPrompt';
import '../styles/responsive.css';
import './HoroscopePage.css';

export default function HoroscopePage({ userId, token, auth, onExit, onNavigateToPage }) {
    const [horoscopeRange, setHoroscopeRange] = useState('daily');
  const [horoscopeData, setHoroscopeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [astroInfo, setAstroInfo] = useState(null);
  const [showingBrief, setShowingBrief] = useState(true);
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
        console.error('[HOROSCOPE] Error fetching preferences:', err);
      }
    };
    fetchPreferences();
  }, [userId, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load horoscope when range changes
  useEffect(() => {
    loadHoroscope();
  }, [horoscopeRange]); // eslint-disable-line react-hooks/exhaustive-deps

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
      console.error('[HOROSCOPE] Error fetching astro info:', err);
    }
    return null;
  };

  const loadHoroscope = async () => {
    setLoading(true);
    setError(null);
    setHoroscopeData(null);
    setGenerating(false);

    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      // Fetch astro info if not already loaded
      if (!astroInfo) {
        await fetchAstroInfo(headers);
      }

      // Try to fetch cached horoscope
      const response = await fetch(`${API_URL}/horoscope/${userId}/${horoscopeRange}`, { headers });

            if (response.ok) {
        const data = await response.json();
        setHoroscopeData({
          text: data.horoscope,
          brief: data.brief,
          generatedAt: data.generated_at,
          range: horoscopeRange
        });
        setShowingBrief(false);
        setLoading(false);
        return;
      }

      // No cached horoscope - trigger generation
      setGenerating(true);
      const generateResponse = await fetch(`${API_URL}/horoscope/${userId}/${horoscopeRange}`, {
        method: 'POST',
        headers
      });

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json();
        const errorMsg = errorData.error || 'Could not generate horoscope';
        
        // Check if this is a birth info error
        if (isBirthInfoError(errorMsg)) {
          setError('BIRTH_INFO_MISSING');
        } else {
          setError(errorMsg);
        }
        setLoading(false);
        return;
      }

                  // Start polling for generated horoscope
      let pollCount = 0;
      const maxPolls = 30;  // 30 seconds polling

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      pollIntervalRef.current = setInterval(async () => {
        pollCount++;

        try {
          const pollResponse = await fetch(`${API_URL}/horoscope/${userId}/${horoscopeRange}`, { headers });

          if (pollResponse.ok) {
            const data = await pollResponse.json();
                        setHoroscopeData({
              text: data.horoscope,
              brief: data.brief,
              generatedAt: data.generated_at,
              range: horoscopeRange
            });
            setShowingBrief(false);
            setGenerating(false);
            setLoading(false);
            clearInterval(pollIntervalRef.current);
            return;
          }
        } catch (err) {
          console.error('[HOROSCOPE] Polling error:', err);
        }

                        if (pollCount >= maxPolls) {
          setError('Horoscope generation is taking longer than expected. Please try again.');
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

  const getSunSignInfo = () => {
    if (!astroInfo?.astrology_data?.sun_sign) return null;
    const sunSignKey = astroInfo.astrology_data.sun_sign.toLowerCase();
    return getAstrologyData(sunSignKey);
  };

  const sunSignData = getSunSignInfo();
  const astro = astroInfo?.astrology_data || {};

  const handleClose = () => {
    if (onExit) {
      onExit();
    } else {
      console.warn('[HOROSCOPE] onExit prop not provided!');
    }
  };

  return (
    <div className="page-safe-area horoscope-page" style={{ position: 'relative' }}>
      {/* Close button - top right for temp accounts during onboarding */}
      {auth?.isTemporaryAccount && (
        <>
          <button
            type="button"
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'transparent',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              zIndex: 100,
              opacity: 0.7,
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.opacity = '1'}
            onMouseLeave={(e) => e.target.style.opacity = '0.7'}
            title="Close and complete onboarding"
          >
            ✕
          </button>
          
          {/* Exit prompt with green arrow - clickable */}
          <button
            type="button"
            onClick={handleClose}
            className="exit-prompt"
            title="Click to register and continue"
          >
            <span className="exit-arrow">👉</span>
            <span className="exit-message">Click exit to continue</span>
          </button>
        </>
      )}

      {/* Header */}
      <div className="horoscope-header">
        <h2 className="heading-primary">🔮 Your Horoscope</h2>
        <p className="horoscope-subtitle">Personalized cosmic guidance for you</p>
      </div>

      {/* Range Toggle */}
      <div className="horoscope-toggle">
        {['daily', 'weekly'].map((range) => (
          <button
            key={range}
            className={`toggle-btn ${horoscopeRange === range ? 'active' : ''}`}
            onClick={() => setHoroscopeRange(range)}
            disabled={loading || generating}
          >
            {range.charAt(0).toUpperCase() + range.slice(1)}
          </button>
        ))}
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
        <div className="horoscope-content error">
          <p className="error-message">⚠️ {error}</p>
          <button onClick={loadHoroscope} className="btn-secondary">
            Try Again
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="horoscope-content loading">
          <div className="spinner">🔮</div>
          <p>
            {generating ? 'Your cosmic guidance is being woven by The Oracle...' : 'Loading your horoscope...'}
          </p>
        </div>
      )}

      {/* Birth Chart Info - REORDERED: Rising, Moon, Sun */}
      {astro.sun_sign && !isBirthInfoMissing(astroInfo) && (
        <section className="horoscope-birth-chart">
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

      {/* Horoscope Content */}
      {horoscopeData && !loading && (
        <section className="horoscope-content">
          <div className="horoscope-metadata">
            <p className="horoscope-range">
              {horoscopeData.range.charAt(0).toUpperCase() + horoscopeData.range.slice(1)} Reading
            </p>
            <p className="horoscope-date">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

                                        <div className="horoscope-text">
            <div dangerouslySetInnerHTML={{ __html: showingBrief && horoscopeData.brief ? horoscopeData.brief : horoscopeData.text }} />
            <button onClick={() => setShowingBrief(!showingBrief)} style={{ marginTop: '1.5rem', padding: '0.75rem 1.5rem', backgroundColor: '#7c63d8', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '1rem', fontWeight: '500' }} onMouseEnter={(e) => e.target.style.backgroundColor = '#6b52c1'} onMouseLeave={(e) => e.target.style.backgroundColor = '#7c63d8'}>{showingBrief ? '📖 Tell me more' : '📋 Show less'}</button>
          </div>

          {/* Sun Sign Info Below Horoscope */}
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

          {/* Disclaimer */}
          <div className="horoscope-disclaimer">
            <p>🔮 Horoscopes are for entertainment and inspiration. Your choices and actions ultimately shape your destiny.</p>
          </div>
        </section>
      )}
    </div>
  );
}
