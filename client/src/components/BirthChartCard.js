import { useTranslation } from '../context/TranslationContext';

/**
 * BirthChartCard - Displays a single astrological sign card (Sun, Moon, or Rising)
 * Layout: type label, then icon + sign name on one line, then degree below
 * @param {Object} props
 * @param {string} props.sign - The astrological sign name (e.g., "Aries")
 * @param {number} props.degree - The degree of the sign (e.g., 18.95)
 * @param {string} props.icon - Emoji icon for the card
 * @param {string} props.type - Card type: "sun", "moon", or "rising"
 */
export default function BirthChartCard({ sign, degree, icon, type }) {
  const { t } = useTranslation();

  if (!sign) return null;

  // Build label key: "rising" → "astrology.risingSign", "moon" → "astrology.moonSign", etc.
  const labelKey = `astrology.${type}Sign`;

  return (
    <div className={`chart-card ${type}-card`}>
      <p className="chart-label">{t(labelKey)}</p>
      <div className="chart-header">
        <span className="chart-icon">{icon}</span>
        <p className="chart-sign">{t(`mySign.${sign.toLowerCase()}`)}</p>
      </div>
      {degree != null && <p className="chart-degree">{parseFloat(degree).toFixed(2)}°</p>}
    </div>
  );
}
