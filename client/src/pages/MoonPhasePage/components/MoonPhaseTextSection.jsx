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
      {(textToDisplay || '').split(/\n\n+/).filter(p => p.trim()).map((para, i) => (
        <pre key={i} className="markdown-pre">{para.trim()}</pre>
      ))}
      
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
        aria-pressed={!showingBrief}
      >
        {showingBrief ? t('chat.toggleMore') : t('chat.toggleLess')}
      </button>
    </div>
  );
}
