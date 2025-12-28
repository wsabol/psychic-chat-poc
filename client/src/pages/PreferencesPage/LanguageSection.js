import React from 'react';
import { LANGUAGES } from '../../data/translations';

export default function LanguageSection({ value, onChange, getString }) {
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
        {getString('language')}
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
        {Object.entries(LANGUAGES).map(([code, name]) => (
          <option key={code} value={code}>{name}</option>
        ))}
      </select>
    </div>
  );
}
