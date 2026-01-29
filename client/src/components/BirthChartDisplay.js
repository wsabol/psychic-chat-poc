import { useTranslation } from '../context/TranslationContext';

/**
 * Display user's birth chart (Rising, Moon, Sun signs)
 * Eliminates duplicated code from desktop and mobile views
 */
export default function BirthChartDisplay({ birthChart }) {
  const { t } = useTranslation();

  if (!birthChart) {
    return null;
  }

  return (
    <div className="birth-chart-simple">
      {birthChart.rising_sign && (
        <div className="chart-item">
          <span className="chart-icon">↗️</span>
          <span className="chart-sign">{t(`mySign.${birthChart.rising_sign.toLowerCase()}`)}</span>
        </div>
      )}
      {birthChart.moon_sign && (
        <div className="chart-item">
          <span className="chart-icon">🌙</span>
          <span className="chart-sign">{t(`mySign.${birthChart.moon_sign.toLowerCase()}`)}</span>
        </div>
      )}
      {birthChart.sun_sign && (
        <div className="chart-item">
          <span className="chart-icon">☀️</span>
          <span className="chart-sign">{t(`mySign.${birthChart.sun_sign.toLowerCase()}`)}</span>
        </div>
      )}
    </div>
  );
}
