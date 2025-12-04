import { useState, useEffect } from 'react';
import { getAstrologyData } from '../utils/astroUtils';
import '../styles/responsive.css';
import './MySignPage.css';

export default function MySignPage({ userId, token, auth }) {
  const [astroData, setAstroData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

  useEffect(() => {
    fetchAstrologyData();
  }, [userId, token]);

  const fetchAstrologyData = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/user-astrology/${userId}`, { headers });
      
      if (!response.ok) {
        // Check if user has personal info but no calculated astrology yet
        const personalResponse = await fetch(`${API_URL}/user-profile/${userId}`, { headers });
        if (!personalResponse.ok) {
          setError('Please complete your personal information first.');
          setLoading(false);
          return;
        }

        const personalData = await personalResponse.json();
        if (!personalData.birth_date) {
          setError('Please enter your birth date in Personal Information.');
          setLoading(false);
          return;
        }

        setError('Your birth chart is being calculated. Please refresh in a moment.');
        setLoading(false);
        return;
      }

      const data = await response.json();
      
      // Parse astrology_data if it's a string
      let astroDataObj = data.astrology_data;
      if (typeof astroDataObj === 'string') {
        astroDataObj = JSON.parse(astroDataObj);
      }

      setAstroData({
        ...data,
        astrology_data: astroDataObj
      });
      setLoading(false);
    } catch (err) {
      console.error('[MY-SIGN] Error fetching astrology data:', err);
      setError('Unable to load your astrology data. Please try again.');
      setLoading(false);
    }
  };

  const getSunSignData = () => {
    if (!astroData?.astrology_data?.sun_sign) return null;
    const sunSignKey = astroData.astrology_data.sun_sign.toLowerCase();
    return getAstrologyData(sunSignKey);
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

  const sunSignData = getSunSignData();
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

      {/* Sun Sign Detailed Info */}
      {sunSignData && (
        <section className="zodiac-details-section">
          <div className="zodiac-header">
            <h2 className="heading-secondary">
              {sunSignData.emoji} {sunSignData.name}
              <span className="zodiac-symbol">{sunSignData.symbol}</span>
            </h2>
          </div>

          {/* Basic Info */}
          <div className="info-grid">
            <div className="info-item">
              <strong>Dates:</strong>
              <span>{sunSignData.dates}</span>
            </div>
            <div className="info-item">
              <strong>Element:</strong>
              <span>{sunSignData.element}</span>
            </div>
            <div className="info-item">
              <strong>Ruling Planet:</strong>
              <span>{sunSignData.rulingPlanet}</span>
            </div>
          </div>

          {/* Personality */}
          {sunSignData.personality && (
            <div className="detail-section">
              <h4>Personality Essence</h4>
              <p className="italic-text">{sunSignData.personality}</p>
            </div>
          )}

          {/* Life Path */}
          {sunSignData.lifePath && (
            <div className="detail-section">
              <h4>Your Life Path</h4>
              <p>{sunSignData.lifePath}</p>
            </div>
          )}

          {/* Strengths */}
          {sunSignData.strengths && (
            <div className="detail-section">
              <h4>Strengths</h4>
              <ul className="strength-list">
                {sunSignData.strengths.map((strength, idx) => (
                  <li key={idx}>{strength}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Challenges */}
          {sunSignData.weaknesses && (
            <div className="detail-section">
              <h4>Challenges to Balance</h4>
              <ul className="challenge-list">
                {sunSignData.weaknesses.map((weakness, idx) => (
                  <li key={idx}>{weakness}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Lucky Elements */}
          {sunSignData.luckyElements && (
            <div className="detail-section lucky-section">
              <h4>Lucky Elements</h4>
              <div className="lucky-grid">
                {sunSignData.luckyElements.numbers && (
                  <div className="lucky-item">
                    <strong>Numbers:</strong>
                    <span>{sunSignData.luckyElements.numbers.join(', ')}</span>
                  </div>
                )}
                {sunSignData.luckyElements.colors && (
                  <div className="lucky-item">
                    <strong>Colors:</strong>
                    <span>{sunSignData.luckyElements.colors.join(', ')}</span>
                  </div>
                )}
                {sunSignData.luckyElements.days && (
                  <div className="lucky-item">
                    <strong>Days:</strong>
                    <span>{sunSignData.luckyElements.days.join(', ')}</span>
                  </div>
                )}
                {sunSignData.luckyElements.stones && (
                  <div className="lucky-item">
                    <strong>Crystals:</strong>
                    <span>{sunSignData.luckyElements.stones.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Compatibility */}
          {sunSignData.compatibility && (
            <div className="detail-section">
              <h4>Compatibility</h4>
              {sunSignData.compatibility.mostCompatible && (
                <p><strong>Most Compatible:</strong> {sunSignData.compatibility.mostCompatible.join(', ')}</p>
              )}
              {sunSignData.compatibility.leastCompatible && (
                <p><strong>Challenges:</strong> {sunSignData.compatibility.leastCompatible.join(', ')}</p>
              )}
              {sunSignData.compatibility.description && (
                <p className="italic-text">{sunSignData.compatibility.description}</p>
              )}
            </div>
          )}

          {/* Career */}
          {sunSignData.careerSpecific && (
            <div className="detail-section">
              <h4>Career & Purpose</h4>
              {sunSignData.careerSpecific.ideal && (
                <div>
                  <p><strong>Ideal Careers:</strong></p>
                  <ul>
                    {sunSignData.careerSpecific.ideal.map((job, idx) => (
                      <li key={idx}>{job}</li>
                    ))}
                  </ul>
                </div>
              )}
              {sunSignData.careerSpecific.leadership && (
                <p><strong>Leadership Style:</strong> {sunSignData.careerSpecific.leadership}</p>
              )}
            </div>
          )}

          {/* Health */}
          {sunSignData.health && (
            <div className="detail-section">
              <h4>Health & Wellness</h4>
              {sunSignData.health.bodyParts && (
                <p><strong>Vulnerable Areas:</strong> {Array.isArray(sunSignData.health.bodyParts) ? sunSignData.health.bodyParts.join(', ') : sunSignData.health.bodyParts}</p>
              )}
              {sunSignData.health.recommendations && (
                <div>
                  <p><strong>Wellness Recommendations:</strong></p>
                  <ul>
                    {Array.isArray(sunSignData.health.recommendations) ? 
                      sunSignData.health.recommendations.map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      )) : 
                      <li>{sunSignData.health.recommendations}</li>
                    }
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Mythology */}
          {sunSignData.mythology && (
            <div className="detail-section mythology-section">
              <h4>Mythology</h4>
              <p><strong>Archetype:</strong> {sunSignData.mythology.archetype}</p>
              <p><strong>Deity:</strong> {sunSignData.mythology.deity}</p>
              <p className="italic-text">{sunSignData.mythology.story}</p>
            </div>
          )}

          {/* Seasonal */}
          {sunSignData.seasonal && (
            <div className="detail-section seasonal-section">
              <h4>Seasonal Influence</h4>
              <p><strong>Season:</strong> {sunSignData.seasonal.season}</p>
              <p><strong>Energy:</strong> {sunSignData.seasonal.energy}</p>
              <p className="italic-text">{sunSignData.seasonal.connection}</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
