import { useTranslation } from '../context/TranslationContext';

export function HoroscopeHeader() {
  const { t } = useTranslation();

  return (
    <div className="horoscope-header">
      <h2 className="heading-primary">{t('horoscope.title')}</h2>
      <p className="horoscope-subtitle">{t('horoscope.subtitle')}</p>
    </div>
  );
}
