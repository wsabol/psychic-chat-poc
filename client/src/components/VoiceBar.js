import React, { useEffect } from 'react';
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
  volume,
  onVolumeChange,
  progress = 0,
  onUpdateProgress,
  disabled = false
}) {
  // Update progress periodically while playing
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      if (onUpdateProgress) {
        onUpdateProgress();
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [isPlaying, onUpdateProgress]);

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
              title="Read aloud (🔊)"
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
                title={isPlaying ? 'Pause (⏸)' : 'Resume (▶)'}
              >
                {isPlaying ? '⏸️' : '▶️'}
              </button>

              <button
                className="voice-btn voice-btn-stop"
                onClick={onStop}
                disabled={disabled}
                title="Stop (⏹)"
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

        {/* Right side: Volume control */}
        <div className="voice-bar-right">
          <label htmlFor="voice-volume" className="voice-volume-label">
            🔊
          </label>
          <input
            id="voice-volume"
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="voice-volume-slider"
            disabled={disabled || (!isPlaying && !isPaused)}
            title="Volume control"
          />
        </div>
      </div>
    </div>
  );
}
