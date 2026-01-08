import { useTranslation } from '../context/TranslationContext';
import BirthInfoMissingPrompt from './BirthInfoMissingPrompt';

export function HoroscopeError({ error, onRetry, onNavigateToPersonalInfo }) {
  const { t } = useTranslation();

  if (error === 'BIRTH_INFO_MISSING') {
    return <BirthInfoMissingPrompt onNavigateToPersonalInfo={onNavigateToPersonalInfo} />;
  }

  if (!error) return null;

  return (
    <div className="horoscope-content error">
      <p className="error-message">⚠️ {error}</p>
      <button onClick={onRetry} className="btn-secondary">
        {t('common.tryAgain')}
      </button>
    </div>
  );
}
