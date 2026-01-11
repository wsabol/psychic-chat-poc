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
      const apiUrl = `${process.env.REACT_APP_API_URL}/auth/consent/terms-acceptance`;
      const payload = {
        userId,
        terms_accepted: false,
        privacy_accepted: true
      };
      
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to record consent');
      }

      onConsentUpdated();
    } catch (err) {
      console.error('[DEBUG] CATCH ERROR:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const privacyRequired = compliance.privacyVersion?.requiresReacceptance || compliance.requiresPrivacyUpdate;

  return (
    <div className="compliance-modal-overlay">
      <div className="compliance-modal">
        <div className="compliance-header">
          <h2>⚖️ Important: Privacy Policy Update</h2>
        </div>

        {error && <div className="compliance-error-message">{error}</div>}

        <div className="compliance-content">
          {privacyRequired && (
            <div className="compliance-section">
              <div className="section-header">
                <h3>Privacy Policy {compliance.privacyVersion?.current}</h3>
              </div>
              <div className="compliance-text">
                <p>Our Privacy Policy has been updated with new data protection measures.</p>
                <a 
                  href="/privacy.md" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-link"
                >
                  🔒 Read Full Privacy Policy
                </a>
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

        <div className="compliance-help">
          <p>
            <strong>Why?</strong> We've updated our Privacy Policy to better protect your data.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ComplianceUpdateModal;

