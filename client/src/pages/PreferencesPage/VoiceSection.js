import React from 'react';
import VoiceOption from './VoiceOption';

const VOICE_OPTIONS = {
  sophia: {
    label: 'Sophia',
    specialty: 'Intuitive Energy Reader',
    description: 'Warm and insightful wisdom'
  },
  cassandra: {
    label: 'Cassandra',
    specialty: 'Deep Oracle Wisdom',
    description: 'Ancient knowledge keeper'
  },
  meridian: {
    label: 'Meridian',
    specialty: 'Celestial Alignment Expert',
    description: 'Cosmic energy specialist'
  },
  leo: {
    label: 'Leo',
    specialty: 'Stellar Mystic',
    description: 'Universal spiritual insights'
  }
};

export default function VoiceSection({
  voiceEnabled,
  voiceSelected,
  previewingVoice,
  onVoiceEnabledChange,
  onVoiceSelectedChange,
  onPreviewVoice,
  getString
}) {
  return (
    <div style={{
      marginBottom: '2rem',
      paddingBottom: '2rem',
      borderBottom: '1px solid #eee'
    }}>
      <label style={{
        display: 'block',
        marginBottom: '0.75rem',
        fontWeight: '600',
        color: '#333',
        fontSize: '16px'
      }}>
        {getString('voice')}
      </label>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          fontSize: '14px'
        }}>
          <input
            type="radio"
            name="voice_enabled"
            checked={voiceEnabled === true}
            onChange={() => onVoiceEnabledChange(true)}
            style={{
              marginRight: '8px',
              cursor: 'pointer'
            }}
          />
          {getString('voiceOn')}
        </label>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          fontSize: '14px'
        }}>
          <input
            type="radio"
            name="voice_enabled"
            checked={voiceEnabled === false}
            onChange={() => onVoiceEnabledChange(false)}
            style={{
              marginRight: '8px',
              cursor: 'pointer'
            }}
          />
          {getString('voiceOff')}
        </label>
      </div>

      {voiceEnabled && (
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          backgroundColor: '#f9f9f9',
          borderRadius: '8px'
        }}>
          <p style={{
            margin: '0 0 1rem 0',
            fontSize: '14px',
            fontWeight: '500',
            color: '#555'
          }}>
            Select your oracle's voice:
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem'
          }}>
            {Object.entries(VOICE_OPTIONS).map(([key, data]) => (
              <VoiceOption
                key={key}
                voiceKey={key}
                voiceData={data}
                isSelected={voiceSelected === key}
                isPreviewingVoice={previewingVoice}
                onSelect={onVoiceSelectedChange}
                onPreview={onPreviewVoice}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
