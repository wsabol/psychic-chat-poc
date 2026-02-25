import { useTranslation } from '../context/TranslationContext';

/**
 * ExitButton - Temporary account exit button
 * Label is translated via the freeTrial.exitToContinue key so it appears in
 * the user's selected language (e.g. "✓ Quitter pour Continuer" for French).
 */
export default function ExitButton({ onClick, isTemporaryAccount }) {
  const { t } = useTranslation();
  if (!isTemporaryAccount) return null;

  const label = t('freeTrial.exitToContinue') || '✓ Exit to Continue';

  return (
    <div style={{
      position: 'fixed',
      top: '2rem',
      right: '2rem',
      zIndex: 1000
    }}>
      <button
        type="button"
        onClick={onClick}
        style={{
          backgroundColor: '#ffffff',
          color: '#22c55e',
          border: '3px solid #22c55e',
          borderRadius: '12px',
          padding: '1rem 1.5rem',
          fontSize: '18px',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
          transition: 'all 0.3s ease',
          minWidth: '180px',
          textAlign: 'center'
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = '#22c55e';
          e.target.style.color = '#ffffff';
          e.target.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = '#ffffff';
          e.target.style.color = '#22c55e';
          e.target.style.transform = 'scale(1)';
        }}
        title={label}
      >
        {label}
      </button>
    </div>
  );
}
