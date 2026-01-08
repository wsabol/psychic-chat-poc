import { useTranslation } from '../context/TranslationContext';
import { useSpeech } from '../hooks/useSpeech';
import VoiceBar from './VoiceBar';
import { useEffect } from 'react';

export function MoonPhaseContent({ moonPhaseData, showingBrief, setShowingBrief, voiceEnabled, hasAutoPlayed, setHasAutoPlayed, lastUpdated }) {
  const { t } = useTranslation();
  const { speak, stop, pause, resume, isPlaying, isPaused, isLoading: isSpeechLoading, error: speechError, isSupported, volume, setVolume } = useSpeech();

  // Auto-play when moon phase data arrives
  useEffect(() => {
    if (voiceEnabled && isSupported && moonPhaseData && !hasAutoPlayed && !isPlaying) {
      setHasAutoPlayed(true);
      const textToRead = showingBrief && moonPhaseData?.brief ? moonPhaseData.brief : moonPhaseData?.text;
      setTimeout(() => {
        speak(textToRead, { rate: 0.95, pitch: 1.2 });
      }, 500);
    }
  }, [voiceEnabled, isSupported, moonPhaseData, hasAutoPlayed, isPlaying, showingBrief, speak, setHasAutoPlayed]);

  const handleTogglePause = () => {
    if (isPlaying) {
      pause();
    } else if (isPaused) {
      resume();
    }
  };

  const handlePlayVoice = () => {
    const textToRead = showingBrief && moonPhaseData?.brief ? moonPhaseData.brief : moonPhaseData?.text;
    speak(textToRead, { rate: 0.95, pitch: 1.2 });
  };

  if (!moonPhaseData) return null;

  return (
    <section className="moon-phase-content">
      <div className="moon-phase-insight">
        <div dangerouslySetInnerHTML={{ __html: showingBrief && moonPhaseData.brief ? moonPhaseData.brief : moonPhaseData.text }} />
        
        {/* Voice Bar */}
        {isSupported && (
          <VoiceBar
            isPlaying={isPlaying}
            isPaused={isPaused}
            isLoading={isSpeechLoading}
            error={speechError}
            onPlay={handlePlayVoice}
            onTogglePause={handleTogglePause}
            onStop={stop}
            isSupported={isSupported}
            volume={volume}
            onVolumeChange={setVolume}
          />
        )}
        
        <button 
          onClick={() => setShowingBrief(!showingBrief)} 
          style={{ 
            marginTop: '1.5rem', 
            padding: '0.75rem 1.5rem', 
            backgroundColor: '#7c63d8', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px', 
            cursor: 'pointer', 
            fontSize: '1rem', 
            fontWeight: '500' 
          }} 
          onMouseEnter={(e) => e.target.style.backgroundColor = '#6b52c1'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#7c63d8'}
        >
          {showingBrief ? t('chat.toggleMore') : t('chat.toggleLess')}
        </button>
      </div>

      {lastUpdated && (
        <div className="moon-phase-timestamp">
          <p className="text-muted">Generated: {lastUpdated}</p>
        </div>
      )}

      <div className="moon-phase-info">
        <p>{t('moonPhase.cycleInfo')}</p>
      </div>

      <div className="moon-phase-disclaimer">
        <p>{t('moonPhase.disclaimer')}</p>
      </div>
    </section>
  );
}
