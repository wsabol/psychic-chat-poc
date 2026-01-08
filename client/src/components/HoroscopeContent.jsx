import { useTranslation } from '../context/TranslationContext';
import { useSpeech } from '../hooks/useSpeech';
import VoiceBar from './VoiceBar';
import { formatDateByLanguage } from '../utils/dateLocaleUtils';
import { useEffect } from 'react';

export function HoroscopeContent({ horoscopeData, showingBrief, setShowingBrief, voiceEnabled, hasAutoPlayed, setHasAutoPlayed }) {
  const { t, language } = useTranslation();
  const { speak, stop, pause, resume, isPlaying, isPaused, isLoading: isSpeechLoading, error: speechError, isSupported, volume, setVolume } = useSpeech();

  // Auto-play when horoscope data arrives
  useEffect(() => {
    if (voiceEnabled && isSupported && horoscopeData && !hasAutoPlayed && !isPlaying) {
      setHasAutoPlayed(true);
      const textToRead = showingBrief && horoscopeData?.brief ? horoscopeData.brief : horoscopeData?.text;
      setTimeout(() => {
        speak(textToRead, { rate: 0.95, pitch: 1.2 });
      }, 500);
    }
  }, [voiceEnabled, isSupported, horoscopeData, hasAutoPlayed, isPlaying, showingBrief, speak, setHasAutoPlayed]);

  const handleTogglePause = () => {
    if (isPlaying) {
      pause();
    } else if (isPaused) {
      resume();
    }
  };

  const handlePlayVoice = () => {
    const textToRead = showingBrief && horoscopeData?.brief ? horoscopeData.brief : horoscopeData?.text;
    speak(textToRead, { rate: 0.95, pitch: 1.2 });
  };

  if (!horoscopeData) return null;

  return (
    <section className="horoscope-content">
      <div className="horoscope-metadata">
        <p className="horoscope-range">
          {t('horoscope.reading', { range: t(`horoscope.${horoscopeData.range}`) })}
        </p>
        <p className="horoscope-date">
          {formatDateByLanguage(new Date(), language)}
        </p>
      </div>

      <div className="horoscope-text">
        <div dangerouslySetInnerHTML={{ __html: showingBrief && horoscopeData.brief ? horoscopeData.brief : horoscopeData.text }} />
        
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

      <div className="horoscope-disclaimer">
        <p>{t('horoscope.disclaimer')}</p>
      </div>
    </section>
  );
}
