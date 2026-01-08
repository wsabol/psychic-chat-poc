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
    alert('Button clicked!');
    setLoading(true);
    setError('');

    try {
      alert('userId: ' + userId);
      alert('token: ' + (token ? 'exists' : 'MISSING!'));
      
      const apiUrl = `${process.env.REACT_APP_API_URL}/auth/consent/terms-acceptance`;
      alert('API URL: ' + apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          terms_accepted: false,
          privacy_accepted: true
        })
      });

      alert('Response status: ' + response.status);
      const data = await response.json();
      alert('Response: ' + JSON.stringify(data));

      if (!response.ok) {
        throw new Error(data.error || 'Failed');
      }

      alert('Calling onConsentUpdated!');
      onConsentUpdated();
    } catch (err) {
      alert('ERROR: ' + err.message);
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
          <h2>⚖️ Privacy Policy Update</h2>
        </div>

        {error && <div className="compliance-error-message">{error}</div>}

        <div className="compliance-content">
          {privacyRequired && (
            <div className="compliance-section">
              <h3>Privacy Policy {compliance.privacyVersion?.current}</h3>
              <p>Our Privacy Policy has been updated.</p>
              <a 
                href="/privacy.md" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                🔒 Read Full Privacy Policy
              </a>
              
              <label>
                <input
                  type="checkbox"
                  checked={accepted.privacy}
                  onChange={(e) => setAccepted(prev => ({...prev, privacy: e.target.checked}))}
                  disabled={loading}
                />
                <span>I have read and accept the updated Privacy Policy</span>
              </label>
              
              <button 
                onClick={handleAcceptPrivacy}
                disabled={loading || !accepted.privacy}
              >
                {loading ? 'Processing...' : 'Accept Privacy Policy'}
              </button>
              
              {accepted.privacy && !loading && (
                <div>✓ Accepted</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ComplianceUpdateModal;
