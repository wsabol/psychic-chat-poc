import React from 'react';

export default function ResponseTypeSection({ value, onChange, getString }) {
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
        {getString('responseType')}
      </label>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          fontSize: '14px'
        }}>
          <input
            type="radio"
            name="response_type"
            value="full"
            checked={value === 'full'}
            onChange={(e) => onChange(e.target.value)}
            style={{
              marginRight: '8px',
              cursor: 'pointer'
            }}
          />
          {getString('fullResponses')}
        </label>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          fontSize: '14px'
        }}>
          <input
            type="radio"
            name="response_type"
            value="brief"
            checked={value === 'brief'}
            onChange={(e) => onChange(e.target.value)}
            style={{
              marginRight: '8px',
              cursor: 'pointer'
            }}
          />
          {getString('briefResponses')}
        </label>
      </div>
    </div>
  );
}
