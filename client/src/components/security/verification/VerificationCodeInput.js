import React from 'react';

/**
 * VerificationCodeInput - Code verification screen (reusable)
 */
export default function VerificationCodeInput({
  code,
  setCode,
  verificationType,
  contactValue,
  saving,
  onVerify,
  onBack
}) {
  const typeLabel = verificationType === 'phone' ? 'Phone' : 'Email';
  const isValidCode = code.length === 6;

  return (
    <div style={{
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '8px',
      border: '1px solid #e0e0e0'
    }}>
      <h3 style={{ marginTop: 0 }}>Verify Your {typeLabel}</h3>
      <p style={{ color: '#666' }}>
        Enter the 6-digit code sent to {contactValue}
      </p>

      {/* Code Input */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.slice(0, 6))}
          placeholder="000000"
          maxLength="6"
          disabled={saving}
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '24px',
            textAlign: 'center',
            letterSpacing: '0.5rem',
            borderRadius: '4px',
            border: '1px solid #ccc',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          onClick={onVerify}
          disabled={saving || !isValidCode}
          style={{
            flex: 1,
            padding: '0.75rem',
            backgroundColor: '#7c63d8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: saving || !isValidCode ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            opacity: saving || !isValidCode ? 0.6 : 1
          }}
        >
          {saving ? 'Verifying...' : 'Verify Code'}
        </button>
        <button
          onClick={onBack}
          disabled={saving}
          style={{
            flex: 1,
            padding: '0.75rem',
            backgroundColor: '#f5f5f5',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '14px'
          }}
        >
          Back
        </button>
      </div>
    </div>
  );
}
