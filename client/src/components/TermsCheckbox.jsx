import React, { useState } from 'react';
import { useTranslation } from '../context/TranslationContext';
import { DocumentViewer } from './help/DocumentViewer.jsx';
import { getLegalDocumentPath } from '../utils/legalDocumentUtils';

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
  const { t, language } = useTranslation();
  const [viewingDocument, setViewingDocument] = useState(null); // 'terms' or 'privacy' or null
  
  // Get language-specific document paths
  const termsPath = getLegalDocumentPath('terms', language);
  const privacyPath = getLegalDocumentPath('privacy', language);

  return (
    <>
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
          <button
            type="button"
            onClick={() => setViewingDocument('terms')}
            style={{
              background: 'none',
              border: 'none',
              color: '#64B5F6',
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: 0,
              font: 'inherit'
            }}
          >
            {t('terms.termsLink')}
          </button>
          {' '}
          <a 
            href={termsPath} 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ color: '#64B5F6', fontSize: '0.8em' }}
            title="Open in new tab"
          >
            🔗
          </a>
          {' '}*
        </span>
      </label>

      <label style={{ 
        display: 'flex', 
        alignItems: 'flex-start', 
        gap: '0.5rem', 
        cursor: 'pointer',
        marginBottom: '0.75rem'
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
          <button
            type="button"
            onClick={() => setViewingDocument('privacy')}
            style={{
              background: 'none',
              border: 'none',
              color: '#64B5F6',
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: 0,
              font: 'inherit'
            }}
          >
            {t('terms.privacyLink')}
          </button>
          {' '}
          <a 
            href={privacyPath} 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ color: '#64B5F6', fontSize: '0.8em' }}
            title="Open in new tab"
          >
            🔗
          </a>
          {' '}*
        </span>
      </label>

      <p style={{ fontSize: '0.75rem', color: '#aaa', margin: '0.75rem 0 0 0' }}>
        * {t('terms.required')}
      </p>
    </div>

    {/* Document Viewer Overlay */}
    {viewingDocument && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}>
        <DocumentViewer
          title={viewingDocument === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
          docType={viewingDocument}
          onBack={() => setViewingDocument(null)}
        />
      </div>
    )}
    </>
  );
}

export default TermsCheckbox;
