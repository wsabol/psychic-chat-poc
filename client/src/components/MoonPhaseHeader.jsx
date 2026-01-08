import { useTranslation } from '../context/TranslationContext';

export function MoonPhaseHeader() {
  const { t } = useTranslation();

  return (
    <div className="moon-phase-header">
      <h2 className="heading-primary">🌙 {t('moonPhase.title')}</h2>
      <p className="moon-phase-subtitle">{t('moonPhase.subtitle')}</p>
    </div>
  );
}
