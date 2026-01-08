import { useTranslation } from '../context/TranslationContext';

export function HoroscopeLoading({ generating }) {
  const { t } = useTranslation();

  return (
    <div className="horoscope-content loading">
      <div className="spinner">🔮</div>
      <p>
        {generating ? t('horoscope.generatingMessage') : t('horoscope.loading')}
      </p>
    </div>
  );
}
