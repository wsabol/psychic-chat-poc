import React, { useState } from 'react';
import { DocumentViewer } from './help/DocumentViewer.jsx';
import { useTranslation } from '../context/TranslationContext';
import './ConsentModal.css';

export function ConsentModal({ userId, token, onConsentAccepted }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [termsRead, setTermsRead] = useState(false);
  const [privacyRead, setPrivacyRead] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(null); // 'terms' or 'privacy' or null

  const handleAccept = async () => {
    if (!termsRead || !privacyRead) {
      setError(t('compliance.consentModal.errorBothRequired'));
      return;
    }

    setLoading(true);
    setError('');

        try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_URL}/auth/record-consent/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          terms_accepted: true,
          privacy_accepted: true
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to record consent');
      }

      onConsentAccepted();
        } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="consent-modal-overlay">
      <div className="consent-modal">
        <h2>{t('compliance.consentModal.title')}</h2>

        {error && <div className="consent-error-message">{error}</div>}

        <div className="consent-content">
          <div className="consent-section">
            <div className="consent-section-header">
              <h3>{t('compliance.consentModal.termsTitle')}</h3>
              <button
                type="button"
                onClick={() => setViewingDocument('terms')}
                className="btn-read-document"
              >
                📖 {t('compliance.consentModal.readTermsButton')}
              </button>
            </div>
            <div className="consent-text">
              <p>{t('compliance.consentModal.termsDescription')}</p>
              <label>
                <input
                  type="checkbox"
                  checked={termsRead}
                  onChange={(e) => setTermsRead(e.target.checked)}
                  disabled={loading}
                />
                <span>{t('compliance.consentModal.acceptTermsCheckbox')}</span>
              </label>
            </div>
          </div>

          <div className="consent-section">
            <div className="consent-section-header">
              <h3>{t('compliance.consentModal.privacyTitle')}</h3>
              <button
                type="button"
                onClick={() => setViewingDocument('privacy')}
                className="btn-read-document"
              >
                🔒 {t('compliance.consentModal.readPrivacyButton')}
              </button>
            </div>
            <div className="consent-text">
              <p>{t('compliance.consentModal.privacyDescription')}</p>
              <label>
                <input
                  type="checkbox"
                  checked={privacyRead}
                  onChange={(e) => setPrivacyRead(e.target.checked)}
                  disabled={loading}
                />
                <span>{t('compliance.consentModal.acceptPrivacyCheckbox')}</span>
              </label>
            </div>
          </div>
        </div>

        <div className="consent-actions">
          <button
            onClick={handleAccept}
            disabled={loading || !termsRead || !privacyRead}
            className="btn-consent-accept"
          >
            {loading ? t('compliance.consentModal.accepting') : t('compliance.consentModal.acceptButton')}
          </button>
        </div>
      </div>

      {/* Document Viewer Overlay */}
      {viewingDocument && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          zIndex: 10001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem'
        }}>
          <DocumentViewer
            title={viewingDocument === 'terms' ? t('compliance.consentModal.termsTitle') : t('compliance.consentModal.privacyTitle')}
            docType={viewingDocument}
            onBack={() => setViewingDocument(null)}
          />
        </div>
      )}
    </div>
  );
}

export default ConsentModal;

