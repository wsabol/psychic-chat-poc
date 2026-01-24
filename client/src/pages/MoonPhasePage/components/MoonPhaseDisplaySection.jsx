import { useTranslation } from '../../../context/TranslationContext';
import { moonPhaseEmojis, getPhaseTranslationKey } from '../../../utils/moonPhaseUtils';
import { formatDateByLanguage } from '../../../utils/dateLocaleUtils';

/**
 * MoonPhaseDisplaySection Component
 * Displays the current moon phase with emoji, name, and date
 */
export function MoonPhaseDisplaySection({ currentPhase, language }) {
  const { t } = useTranslation();

  if (!currentPhase) return null;

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
