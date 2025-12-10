import React from 'react';

/**
 * TermsCheckbox Component
 * Displays T&C and Privacy Policy checkboxes with links
 * Used in registration flow
 */
export function TermsCheckbox({ 
  termsAccepted, 
  privacyAccepted, 
  onTermsChange, 
  onPrivacyChange, 
  disabled = false 
}) {
  return (
    <div style={{
      backgroundColor: 'rgba(100, 100, 150, 0.3)',
      padding: '1rem',
      borderRadius: '5px',
      border: '1px solid rgba(100, 150, 255, 0.3)',
      fontSize: '0.85rem',
      lineHeight: '1.4'
    }}>
      <label style={{ 
        display: 'flex', 
        alignItems: 'flex-start', 
        gap: '0.5rem', 
        cursor: 'pointer', 
        marginBottom: '0.75rem' 
      }}>
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => onTermsChange(e.target.checked)}
          disabled={disabled}
          style={{ marginTop: '0.25rem', cursor: 'pointer' }}
        />
        <span>
          I accept the{' '}
          <a 
            href="/TERMS_OF_SERVICE.md" 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ color: '#64B5F6', textDecoration: 'underline' }}
          >
            Terms of Service
          </a>
          {' '}*
        </span>
      </label>

      <label style={{ 
        display: 'flex', 
        alignItems: 'flex-start', 
        gap: '0.5rem', 
        cursor: 'pointer' 
      }}>
        <input
          type="checkbox"
          checked={privacyAccepted}
          onChange={(e) => onPrivacyChange(e.target.checked)}
          disabled={disabled}
          style={{ marginTop: '0.25rem', cursor: 'pointer' }}
        />
        <span>
          I accept the{' '}
          <a 
            href="/privacy.md" 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ color: '#64B5F6', textDecoration: 'underline' }}
          >
            Privacy Policy
          </a>
          {' '}*
        </span>
      </label>

      <p style={{ fontSize: '0.75rem', color: '#aaa', margin: '0.75rem 0 0 0' }}>
        * Required to create account
      </p>
    </div>
  );
}

export default TermsCheckbox;
