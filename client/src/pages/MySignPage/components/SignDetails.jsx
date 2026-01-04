/**
 * SignDetails - Display detailed zodiac information
 * Shows personality, strengths, career, health, compatibility, etc.
 */

const planetEmojis = {
  'Mars': '♂️', 'Marte': '♂️', 'Sol': '☀️', 'Luna': '🌙', 'Mercurio': '☿️', 'Júpiter': '♃', 'Saturno': '♄', 'Urano': '⛢', 'Neptuno': '♆', 'Plutón': '♇',
  'Venus': '♀️', 'Mercury': '☿️', 'Moon': '🌙', 'Sun': '☀️', 'Jupiter': '♃', 'Saturn': '♄', 'Uranus': '⛢', 'Neptune': '♆', 'Pluto': '♇'
};

const elementEmojis = {
  'Fire': '🔥', 'Fuego': '🔥', 'Feu': '🔥', 'Feuer': '🔥', 'Fuoco': '🔥', 'Fogo': '🔥', '火': '🔥',
  'Earth': '🌍', 'Tierra': '🌍', 'Terre': '🌍', 'Erde': '🌍', 'Terra': '🌍', '土': '🌍',
  'Air': '💨', 'Aire': '💨', 'Luft': '💨', 'Aria': '💨', 'Ar': '💨', '气': '💨', '風': '💨',
  'Water': '💧', 'Agua': '💧', 'Eau': '💧', 'Wasser': '💧', 'Acqua': '💧', 'Água': '💧', '水': '💧'
};

const getCurrentMoonPhase = () => {
  const now = new Date();
  const knownNewMoonDate = new Date(2025, 0, 29).getTime();
  const currentDate = now.getTime();
  const lunarCycle = 29.53059 * 24 * 60 * 60 * 1000;
  const daysIntoPhase = ((currentDate - knownNewMoonDate) % lunarCycle) / (24 * 60 * 60 * 1000);
  const phaseIndex = Math.floor((daysIntoPhase / 29.53059) * 8) % 8;
  const phases = ['newMoon', 'waxingCrescent', 'firstQuarter', 'waxingGibbous', 'fullMoon', 'waningGibbous', 'lastQuarter', 'waningCrescent'];
  return phases[phaseIndex];
};

const getPhaseInfluence = (astro, phase) => {
  if (!astro.moonPhases) return '';
  const phaseMap = {
    'newMoon': astro.moonPhases.newMoon,
    'waxingCrescent': astro.moonPhases.waxingCrescent,
    'firstQuarter': astro.moonPhases.firstQuarter,
    'waxingGibbous': astro.moonPhases.waxingGibbous,
    'fullMoon': astro.moonPhases.fullMoon,
    'waningGibbous': astro.moonPhases.waningGibbous,
    'lastQuarter': astro.moonPhases.lastQuarter,
    'waningCrescent': astro.moonPhases.waningCrescent
  };
  return phaseMap[phase] || astro.moonPhases.influence || '';
};

