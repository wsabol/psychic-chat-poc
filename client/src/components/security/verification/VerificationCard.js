import React from 'react';

/**
 * VerificationCard - Reusable card component for displaying verification methods
 */
export default function VerificationCard({ title, value, isVerified = false }) {
  return (
    <div style={{
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '8px',
      border: '1px solid #e0e0e0'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>{title}</h3>
      <p style={{ margin: '0.5rem 0', fontSize: '14px', color: '#666' }}>
        {value || 'Not set'}
      </p>
      {isVerified && (
        <span style={{
          display: 'inline-block',
          backgroundColor: '#e8f5e9',
          color: '#2e7d32',
          padding: '0.25rem 0.75rem',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          ✓ Verified
        </span>
      )}
    </div>
  );
}
