import React from 'react';
import { useTranslation } from '../context/TranslationContext';

/**
 * TermsCheckbox Component
 * Displays T&C and Privacy Policy checkboxes with links
 * Used in registration flow
 * Now links to multi-language policy pages
 */
export function TermsCheckbox({ 
  termsAccepted, 
  privacyAccepted, 
  onTermsChange, 
  onPrivacyChange, 
  disabled = false 
}) {
  const { t } = useTranslation();
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
          {t('terms.acceptPrefix')}{' '}
          <a 
            href="/policies?type=terms" 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ color: '#64B5F6', textDecoration: 'underline' }}
          >
            {t('terms.termsLink')}
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
          {t('terms.acceptPrefix')}{' '}
          <a 
            href="/policies?type=privacy" 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ color: '#64B5F6', textDecoration: 'underline' }}
          >
            {t('terms.privacyLink')}
          </a>
          {' '}*
        </span>
      </label>

      <p style={{ fontSize: '0.75rem', color: '#aaa', margin: '0.75rem 0 0 0' }}>
        * {t('terms.required')}
      </p>
    </div>
  );
}

export default TermsCheckbox;
