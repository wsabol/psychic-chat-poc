import { useTranslation } from '../context/TranslationContext';

export function SunSignInfo({ sunSignData }) {
  const { t } = useTranslation();

  if (!sunSignData) return null;

  return (
    <section className="sun-sign-info">
      <div className="sun-sign-header">
        <h3>{sunSignData.emoji} {sunSignData.name}</h3>
      </div>
      <div className="sun-info-grid">
        <div className="info-item">
          <strong>{t('mySign.dates')}</strong>
          <span>{sunSignData.dates}</span>
        </div>
        <div className="info-item">
          <strong>{t('mySign.element')}</strong>
          <span>{sunSignData._englishElement ? t(`elements.${sunSignData._englishElement.toLowerCase()}`) : sunSignData.element}</span>
        </div>
        <div className="info-item">
          <strong>{t('mySign.rulingPlanet')}</strong>
          <span>{sunSignData._englishRulingPlanet ? sunSignData._englishRulingPlanet.split('/').map((p, i) => <span key={i}>{i > 0 && ' / '} {t(`planets.${p.toLowerCase().trim()}`)}</span>) : sunSignData.rulingPlanet}</span>
        </div>
      </div>
      {sunSignData.personality && (
        <div className="sun-detail">
          <h4>{t('mySign.aboutYourSign')}</h4>
          <p>{sunSignData.personality}</p>
        </div>
      )}
    </section>
  );
}
