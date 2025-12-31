/**
 * SignDetails - Display detailed zodiac information
 * Shows personality, strengths, career, health, compatibility, etc.
 */
export function SignDetails({ astro, t }) {
  return (
    <>
      {/* Header */}
      <div className="zodiac-header">
        <h2 className="heading-secondary">
          {astro.emoji && <span>{astro.emoji}</span>} {astro.sun_sign}
          {astro.symbol && <span className="zodiac-symbol">{astro.symbol}</span>}
        </h2>
      </div>

      {/* Basic Info */}
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
              <span>{astro.element}</span>
            </div>
          )}
          {astro.rulingPlanet && (
            <div className="info-item">
              <strong>{t ? t('mySign.rulingPlanet') : 'Ruling Planet:'}</strong>
              <span>{astro.rulingPlanet}</span>
            </div>
          )}
          {astro.planet && (
            <div className="info-item">
              <strong>{t ? t('astrology.planets') : 'Planet:'}</strong>
              <span>{astro.planet}</span>
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

      {/* Weaknesses & Challenges */}
      {(astro.challenges || astro.weaknesses) && (
        <div className="detail-section">
          {astro.challenges && (
            <>
              <h4>{t ? t('mySign.challenges') || 'Challenges to Balance' : 'Challenges to Balance'}</h4>
              <p>{astro.challenges}</p>
            </>
          )}
          {astro.weaknesses && Array.isArray(astro.weaknesses) && (
            <>
              <h4>{t ? t('mySign.weaknesses') || 'Weaknesses' : 'Weaknesses'}</h4>
              <ul className="challenge-list">
                {astro.weaknesses.map((weakness, idx) => (
                  <li key={idx}>{weakness}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {/* Lucky Elements */}
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

      {/* Compatibility */}
      {astro.compatibility && (
        <div className="detail-section">
          <h4>{t ? t('mySign.compatibility') || 'Compatibility' : 'Compatibility'}</h4>
          {astro.compatibility.mostCompatible && (
            <p><strong>{t ? t('mySign.mostCompatible') || 'Most Compatible:' : 'Most Compatible:'}</strong> {Array.isArray(astro.compatibility.mostCompatible) ? astro.compatibility.mostCompatible.join(', ') : astro.compatibility.mostCompatible}</p>
          )}
          {astro.compatibility.leastCompatible && (
            <p><strong>{t ? t('mySign.challenges') || 'Challenges:' : 'Challenges:'}</strong> {Array.isArray(astro.compatibility.leastCompatible) ? astro.compatibility.leastCompatible.join(', ') : astro.compatibility.leastCompatible}</p>
          )}
          {astro.compatibility.description && (
            <p className="italic-text">{astro.compatibility.description}</p>
          )}
          {astro.compatibility.soulmate && (
            <p><strong>{t ? t('mySign.soulmateSign') || 'Soulmate Sign:' : 'Soulmate Sign:'}</strong> {astro.compatibility.soulmate}</p>
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

      {/* Mythology */}
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

      {/* Moon Phases */}
      {astro.moonPhases && (
        <div className="detail-section">
          <h4>{t ? t('mySign.moonPhaseInfluences') || 'Moon Phase Influences' : 'Moon Phase Influences'}</h4>
          {astro.moonPhases.influence && (
            <p className="italic-text">{astro.moonPhases.influence}</p>
          )}
          {astro.moonPhases.newMoon && (
            <div>
              <p><strong>{t ? t('moonPhase.new') || 'New Moon:' : 'New Moon:'}</strong> {astro.moonPhases.newMoon}</p>
            </div>
          )}
          {astro.moonPhases.fullMoon && (
            <div>
              <p><strong>{t ? t('moonPhase.full') || 'Full Moon:' : 'Full Moon:'}</strong> {astro.moonPhases.fullMoon}</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
