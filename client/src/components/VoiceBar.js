import React from 'react';
import { useTranslation } from '../context/TranslationContext';
import './VoiceBar.css';

export default function VoiceBar({
  isPlaying,
  isPaused,
  isLoading,
  error,
  onPlay,
  onTogglePause,
  onStop,
  isSupported,
  progress = 0,
  disabled = false
}) {
  const { t } = useTranslation();
  if (!isSupported) {
    return null;
  }

  return (
    <div className="voice-bar">
      {/* Error message */}
      {error && !error.includes('interrupted') && (
        <div className="voice-bar-error">
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* Control bar */}
      <div className="voice-bar-container">
        {/* Left side: Play/Pause controls */}
        <div className="voice-bar-left">
          {/* Play button - shown when not playing */}
          {!isPlaying && !isPaused && !isLoading && (
            <button
              className="voice-btn voice-btn-play"
              onClick={onPlay}
              disabled={disabled}
              title={t('voice.play')}
            >
              🔊
            </button>
          )}

          {/* Pause/Resume toggle - shown when playing or paused */}
          {(isPlaying || isPaused) && (
            <>
              <button
                className="voice-btn voice-btn-toggle"
                onClick={onTogglePause}
                disabled={disabled}
                title={isPlaying ? t('voice.pause') : t('voice.play')}
              >
                {isPlaying ? '⏸️' : '▶️'}
              </button>

              <button
                className="voice-btn voice-btn-stop"
                onClick={onStop}
                disabled={disabled}
                title={t('voice.stop')}
              >
                ⏹️
              </button>
            </>
          )}

          {/* Loading state */}
          {isLoading && (
            <button className="voice-btn voice-btn-loading" disabled>
              🔊
            </button>
          )}
        </div>

        {/* Middle: Progress bar */}
        <div className="voice-bar-progress">
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
