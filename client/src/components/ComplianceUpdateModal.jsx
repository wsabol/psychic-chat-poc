/**
 * ComplianceUpdateModal Component
 * 
 * Displays when user needs to accept updated Terms of Service or Privacy Policy
 * Blocks access to the app until user accepts updates
 * 
 * Props:
 *   - userId: string - User's ID
 *   - token: string - Auth token
 *   - compliance: object - Compliance status from server
 *   - onConsentUpdated: function - Callback when user accepts updates
 */

import React, { useState } from 'react';
import { logErrorFromCatch } from '../shared/errorLogger.js';
import { DocumentViewer } from './help/DocumentViewer.jsx';
import { useTranslation } from '../context/TranslationContext';
import { getLegalDocumentPath } from '../utils/legalDocumentUtils';
import './ComplianceUpdateModal.css';

export function ComplianceUpdateModal({ userId, token, compliance, onConsentUpdated }) {
  const { t, language } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accepted, setAccepted] = useState({
    terms: false,
    privacy: false
  });
  const [viewingDocument, setViewingDocument] = useState(null); // 'terms' or 'privacy' or null
  
  // Get language-specific document paths
  const termsPath = getLegalDocumentPath('terms', language);
  const privacyPath = getLegalDocumentPath('privacy', language);

  if (!compliance || !compliance.blocksAccess) {
    return null; // Don't render if not needed
  }

  const handleAcceptTerms = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/consent/terms-acceptance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          terms_accepted: true,
          privacy_accepted: accepted.privacy
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to record consent');
      }

      // Automatically proceed after success - don't wait for state update
      onConsentUpdated();
    } catch (err) {
      logErrorFromCatch('[COMPLIANCE] Error accepting terms:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptPrivacy = async () => {
    setLoading(true);
    setError('');

    try {
      const apiUrl = `${process.env.REACT_APP_API_URL}/auth/consent/terms-acceptance`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          terms_accepted: accepted.terms,
          privacy_accepted: true
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to record consent');
      }

      // Automatically proceed after success - don't wait for state update
      onConsentUpdated();
    } catch (err) {
      logErrorFromCatch('[COMPLIANCE] Error accepting privacy:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="compliance-modal-overlay">
      <div className="compliance-modal">
        <div className="compliance-header">
          <h2>⚖️ {t('compliance.updateModal.title')}</h2>
          <p className="compliance-subtitle">
            {t('compliance.updateModal.subtitle')}
          </p>
        </div>

        {error && <div className="compliance-error-message">{error}</div>}

        <div className="compliance-content">
          {/* Terms Update */}
          {(compliance.termsVersion?.requiresReacceptance || compliance.requiresTermsUpdate) && (
            <div className="compliance-section">
              <div className="section-header">
                <h3>{t('compliance.updateModal.termsTitle')} {compliance.termsVersion.current}</h3>
                <span className="version-badge">
                  {t('compliance.updateModal.updatedFrom', { version: compliance.termsVersion.accepted })}
                </span>
              </div>
              <div className="compliance-text">
                <p>{t('compliance.updateModal.termsDescription')}</p>
                <div className="action-buttons">
                  <button
                    onClick={() => setViewingDocument('terms')}
                    className="btn-view-document"
                    type="button"
                  >
                    📖 {t('compliance.updateModal.readTermsButton')}
                  </button>
                  <a
                    href={termsPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-link-secondary"
                    title={t('compliance.updateModal.openInNewTab')}
                  >
                    🔗 {t('compliance.updateModal.openInNewTab')}
                  </a>
                </div>
              </div>
              <label className="compliance-checkbox-label">
                <input
                  type="checkbox"
                  checked={accepted.terms}
                  onChange={(e) => setAccepted(prev => ({...prev, terms: e.target.checked}))}
                  disabled={loading}
                />
                <span className="checkbox-text">
                  {t('compliance.updateModal.acceptTermsCheckbox')}
                </span>
              </label>
              <button
                onClick={handleAcceptTerms}
                disabled={loading || !accepted.terms}
                className="btn-accept"
              >
                {loading ? t('compliance.updateModal.processing') : t('compliance.updateModal.acceptTermsButton')}
              </button>
              {accepted.terms && !loading && (
                <div className="accepted-badge">✓ {t('compliance.updateModal.accepted')}</div>
              )}
            </div>
          )}

          {/* Privacy Update */}
          {(compliance.privacyVersion?.requiresReacceptance || compliance.requiresPrivacyUpdate) && (
            <div className="compliance-section">
              <div className="section-header">
                <h3>{t('compliance.updateModal.privacyTitle')} {compliance.privacyVersion.current}</h3>
                <span className="version-badge">
                  {t('compliance.updateModal.updatedFrom', { version: compliance.privacyVersion.accepted })}
                </span>
              </div>
              <div className="compliance-text">
                <p>{t('compliance.updateModal.privacyDescription')}</p>
                <div className="action-buttons">
                  <button
                    onClick={() => setViewingDocument('privacy')}
                    className="btn-view-document"
                    type="button"
                  >
                    🔒 {t('compliance.updateModal.readPrivacyButton')}
                  </button>
                  <a
                    href={privacyPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-link-secondary"
                    title={t('compliance.updateModal.openInNewTab')}
                  >
                    🔗 {t('compliance.updateModal.openInNewTab')}
                  </a>
                </div>
              </div>
              <label className="compliance-checkbox-label">
                <input
                  type="checkbox"
                  checked={accepted.privacy}
                  onChange={(e) => setAccepted(prev => ({...prev, privacy: e.target.checked}))}
                  disabled={loading}
                />
                <span className="checkbox-text">
                  {t('compliance.updateModal.acceptPrivacyCheckbox')}
                </span>
              </label>
              <button
                onClick={handleAcceptPrivacy}
                disabled={loading || !accepted.privacy}
                className="btn-accept"
              >
                {loading ? t('compliance.updateModal.processing') : t('compliance.updateModal.acceptPrivacyButton')}
              </button>
              {accepted.privacy && !loading && (
                <div className="accepted-badge">✓ {t('compliance.updateModal.accepted')}</div>
              )}
            </div>
          )}
        </div>

        {/* No separate continue button needed - auto-proceeds after acceptance */}

        {/* Help text */}
        <div className="compliance-help">
          <p>
            <strong>{t('compliance.updateModal.whyTitle')}</strong> {t('compliance.updateModal.whyText')}
          </p>
          <p>
            <strong>{t('compliance.updateModal.declineTitle')}</strong> {t('compliance.updateModal.declineText')}
          </p>
        </div>
      </div>

      {/* Document Viewer Overlay */}
      {viewingDocument && (
        <div className="compliance-document-viewer-overlay">
          <DocumentViewer
            title={viewingDocument === 'terms' ? t('compliance.updateModal.termsTitle') : t('compliance.updateModal.privacyTitle')}
            docType={viewingDocument}
            onBack={() => setViewingDocument(null)}
            onAccept={() => {
              // Auto-tick the matching accepted checkbox when accepted from the reader
              setAccepted(prev => ({
                ...prev,
                [viewingDocument]: true,
              }));
              setViewingDocument(null);
            }}
          />
        </div>
      )}
    </div>
  );
}

export default ComplianceUpdateModal;