export function SignDetails({ astro, t }) {
  const currentMoonPhase = getCurrentMoonPhase();

  return (
    <>
      {/* Header */}
      <div className="zodiac-header">
        <h2 className="heading-secondary">
          {astro.emoji && <span>{astro.emoji}</span>} {t(`mySign.${astro.sun_sign.toLowerCase()}`)}
          {astro.symbol && <span className="zodiac-symbol">{astro.symbol}</span>}
        </h2>
      </div>

      {/* Basic Info - Planet and Ruling Planet with emojis, stacked layout */}
      {(astro.dates || astro.element || astro.rulingPlanet || astro.planet) && (
        <div className="info-grid">
          {astro.dates && (
            <div className="info-item">
              <strong>{t ? t('mySign.dates') : 'Dates:'}</strong>
              <span>{astro.dates}</span>
            </div>
          )}
          {astro.element && (
            <div className="info-item">
              <strong>{t ? t('mySign.element') : 'Element:'}</strong>
              <span className="element-with-emoji">
                <span className="element-emoji">{elementEmojis[astro.element] || '✨'}</span>
                {astro.element}
              </span>
            </div>
          )}
          {astro.planet && (
            <div className="info-item">
              <strong>{t ? t('mySign.traditionalPlanet') : 'Traditional Planet:'}</strong>
              <span className="planet-with-emoji">
                <span className="planet-emoji">{planetEmojis[astro.planet] || '🪐'}</span>
                {astro.planet}
              </span>
            </div>
          )}
          {astro.rulingPlanet && (
            <div className="info-item">
              <strong>{t ? t('mySign.modernRulingPlanet') : 'Modern Ruling Planet:'}</strong>
              <div className="ruling-planets-stacked">
                {astro.rulingPlanet.split('/').map((planet, idx) => {
                  const trimmed = planet.trim();
                  return (
                    <div key={idx} className="ruling-planet-row">
                      <span className="planet-emoji">{planetEmojis[trimmed] || '🪐'}</span>
                      <span className="planet-name">{trimmed}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Personality */}
      {astro.personality && (
        <div className="detail-section">
          <h4>{t ? t('mySign.personality') || 'Personality Essence' : 'Personality Essence'}</h4>
          <p className="italic-text">{astro.personality}</p>
        </div>
      )}

      {/* Life Path */}
      {astro.lifePath && (
        <div className="detail-section">
          <h4>{t ? t('mySign.lifePath') || 'Your Life Path' : 'Your Life Path'}</h4>
          <p>{astro.lifePath}</p>
        </div>
      )}

      {/* Strengths */}
      {astro.strengths && Array.isArray(astro.strengths) && (
        <div className="detail-section">
          <h4>{t ? t('mySign.strengths') || 'Strengths' : 'Strengths'}</h4>
          <ul className="strength-list">
            {astro.strengths.map((strength, idx) => (
              <li key={idx}>{strength}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Challenges & Complications */}
      {(astro.challenges || astro.complications) && (
        <div className="detail-section">
          {astro.challenges && (
            <>
              <h4>{t ? t('mySign.challenges') || 'Challenges to Balance' : 'Challenges to Balance'}</h4>
              <p>{astro.challenges}</p>
            </>
          )}
          {astro.complications && Array.isArray(astro.complications) && (
            <>
              <h4>{t('mySign.complications')}</h4>
              <ul className="challenge-list">
                {astro.complications.map((complication, idx) => (
                  <li key={idx}>{complication}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {/* Compatibility - Expanded with Most Compatible, Least Compatible, Soulmate */}
      {astro.compatibility && (
        <div className="detail-section compatibility-section">
          <h4>{t ? t('mySign.compatibility') || 'Compatibility' : 'Compatibility'}</h4>
          {astro.compatibility.mostCompatible && (
            <div className="compatibility-item">
              <strong>{t('mySign.mostCompatible')}</strong>
              <p>{Array.isArray(astro.compatibility.mostCompatible) ? astro.compatibility.mostCompatible.join(', ') : astro.compatibility.mostCompatible}</p>
            </div>
          )}
          {astro.compatibility.leastCompatible && (
            <div className="compatibility-item">
              <strong>{t('mySign.leastCompatible')}</strong>
              <p>{Array.isArray(astro.compatibility.leastCompatible) ? astro.compatibility.leastCompatible.join(', ') : astro.compatibility.leastCompatible}</p>
            </div>
          )}
          {astro.compatibility.soulmate && (
            <div className="compatibility-item">
              <strong>{t ? t('mySign.soulmateSign') || 'Soulmate Sign' : 'Soulmate Sign'}</strong>
              <p>{astro.compatibility.soulmate}</p>
            </div>
          )}
          {astro.compatibility.description && (
            <p className="italic-text compatibility-description">{astro.compatibility.description}</p>
          )}
        </div>
      )}

      {/* Career */}
      {astro.careerSpecific && (
        <div className="detail-section">
          <h4>{t ? t('mySign.career') || 'Career & Purpose' : 'Career & Purpose'}</h4>
          {astro.careerSpecific.ideal && (
            <div>
              <p><strong>{t ? t('mySign.idealCareers') || 'Ideal Careers:' : 'Ideal Careers:'}</strong></p>
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
            <p><strong>{t ? t('mySign.leadershipStyle') || 'Leadership Style:' : 'Leadership Style:'}</strong> {astro.careerSpecific.leadership}</p>
          )}
          {astro.careerSpecific.avoid && (
            <div>
              <p><strong>{t ? t('mySign.pathsToAvoid') || 'Paths to Avoid:' : 'Paths to Avoid:'}</strong></p>
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
            <p><strong>{t ? t('mySign.opportunities') || 'Opportunities:' : 'Opportunities:'}</strong> {astro.opportunities}</p>
          )}
        </div>
      )}

      {/* Health */}
      {astro.health && (
        <div className="detail-section">
          <h4>{t ? t('mySign.health') || 'Health & Wellness' : 'Health & Wellness'}</h4>
          {astro.health.bodyParts && (
            <p><strong>{t ? t('mySign.vulnerableAreas') || 'Vulnerable Areas:' : 'Vulnerable Areas:'}</strong> {Array.isArray(astro.health.bodyParts) ? astro.health.bodyParts.join(', ') : astro.health.bodyParts}</p>
          )}
          {astro.health.tendencies && (
            <div>
              <p><strong>{t ? t('mySign.healthTendencies') || 'Health Tendencies:' : 'Health Tendencies:'}</strong></p>
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
              <p><strong>{t ? t('mySign.wellnessRecommendations') || 'Wellness Recommendations:' : 'Wellness Recommendations:'}</strong></p>
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

      {/* Lucky Elements - Moved after Health & Wellness */}
      {astro.luckyElements && (
        <div className="detail-section lucky-section">
          <h4>{t ? t('mySign.luckyElements') || 'Lucky Elements' : 'Lucky Elements'}</h4>
          <div className="lucky-grid">
            {astro.luckyElements.numbers && (
              <div className="lucky-item">
                <strong>{t ? t('mySign.numbers') || 'Numbers:' : 'Numbers:'}</strong>
                <span>{Array.isArray(astro.luckyElements.numbers) ? astro.luckyElements.numbers.join(', ') : astro.luckyElements.numbers}</span>
              </div>
            )}
            {astro.luckyElements.colors && (
              <div className="lucky-item">
                <strong>{t ? t('mySign.colors') || 'Colors:' : 'Colors:'}</strong>
                <span>{Array.isArray(astro.luckyElements.colors) ? astro.luckyElements.colors.join(', ') : astro.luckyElements.colors}</span>
              </div>
            )}
            {astro.luckyElements.days && (
              <div className="lucky-item">
                <strong>{t ? t('mySign.days') || 'Days:' : 'Days:'}</strong>
                <span>{Array.isArray(astro.luckyElements.days) ? astro.luckyElements.days.join(', ') : astro.luckyElements.days}</span>
              </div>
            )}
            {astro.luckyElements.stones && (
              <div className="lucky-item">
                <strong>{t ? t('mySign.crystals') || 'Crystals:' : 'Crystals:'}</strong>
                <span>{Array.isArray(astro.luckyElements.stones) ? astro.luckyElements.stones.join(', ') : astro.luckyElements.stones}</span>
              </div>
            )}
            {astro.luckyElements.metals && (
              <div className="lucky-item">
                <strong>{t ? t('mySign.metals') || 'Metals:' : 'Metals:'}</strong>
                <span>{Array.isArray(astro.luckyElements.metals) ? astro.luckyElements.metals.join(', ') : astro.luckyElements.metals}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Moon Phase Influence - Current phase only */}
      {astro.moonPhases && (
        <div className="detail-section">
          <h4>{t ? t('mySign.moonPhaseInfluences') || 'Moon Phase Influence' : 'Moon Phase Influence'}</h4>
          {getPhaseInfluence(astro, currentMoonPhase) && (
            <p className="italic-text">{getPhaseInfluence(astro, currentMoonPhase)}</p>
          )}
        </div>
      )}

      {/* Seasonal */}
      {astro.seasonal && (
        <div className="detail-section seasonal-section">
          <h4>{t ? t('mySign.seasonal') || 'Seasonal Influence' : 'Seasonal Influence'}</h4>
          {astro.seasonal.season && (
            <p><strong>{t ? t('mySign.season') || 'Season:' : 'Season:'}</strong> {astro.seasonal.season}</p>
          )}
          {astro.seasonal.energy && (
            <p><strong>{t ? t('mySign.energy') || 'Energy:' : 'Energy:'}</strong> {astro.seasonal.energy}</p>
          )}
          {astro.seasonal.bestSeason && (
            <p><strong>{t ? t('mySign.bestSeason') || 'Best Season:' : 'Best Season:'}</strong> {astro.seasonal.bestSeason}</p>
          )}
          {astro.seasonal.connection && (
            <p className="italic-text">{astro.seasonal.connection}</p>
          )}
        </div>
      )}

      {/* Mythology - At the bottom, after Seasonal */}
      {astro.mythology && (
        <div className="detail-section mythology-section">
          <h4>{t ? t('mySign.mythology') || 'Mythology' : 'Mythology'}</h4>
          {astro.mythology.archetype && (
            <p><strong>{t ? t('mySign.archetype') || 'Archetype:' : 'Archetype:'}</strong> {astro.mythology.archetype}</p>
          )}
          {astro.mythology.deity && (
            <p><strong>{t ? t('mySign.deity') || 'Deity:' : 'Deity:'}</strong> {astro.mythology.deity}</p>
          )}
          {astro.mythology.origin && (
            <p><strong>{t ? t('mySign.origin') || 'Origin:' : 'Origin:'}</strong> {astro.mythology.origin}</p>
          )}
          {astro.mythology.story && (
            <p className="italic-text">{astro.mythology.story}</p>
          )}
        </div>
      )}
    </>
  );
}
