import { useTranslation } from '../context/TranslationContext';
import '../styles/toggleBrief.css';

/**
 * Button to toggle between full and brief content views
 * Replaces inline styled button with proper component and CSS
 */
export default function ToggleBriefButton({ showingBrief, onClick }) {
  const { t } = useTranslation();

  return (
    <button 
      onClick={onClick}
      className="toggle-brief-btn"
      aria-pressed={showingBrief}
    >
      {showingBrief ? t('chat.toggleMore') : t('chat.toggleLess')}
    </button>
  );
}
