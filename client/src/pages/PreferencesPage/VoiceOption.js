import React from 'react';

export default function VoiceOption({
  voiceKey,
  voiceData,
  isSelected,
  isPreviewingVoice,
  onSelect,
  onPreview
}) {
  return (
    <label style={{
      display: 'flex',
      alignItems: 'flex-start',
      cursor: 'pointer',
      padding: '0.75rem',
      backgroundColor: isSelected ? '#e8e4f3' : '#fff',
      borderRadius: '6px',
      border: `2px solid ${isSelected ? '#7c63d8' : '#ddd'}`,
      transition: 'all 0.2s'
    }}>
      <input
        type="radio"
        name="voice_selected"
        value={voiceKey}
        checked={isSelected}
        onChange={() => onSelect(voiceKey)}
        style={{
          marginRight: '0.75rem',
          marginTop: '0.2rem',
          cursor: 'pointer',
          flexShrink: 0
        }}
      />
      <div style={{ flex: 1 }}>
        <div style={{
          fontWeight: '600',
          fontSize: '14px',
          color: '#333',
          marginBottom: '0.25rem'
        }}>
          {voiceData.label}
        </div>
        <div style={{
          fontSize: '12px',
          color: '#7c63d8',
          fontWeight: '500',
          marginBottom: '0.25rem'
        }}>
          {voiceData.specialty}
        </div>
        <div style={{
          fontSize: '12px',
          color: '#666',
          marginBottom: '0.5rem'
        }}>
          {voiceData.description}
        </div>
        <button
          type="button"
          onClick={() => onPreview(voiceKey)}
          disabled={isPreviewingVoice === voiceKey}
          style={{
            padding: '0.4rem 0.8rem',
            backgroundColor: '#7c63d8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: isPreviewingVoice === voiceKey ? 'not-allowed' : 'pointer',
            opacity: isPreviewingVoice === voiceKey ? 0.7 : 1
          }}
        >
          {isPreviewingVoice === voiceKey ? '🔊 Listening...' : '🔊 Preview'}
        </button>
      </div>
    </label>
  );
}
