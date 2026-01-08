import React, { useState } from 'react';
import './ComplianceUpdateModal.css';

export function ComplianceUpdateModal({ userId, token, compliance, onConsentUpdated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accepted, setAccepted] = useState({
    terms: false,
    privacy: false
  });

  if (!compliance || !compliance.blocksAccess) {
    return null;
  }

  const handleAcceptPrivacy = async () => {
    setLoading(true);
    setError('');

    try {
      // Get current consent status from DB to preserve existing values
      const checkResponse = await fetch(`${process.env.REACT_APP_API_URL}/auth/check-consent/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const currentConsent = await checkResponse.json();
      const currentTermsAccepted = currentConsent?.consents?.terms_accepted || accepted.terms;

      const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/consent/terms-acceptance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          terms_accepted: currentTermsAccepted,
          privacy_accepted: true
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to record consent');
      }

      console.log('[COMPLIANCE] ✓ Privacy accepted and recorded');
      // Automatically proceed after success
      onConsentUpdated();
    } catch (err) {
      console.error('[COMPLIANCE] Error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleAcceptTerms = async () => {
    setLoading(true);
    setError('');

    try {
      // Get current consent status from DB to preserve existing values
      const checkResponse = await fetch(`${process.env.REACT_APP_API_URL}/auth/check-consent/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const currentConsent = await checkResponse.json();
      const currentPrivacyAccepted = currentConsent?.consents?.privacy_accepted || accepted.privacy;

      const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/consent/terms-acceptance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          terms_accepted: true,
          privacy_accepted: currentPrivacyAccepted
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to record consent');
      }

      console.log('[COMPLIANCE] ✓ Terms accepted and recorded');
      // Automatically proceed after success
      onConsentUpdated();
    } catch (err) {
      console.error('[COMPLIANCE] Error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const termsRequired = compliance.termsVersion?.requiresReacceptance || compliance.requiresTermsUpdate;
  const privacyRequired = compliance.privacyVersion?.requiresReacceptance || compliance.requiresPrivacyUpdate;

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
          {termsRequired && (
            <div className="compliance-section">
              <div className="section-header">
                <h3>Terms of Service {compliance.termsVersion?.current}</h3>
                <span className="version-badge">
                  Updated from {compliance.termsVersion?.accepted}
                </span>
              </div>
              <div className="compliance-text">
                <p>Our Terms of Service have been significantly updated. Please read the new terms carefully.</p>
                <div className="action-buttons">
                  <a 
                    href="/TERMS_OF_SERVICE.md" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn-link"
                  >
                    📖 Read Full Terms of Service
                  </a>
                </div>
              </div>
              <label className="compliance-checkbox-label">
                <input
                  type="checkbox"
                  checked={accepted.terms}
                  onChange={(e) => {
                    const newChecked = e.target.checked;
                    setAccepted(prev => ({...prev, terms: newChecked}));
                    // Auto-submit when checkbox is checked
                    if (newChecked && !loading) {
                      handleAcceptTerms();
                    }
                  }}
                  disabled={loading}
                />
                <span className="checkbox-text">
                  I have read and accept the updated Terms of Service
                </span>
              </label>
              {loading && <div style={{marginTop: '0.5rem', color: '#666', fontSize: '0.9rem'}}>Processing...</div>}
              {accepted.terms && !loading && (
                <div className="accepted-badge">✓ Accepted</div>
              )}
            </div>
          )}

          {/* Privacy Update */}
          {privacyRequired && (
            <div className="compliance-section">
              <div className="section-header">
                <h3>Privacy Policy {compliance.privacyVersion?.current}</h3>
                <span className="version-badge">
                  Updated from {compliance.privacyVersion?.accepted}
                </span>
              </div>
              <div className="compliance-text">
                <p>Our Privacy Policy has been significantly updated with new data protection measures.</p>
                <div className="action-buttons">
                  <a 
                    href="/privacy.md" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn-link"
                  >
                    🔒 Read Full Privacy Policy
                  </a>
                </div>
              </div>
              <label className="compliance-checkbox-label">
                <input
                  type="checkbox"
                  checked={accepted.privacy}
                  onChange={(e) => {
                    const newChecked = e.target.checked;
                    setAccepted(prev => ({...prev, privacy: newChecked}));
                    // Auto-submit when checkbox is checked
                    if (newChecked && !loading) {
                      handleAcceptPrivacy();
                    }
                  }}
                  disabled={loading}
                />
                <span className="checkbox-text">
                  I have read and accept the updated Privacy Policy
                </span>
              </label>
              {loading && <div style={{marginTop: '0.5rem', color: '#666', fontSize: '0.9rem'}}>Processing...</div>}
              {accepted.privacy && !loading && (
                <div className="accepted-badge">✓ Accepted</div>
              )}
            </div>
          )}
        </div>

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
    </div>
  );
}

export default ComplianceUpdateModal;
