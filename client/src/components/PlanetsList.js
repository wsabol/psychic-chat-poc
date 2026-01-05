import { useTranslation } from '../context/TranslationContext';

/**
 * Display list of planets with positions and retrograde status
 * Eliminates duplicated code from desktop and mobile views
 */
export default function PlanetsList({ planets }) {
  const { t } = useTranslation();

  if (!planets || planets.length === 0) {
    return <p>No planets data available</p>;
  }

  return (
    <div className="planets-list">
      {planets.map((planet, idx) => (
        <div key={idx} className={`planet-item ${planet.retrograde ? 'retrograde' : ''}`}>
          <span className="planet-icon">{planet.icon}</span>
          <span className="planet-name">{t(`cosmicWeather.${planet.name.toLowerCase()}`)}</span>
          <span className="planet-sign">{t(`mySign.${planet.sign.toLowerCase()}`)}</span>
          <span className="planet-degree">{planet.degree}°</span>
          {planet.retrograde && <span className="retrograde-badge">♻️</span>}
        </div>
      ))}
    </div>
  );
}
