import { useTranslation } from '../../../context/TranslationContext';
import VoiceBar from '../../../components/VoiceBar';

/**
 * MoonPhaseTextSection Component
 * Displays moon phase commentary with voice controls and toggle button
 */
export function MoonPhaseTextSection({
  moonPhaseData,
  showingBrief,
  onToggleBrief,
  isSupported,
  isPlaying,
  isPaused,
  isSpeechLoading,
  speechError,
  onPlayVoice,
  onTogglePause,
  onStop,
  volume,
  onVolumeChange
}) {
  const { t } = useTranslation();

  if (!moonPhaseData) return null;

  const textToDisplay = showingBrief && moonPhaseData.brief 
    ? moonPhaseData.brief 
    : moonPhaseData.text;

  return (
    <div className="moon-phase-insight">
      <div dangerouslySetInnerHTML={{ __html: textToDisplay }} />
      
      {/* Voice Bar */}
      {isSupported && (
        <VoiceBar
          isPlaying={isPlaying}
          isPaused={isPaused}
          isLoading={isSpeechLoading}
          error={speechError}
          onPlay={onPlayVoice}
          onTogglePause={onTogglePause}
          onStop={onStop}
          isSupported={isSupported}
          volume={volume}
          onVolumeChange={onVolumeChange}
        />
      )}
      
      <button 
        onClick={onToggleBrief}
        className="toggle-brief-btn"
        style={{ 
          marginTop: '1.5rem', 
          padding: '0.75rem 1.5rem', 
          backgroundColor: '#7c63d8', 
          color: 'white', 
          border: 'none', 
          borderRadius: '5px', 
          cursor: 'pointer', 
          fontSize: '1rem', 
          fontWeight: '500',
          transition: 'background-color 0.2s'
        }} 
        onMouseEnter={(e) => e.target.style.backgroundColor = '#6b52c1'} 
        onMouseLeave={(e) => e.target.style.backgroundColor = '#7c63d8'}
      >
        {showingBrief ? t('chat.toggleMore') : t('chat.toggleLess')}
      </button>
    </div>
  );
}
