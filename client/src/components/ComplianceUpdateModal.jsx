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
import './ComplianceUpdateModal.css';

export function ComplianceUpdateModal({ userId, token, compliance, onConsentUpdated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accepted, setAccepted] = useState({
    terms: false,
    privacy: false
  });
  const [viewingDocument, setViewingDocument] = useState(null); // 'terms' or 'privacy' or null

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

  // Only require acceptance of what's actually needed
  const termsRequired = compliance.termsVersion?.requiresReacceptance || compliance.requiresTermsUpdate;
  const privacyRequired = compliance.privacyVersion?.requiresReacceptance || compliance.requiresPrivacyUpdate;
  
  const allRequiredAccepted = 
    (!termsRequired || accepted.terms) && 
    (!privacyRequired || accepted.privacy);

  return (
    <div className="compliance-modal-overlay">
      <div className="compliance-modal">
        <div className="compliance-header">
          <h2>⚖️ Important: Updated Terms & Privacy Policy</h2>
          <p className="compliance-subtitle">
            We've updated our legal documents. Please review and accept the new versions to continue.
          </p>
        </div>

        {error && <div className="compliance-error-message">{error}</div>}

        <div className="compliance-content">
          {/* Terms Update */}
          {(compliance.termsVersion?.requiresReacceptance || compliance.requiresTermsUpdate) && (
            <div className="compliance-section">
              <div className="section-header">
                <h3>Terms of Service {compliance.termsVersion.current}</h3>
                <span className="version-badge">
                  Updated from {compliance.termsVersion.accepted}
                </span>
              </div>
              <div className="compliance-text">
                <p>Our Terms of Service have been significantly updated. Please read the new terms carefully.</p>
                <div className="action-buttons">
                  <button 
                    onClick={() => setViewingDocument('terms')}
                    className="btn-view-document"
                    type="button"
                  >
                    📖 Read Full Terms of Service
                  </button>
                  <a 
                    href="/Terms_of_Service.pdf" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn-link-secondary"
                    title="Open in new tab"
                  >
                    🔗 Open in New Tab
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
                  I have read and accept the updated Terms of Service
                </span>
              </label>
              <button 
                onClick={handleAcceptTerms}
                disabled={loading || !accepted.terms}
                className="btn-accept"
              >
                {loading ? 'Processing...' : 'Accept Terms'}
              </button>
              {accepted.terms && !loading && (
                <div className="accepted-badge">✓ Accepted</div>
              )}
            </div>
          )}

          {/* Privacy Update */}
          {(compliance.privacyVersion?.requiresReacceptance || compliance.requiresPrivacyUpdate) && (
            <div className="compliance-section">
              <div className="section-header">
                <h3>Privacy Policy {compliance.privacyVersion.current}</h3>
                <span className="version-badge">
                  Updated from {compliance.privacyVersion.accepted}
                </span>
              </div>
              <div className="compliance-text">
                <p>Our Privacy Policy has been significantly updated with new data protection measures.</p>
                <div className="action-buttons">
                  <button 
                    onClick={() => setViewingDocument('privacy')}
                    className="btn-view-document"
                    type="button"
                  >
                    🔒 Read Full Privacy Policy
                  </button>
                  <a 
                    href="/privacy.pdf" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn-link-secondary"
                    title="Open in new tab"
                  >
                    🔗 Open in New Tab
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
                  I have read and accept the updated Privacy Policy
                </span>
              </label>
              <button 
                onClick={handleAcceptPrivacy}
                disabled={loading || !accepted.privacy}
                className="btn-accept"
              >
                {loading ? 'Processing...' : 'Accept Privacy Policy'}
              </button>
              {accepted.privacy && !loading && (
                <div className="accepted-badge">✓ Accepted</div>
              )}
            </div>
          )}
        </div>

        {/* No separate continue button needed - auto-proceeds after acceptance */}

        {/* Help text */}
        <div className="compliance-help">
          <p>
            <strong>Why are we asking you to do this?</strong> We've made important changes to better protect your data and improve our service. These updates are required by law to keep you informed.
          </p>
          <p>
            <strong>What if I don't agree?</strong> Unfortunately, you must accept these terms to continue using our service. Please contact support@example.com if you have concerns.
          </p>
        </div>
      </div>

      {/* Document Viewer Overlay */}
      {viewingDocument && (
        <div className="compliance-document-viewer-overlay">
          <DocumentViewer
            title={viewingDocument === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
            docType={viewingDocument}
            onBack={() => setViewingDocument(null)}
          />
        </div>
      )}
    </div>
  );
}

export default ComplianceUpdateModal;

