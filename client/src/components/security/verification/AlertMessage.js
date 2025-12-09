import React from 'react';

/**
 * AlertMessage - Reusable error/success message component
 */
export default function AlertMessage({ type, message }) {
  if (!message) return null;

  const isError = type === 'error';
  const backgroundColor = isError ? '#ffebee' : '#e8f5e9';
  const color = isError ? '#d32f2f' : '#2e7d32';
  const icon = isError ? '❌' : '✓';

  return (
    <div style={{
      backgroundColor,
      color,
      padding: '1rem',
      borderRadius: '4px',
      marginBottom: '1rem'
    }}>
      {icon} {message}
    </div>
  );
}
