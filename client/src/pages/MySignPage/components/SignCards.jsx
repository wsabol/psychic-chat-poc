/**
 * SignCards - Display Rising, Moon, and Sun signs (in astrological order)
 */
export function SignCards({ astro, t }) {
  return (
    <section className="sign-cards-section">
      {/* Rising Sign Card (First) */}
      {astro.rising_sign && (
        <div className="sign-card rising-sign-card">
          <div className="sign-card-icon">↗️</div>
          <div className="sign-card-content">
            <h3 className="sign-card-title">{t ? t('astrology.risingSign') : 'Rising Sign'}</h3>
            <p className="sign-card-value">{astro.rising_sign}</p>
            {astro.rising_degree && (
              <p className="sign-card-degree">{astro.rising_degree}°</p>
            )}
            <p className="sign-card-meaning">{t ? t('mySign.rising_meaning') || 'How others perceive you' : 'How others perceive you'}</p>
          </div>
        </div>
      )}

      {/* Moon Sign Card (Second) */}
      {astro.moon_sign && (
        <div className="sign-card moon-sign-card">
          <div className="sign-card-icon">🌙</div>
          <div className="sign-card-content">
            <h3 className="sign-card-title">{t ? t('astrology.moonSign') : 'Moon Sign'}</h3>
            <p className="sign-card-value">{astro.moon_sign}</p>
            {astro.moon_degree && (
              <p className="sign-card-degree">{astro.moon_degree}°</p>
            )}
            <p className="sign-card-meaning">{t ? t('mySign.moon_meaning') || 'Your inner emotional world' : 'Your inner emotional world'}</p>
          </div>
        </div>
      )}

      {/* Sun Sign Card (Third) */}
      {astro.sun_sign && (
        <div className="sign-card sun-sign-card">
          <div className="sign-card-icon">☀️</div>
          <div className="sign-card-content">
            <h3 className="sign-card-title">{t ? t('astrology.sunSign') : 'Sun Sign'}</h3>
            <p className="sign-card-value">{astro.sun_sign}</p>
            {astro.sun_degree && (
              <p className="sign-card-degree">{astro.sun_degree}°</p>
            )}
            <p className="sign-card-meaning">{t ? t('mySign.sun_meaning') || 'Your core identity and essence' : 'Your core identity and essence'}</p>
          </div>
        </div>
      )}
    </section>
  );
}
