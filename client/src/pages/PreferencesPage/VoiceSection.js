import React from 'react';
import VoiceOption from './VoiceOption';

// Voice options with translation keys for instant updates
const VOICE_OPTIONS = {
  sophia: {
    labelKey: 'voiceSelect.sophia',
    specialtyKey: 'voiceSelect.sophiaSpecialty',
    descriptionKey: 'voiceSelect.sophiaDesc'
  },
  cassandra: {
    labelKey: 'voiceSelect.cassandra',
    specialtyKey: 'voiceSelect.cassandraSpecialty',
    descriptionKey: 'voiceSelect.cassandraDesc'
  },
  meridian: {
    labelKey: 'voiceSelect.meridian',
    specialtyKey: 'voiceSelect.meridianSpecialty',
    descriptionKey: 'voiceSelect.meridianDesc'
  },
  leo: {
    labelKey: 'voiceSelect.leo',
    specialtyKey: 'voiceSelect.leoSpecialty',
    descriptionKey: 'voiceSelect.leoDesc'
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
        {getString('settings.voiceSettings')}
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
          {getString('settings.voiceEnabled')}
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
          {getString('settings.voiceDisabled')}
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
            {getString('voiceSelect.label')}
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem'
          }}>
            {Object.entries(VOICE_OPTIONS).map(([key, translationKeys]) => (
              <VoiceOption
                key={key}
                voiceKey={key}
                translationKeys={translationKeys}
                isSelected={voiceSelected === key}
                isPreviewingVoice={previewingVoice}
                onSelect={onVoiceSelectedChange}
                onPreview={onPreviewVoice}
                getString={getString}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
