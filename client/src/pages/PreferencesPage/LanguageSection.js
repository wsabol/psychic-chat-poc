import React from 'react';
import { useTranslation } from '../../context/TranslationContext';

export default function LanguageSection({ value, onChange, getString }) {
  const { availableLanguages } = useTranslation();
  return (
    <div style={{
      marginBottom: '2rem',
      paddingBottom: '2rem',
      borderBottom: '1px solid #eee'
    }}>
      <label style={{
        display: 'block',
        marginBottom: '0.5rem',
        fontWeight: '600',
        color: '#333',
        fontSize: '16px'
      }}>
        {getString('settings.language')}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 12px',
          borderRadius: '6px',
          border: '1px solid #ccc',
          fontSize: '14px',
          backgroundColor: '#fff',
          cursor: 'pointer'
        }}
      >
        {Object.entries(availableLanguages).map(([code, langObj]) => (
          <option key={code} value={code}>{langObj.name}</option>
        ))}
      </select>
    </div>
  );
}
