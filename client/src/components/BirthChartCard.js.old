import { useTranslation } from '../context/TranslationContext';

/**
 * BirthChartCard - Displays a single astrological sign card (Sun, Moon, or Rising)
 * @param {Object} props
 * @param {string} props.sign - The astrological sign name (e.g., "Aries")
 * @param {number} props.degree - The degree of the sign
 * @param {string} props.icon - Emoji icon for the card
 * @param {string} props.type - Card type: "sun", "moon", or "rising"
 */
export default function BirthChartCard({ sign, degree, icon, type }) {
  const { t } = useTranslation();

  if (!sign) return null;

  return (
    <div className={`chart-card ${type}-card`}>
      <span className="chart-icon">{icon}</span>
      <p className="chart-sign">{t(`mySign.${sign.toLowerCase()}`)}</p>
      {degree && <p className="chart-degree">{degree}°</p>}
    </div>
  );
}
