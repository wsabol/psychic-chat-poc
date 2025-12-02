import React, { useState } from 'react';

/**
 * Password input with toggle visibility eye icon
 */
export function PasswordInput({ 
  value, 
  onChange, 
  placeholder, 
  autoComplete = 'off',
  required = true 
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      alignItems: 'center'
    }}>
      <input
        type={showPassword ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        autoComplete={autoComplete}
        style={{
          padding: '0.75rem',
          paddingRight: '2.5rem',
          borderRadius: '5px',
          border: 'none',
          fontSize: '1rem',
          width: '100%',
          boxSizing: 'border-box'
        }}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        style={{
          position: 'absolute',
          right: '0.75rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '1.2rem',
          color: '#666',
          padding: '0.25rem 0.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title={showPassword ? 'Hide password' : 'Show password'}
      >
        {showPassword ? '👁️' : '👁️‍🗨️'}
      </button>
    </div>
  );
}
