import { useTranslation } from '../context/TranslationContext';

export function HoroscopeToggle({ horoscopeRange, setHoroscopeRange, loading, generating }) {
  const { t } = useTranslation();

  return (
    <div className="horoscope-toggle">
      {['daily', 'weekly'].map((range) => (
        <button
          key={range}
          className={`toggle-btn ${horoscopeRange === range ? 'active' : ''}`}
          onClick={() => setHoroscopeRange(range)}
          disabled={loading || generating}
        >
          {t(`horoscope.${range}`)}
        </button>
      ))}
    </div>
  );
}
