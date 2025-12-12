/**
 * SignCards - Display Sun, Moon, and Rising signs
 */
export function SignCards({ astro }) {
  return (
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
  );
}
