import { useTranslation } from '../context/TranslationContext';
import { formatDateByLanguage } from '../utils/dateLocaleUtils';
import { isBirthInfoMissing } from '../utils/birthInfoErrorHandler';
import { moonPhaseEmojis, getPhaseTranslationKey } from '../utils/moonPhaseUtils';

export function MoonPhaseDisplay({ currentPhase, astroInfo }) {
  const { t, language } = useTranslation();

  if (!currentPhase || isBirthInfoMissing(astroInfo)) {
    return null;
  }

  return (
    <section className="moon-phase-display">
      <div className="moon-phase-emoji">
        {moonPhaseEmojis[currentPhase]}
      </div>
      <h3 className="moon-phase-name">
        {t(`moonPhase.${getPhaseTranslationKey(currentPhase)}`)}
      </h3>
      <p className="moon-phase-date">
        {formatDateByLanguage(new Date(), language)}
      </p>
    </section>
  );
}
