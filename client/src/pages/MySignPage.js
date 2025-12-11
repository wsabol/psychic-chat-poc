import { useState, useEffect } from 'react';
import { fetchWithTokenRefresh } from '../utils/fetchWithTokenRefresh';
import { zodiacSigns } from '../data/ZodiacSigns';
import '../styles/responsive.css';
import './MySignPage.css';

export default function MySignPage({ userId, token, auth }) {
  const [astroData, setAstroData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

    // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchAstrologyData();
  }, [userId, token]);

  const fetchAstrologyData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithTokenRefresh(`${API_URL}/user-astrology/${userId}`, { 
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      
      if (!response.ok) {
        setError('Your birth chart is being calculated. Please refresh in a moment.');
        setLoading(false);
        return;
      }

      const data = await response.json();
      let astroDataObj = data.astrology_data;
      if (typeof astroDataObj === 'string') {
        astroDataObj = JSON.parse(astroDataObj);
      }

      console.log('[MY-SIGN] 📥 Raw API data:', astroDataObj);
      console.log('[MY-SIGN] Sun sign:', astroDataObj.sun_sign);

      // Get zodiac enrichment data from ZodiacSigns.js
      const sunSignKey = astroDataObj.sun_sign?.toLowerCase();
      const zodiacEnrichment = zodiacSigns[sunSignKey] || {};
      
      console.log('[MY-SIGN] 🔍 Looking for zodiac key:', sunSignKey);
      console.log('[MY-SIGN] 📚 Zodiac enrichment found:', !!zodiacEnrichment.personality);

      // Merge API calculated data with zodiac enrichment
      const mergedAstroData = {
        ...astroDataObj,
        ...zodiacEnrichment
      };

      console.log('[MY-SIGN] ✅ Merged data - personality available:', !!mergedAstroData.personality);
      console.log('[MY-SIGN] ✅ Merged data - strengths available:', !!mergedAstroData.strengths);

      setAstroData({
        ...data,
        astrology_data: mergedAstroData
      });
      setLoading(false);
    } catch (err) {
      console.error('[MY-SIGN] ❌ Error:', err);
      setError('Unable to load your birth chart. Please try again.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-safe-area sign-page">
        <div className="loading-container">
          <p>Loading your birth chart...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-safe-area sign-page">
        <div className="error-container">
          <p className="error-message">⚠️ {error}</p>
          <button onClick={fetchAstrologyData} className="btn-secondary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!astroData?.astrology_data) {
    return (
      <div className="page-safe-area sign-page">
        <div className="error-container">
          <p className="error-message">No astrology data available.</p>
        </div>
      </div>
    );
  }

  const astro = astroData.astrology_data;

  return (
    <div className="page-safe-area sign-page">
      {/* Header */}
      <div className="sign-header">
        <h2 className="heading-primary">♈ Your Birth Chart</h2>
        <p className="sign-subtitle">Your Sun, Moon, and Rising Signs calculated from your birth data</p>
      </div>

      {/* The Three Signs */}
      <section className="sign-cards-section">
        {/* Sun Sign Card */}
        {astro.sun_sign && (
          <div className="sign-card sun-sign-card">
            <div className="sign-card-icon">☀️</div>
            <div className="sign-card-content">
              <h3 className="sign-card-title">Sun Sign</h3>
              <p className="sign-card-value">{astro.sun_sign}</p>
              {astro.sun_degree && (
                <p className="sign-card-degree">{astro.sun_degree}°</p>
              )}
              <p className="sign-card-meaning">Your core identity and essence</p>
            </div>
          </div>
        )}

        {/* Moon Sign Card */}
        {astro.moon_sign && (
          <div className="sign-card moon-sign-card">
            <div className="sign-card-icon">🌙</div>
            <div className="sign-card-content">
              <h3 className="sign-card-title">Moon Sign</h3>
              <p className="sign-card-value">{astro.moon_sign}</p>
              {astro.moon_degree && (
                <p className="sign-card-degree">{astro.moon_degree}°</p>
              )}
              <p className="sign-card-meaning">Your inner emotional world</p>
            </div>
          </div>
        )}

        {/* Rising Sign Card */}
        {astro.rising_sign && (
          <div className="sign-card rising-sign-card">
            <div className="sign-card-icon">↗️</div>
            <div className="sign-card-content">
              <h3 className="sign-card-title">Rising Sign</h3>
              <p className="sign-card-value">{astro.rising_sign}</p>
              {astro.rising_degree && (
                <p className="sign-card-degree">{astro.rising_degree}°</p>
              )}
              <p className="sign-card-meaning">How others perceive you</p>
            </div>
          </div>
        )}
      </section>

      {/* Divider */}
      <div className="section-divider"></div>

      {/* Sun Sign Detailed Info - Display Merged Data */}
      <section className="zodiac-details-section">
        <div className="zodiac-header">
          <h2 className="heading-secondary">
            {astro.emoji && <span>{astro.emoji}</span>} {astro.sun_sign}
            {astro.symbol && <span className="zodiac-symbol">{astro.symbol}</span>}
          </h2>
        </div>

        {/* Basic Info */}
        <div className="info-grid">
          {astro.dates && (
            <div className="info-item">
              <strong>Dates:</strong>
              <span>{astro.dates}</span>
            </div>
          )}
          {astro.element && (
            <div className="info-item">
              <strong>Element:</strong>
              <span>{astro.element}</span>
            </div>
          )}
          {astro.rulingPlanet && (
            <div className="info-item">
              <strong>Ruling Planet:</strong>
              <span>{astro.rulingPlanet}</span>
            </div>
          )}
          {astro.planet && (
            <div className="info-item">
              <strong>Planet:</strong>
              <span>{astro.planet}</span>
            </div>
          )}
        </div>

        {/* Personality */}
        {astro.personality && (
          <div className="detail-section">
            <h4>Personality Essence</h4>
            <p className="italic-text">{astro.personality}</p>
          </div>
        )}

        {/* Life Path */}
        {astro.lifePath && (
          <div className="detail-section">
            <h4>Your Life Path</h4>
            <p>{astro.lifePath}</p>
          </div>
        )}

        {/* Strengths */}
        {astro.strengths && Array.isArray(astro.strengths) && (
          <div className="detail-section">
            <h4>Strengths</h4>
            <ul className="strength-list">
              {astro.strengths.map((strength, idx) => (
                <li key={idx}>{strength}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Challenges */}
        {astro.challenges && (
          <div className="detail-section">
            <h4>Challenges to Balance</h4>
            <p>{astro.challenges}</p>
          </div>
        )}

        {astro.weaknesses && Array.isArray(astro.weaknesses) && (
          <div className="detail-section">
            <h4>Weaknesses</h4>
            <ul className="challenge-list">
              {astro.weaknesses.map((weakness, idx) => (
                <li key={idx}>{weakness}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Lucky Elements */}
        {astro.luckyElements && (
          <div className="detail-section lucky-section">
            <h4>Lucky Elements</h4>
            <div className="lucky-grid">
              {astro.luckyElements.numbers && (
                <div className="lucky-item">
                  <strong>Numbers:</strong>
                  <span>{Array.isArray(astro.luckyElements.numbers) ? astro.luckyElements.numbers.join(', ') : astro.luckyElements.numbers}</span>
                </div>
              )}
              {astro.luckyElements.colors && (
                <div className="lucky-item">
                  <strong>Colors:</strong>
                  <span>{Array.isArray(astro.luckyElements.colors) ? astro.luckyElements.colors.join(', ') : astro.luckyElements.colors}</span>
                </div>
              )}
              {astro.luckyElements.days && (
                <div className="lucky-item">
                  <strong>Days:</strong>
                  <span>{Array.isArray(astro.luckyElements.days) ? astro.luckyElements.days.join(', ') : astro.luckyElements.days}</span>
                </div>
              )}
              {astro.luckyElements.stones && (
                <div className="lucky-item">
                  <strong>Crystals:</strong>
                  <span>{Array.isArray(astro.luckyElements.stones) ? astro.luckyElements.stones.join(', ') : astro.luckyElements.stones}</span>
                </div>
              )}
              {astro.luckyElements.metals && (
                <div className="lucky-item">
                  <strong>Metals:</strong>
                  <span>{Array.isArray(astro.luckyElements.metals) ? astro.luckyElements.metals.join(', ') : astro.luckyElements.metals}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Compatibility */}
        {astro.compatibility && (
          <div className="detail-section">
            <h4>Compatibility</h4>
            {astro.compatibility.mostCompatible && (
              <p><strong>Most Compatible:</strong> {Array.isArray(astro.compatibility.mostCompatible) ? astro.compatibility.mostCompatible.join(', ') : astro.compatibility.mostCompatible}</p>
            )}
            {astro.compatibility.leastCompatible && (
              <p><strong>Challenges:</strong> {Array.isArray(astro.compatibility.leastCompatible) ? astro.compatibility.leastCompatible.join(', ') : astro.compatibility.leastCompatible}</p>
            )}
            {astro.compatibility.description && (
              <p className="italic-text">{astro.compatibility.description}</p>
            )}
            {astro.compatibility.soulmate && (
              <p><strong>Soulmate Sign:</strong> {astro.compatibility.soulmate}</p>
            )}
          </div>
        )}

        {/* Career */}
        {astro.careerSpecific && (
          <div className="detail-section">
            <h4>Career & Purpose</h4>
            {astro.careerSpecific.ideal && (
              <div>
                <p><strong>Ideal Careers:</strong></p>
                <ul>
                  {Array.isArray(astro.careerSpecific.ideal) ? 
                    astro.careerSpecific.ideal.map((job, idx) => (
                      <li key={idx}>{job}</li>
                    )) : 
                    <li>{astro.careerSpecific.ideal}</li>
                  }
                </ul>
              </div>
            )}
            {astro.careerSpecific.leadership && (
              <p><strong>Leadership Style:</strong> {astro.careerSpecific.leadership}</p>
            )}
            {astro.careerSpecific.avoid && (
              <div>
                <p><strong>Paths to Avoid:</strong></p>
                <ul>
                  {Array.isArray(astro.careerSpecific.avoid) ? 
                    astro.careerSpecific.avoid.map((job, idx) => (
                      <li key={idx}>{job}</li>
                    )) : 
                    <li>{astro.careerSpecific.avoid}</li>
                  }
                </ul>
              </div>
            )}
            {astro.opportunities && (
              <p><strong>Opportunities:</strong> {astro.opportunities}</p>
            )}
          </div>
        )}

        {/* Health */}
        {astro.health && (
          <div className="detail-section">
            <h4>Health & Wellness</h4>
            {astro.health.bodyParts && (
              <p><strong>Vulnerable Areas:</strong> {Array.isArray(astro.health.bodyParts) ? astro.health.bodyParts.join(', ') : astro.health.bodyParts}</p>
            )}
            {astro.health.tendencies && (
              <div>
                <p><strong>Health Tendencies:</strong></p>
                <ul>
                  {Array.isArray(astro.health.tendencies) ? 
                    astro.health.tendencies.map((t, idx) => (
                      <li key={idx}>{t}</li>
                    )) : 
                    <li>{astro.health.tendencies}</li>
                  }
                </ul>
              </div>
            )}
            {astro.health.recommendations && (
              <div>
                <p><strong>Wellness Recommendations:</strong></p>
                <ul>
                  {Array.isArray(astro.health.recommendations) ? 
                    astro.health.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    )) : 
                    <li>{astro.health.recommendations}</li>
                  }
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Mythology */}
        {astro.mythology && (
          <div className="detail-section mythology-section">
            <h4>Mythology</h4>
            {astro.mythology.archetype && (
              <p><strong>Archetype:</strong> {astro.mythology.archetype}</p>
            )}
            {astro.mythology.deity && (
              <p><strong>Deity:</strong> {astro.mythology.deity}</p>
            )}
            {astro.mythology.origin && (
              <p><strong>Origin:</strong> {astro.mythology.origin}</p>
            )}
            {astro.mythology.story && (
              <p className="italic-text">{astro.mythology.story}</p>
            )}
          </div>
        )}

        {/* Seasonal */}
        {astro.seasonal && (
          <div className="detail-section seasonal-section">
            <h4>Seasonal Influence</h4>
            {astro.seasonal.season && (
              <p><strong>Season:</strong> {astro.seasonal.season}</p>
            )}
            {astro.seasonal.energy && (
              <p><strong>Energy:</strong> {astro.seasonal.energy}</p>
            )}
            {astro.seasonal.bestSeason && (
              <p><strong>Best Season:</strong> {astro.seasonal.bestSeason}</p>
            )}
            {astro.seasonal.connection && (
              <p className="italic-text">{astro.seasonal.connection}</p>
            )}
          </div>
        )}

        {/* Moon Phases */}
        {astro.moonPhases && (
          <div className="detail-section">
            <h4>Moon Phase Influences</h4>
            {astro.moonPhases.influence && (
              <p className="italic-text">{astro.moonPhases.influence}</p>
            )}
            {astro.moonPhases.newMoon && (
              <div>
                <p><strong>New Moon:</strong> {astro.moonPhases.newMoon}</p>
              </div>
            )}
            {astro.moonPhases.fullMoon && (
              <div>
                <p><strong>Full Moon:</strong> {astro.moonPhases.fullMoon}</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
