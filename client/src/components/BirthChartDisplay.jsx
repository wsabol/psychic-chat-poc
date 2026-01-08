import { useTranslation } from '../context/TranslationContext';
import { isBirthInfoMissing } from '../utils/birthInfoErrorHandler';

export function BirthChartDisplay({ astroInfo }) {
  const { t } = useTranslation();

  const astro = astroInfo?.astrology_data || {};

  if (!astro.sun_sign || isBirthInfoMissing(astroInfo)) {
    return null;
  }

  return (
    <section className="horoscope-birth-chart">
      <div className="birth-chart-cards">
        {astro.rising_sign && (
          <div className="chart-card rising-card">
            <span className="chart-icon">↗️</span>
            <p className="chart-sign">{t(`mySign.${astro.rising_sign.toLowerCase()}`)}</p>
            {astro.rising_degree && <p className="chart-degree">{astro.rising_degree}°</p>}
          </div>
        )}
        {astro.moon_sign && (
          <div className="chart-card moon-card">
            <span className="chart-icon">🌙</span>
            <p className="chart-sign">{t(`mySign.${astro.moon_sign.toLowerCase()}`)}</p>
            {astro.moon_degree && <p className="chart-degree">{astro.moon_degree}°</p>}
          </div>
        )}
        {astro.sun_sign && (
          <div className="chart-card sun-card">
            <span className="chart-icon">☀️</span>
            <p className="chart-sign">{t(`mySign.${astro.sun_sign.toLowerCase()}`)}</p>
            {astro.sun_degree && <p className="chart-degree">{astro.sun_degree}°</p>}
          </div>
        )}
      </div>
    </section>
  );
}
