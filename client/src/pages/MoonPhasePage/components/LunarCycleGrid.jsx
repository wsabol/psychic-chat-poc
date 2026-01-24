import { useTranslation } from '../../../context/TranslationContext';
import { moonPhaseEmojis, moonPhaseOrder, getPhaseTranslationKey } from '../../../utils/moonPhaseUtils';

/**
 * LunarCycleGrid Component
 * Displays the 8 phases of the moon in a grid with the current phase highlighted
 */
export function LunarCycleGrid({ currentPhase }) {
  const { t } = useTranslation();

  return (
    <section className="lunar-cycle">
      <h3>{t('moonPhase.title')}</h3>
      <div className="moon-phases-grid">
        {moonPhaseOrder.map((phase) => (
          <div
            key={phase}
            className={`moon-phase-item ${phase === currentPhase ? 'active' : ''}`}
          >
            <div className="moon-emoji">{moonPhaseEmojis[phase]}</div>
            <p className="phase-name">
              {t(`moonPhase.${getPhaseTranslationKey(phase)}`)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
