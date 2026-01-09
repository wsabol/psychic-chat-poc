import { useTranslation } from '../context/TranslationContext';
import VoiceBar from './VoiceBar';

/**
 * HoroscopeTextSection - Displays horoscope text with voice controls and brief/full toggle
 */
export default function HoroscopeTextSection({
  horoscopeData,
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

  if (!horoscopeData) return null;

  const displayText = showingBrief && horoscopeData.brief 
    ? horoscopeData.brief 
    : horoscopeData.text;

  return (
    <div className="horoscope-text">
      <div dangerouslySetInnerHTML={{ __html: displayText }} />
      
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
        className="horoscope-toggle-btn"
      >
        {showingBrief ? t('chat.toggleMore') : t('chat.toggleLess')}
      </button>
    </div>
  );
}
