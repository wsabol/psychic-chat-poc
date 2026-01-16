import React, { useState } from 'react';
import { logErrorFromCatch } from '../shared/errorLogger.js';
import './ConsentModal.css';

export function ConsentModal({ userId, token, onConsentAccepted }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [termsRead, setTermsRead] = useState(false);
  const [privacyRead, setPrivacyRead] = useState(false);

  const handleAccept = async () => {
    if (!termsRead || !privacyRead) {
      setError('You must accept both terms and privacy policy');
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
      logErrorFromCatch('[CONSENT] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="consent-modal-overlay">
      <div className="consent-modal">
        <h2>Terms & Privacy Policy</h2>
        
        {error && <div className="consent-error-message">{error}</div>}

        <div className="consent-content">
          <div className="consent-section">
            <h3>Terms of Service</h3>
            <div className="consent-text">
              <p>By using this application, you agree to our Terms of Service and all applicable laws and regulations. You agree that you are responsible for compliance with any local laws in your jurisdiction.</p>
              <label>
                <input 
                  type="checkbox" 
                  checked={termsRead}
                  onChange={(e) => setTermsRead(e.target.checked)}
                  disabled={loading}
                />
                <span>I accept the Terms of Service</span>
              </label>
            </div>
          </div>

          <div className="consent-section">
            <h3>Privacy Policy</h3>
            <div className="consent-text">
              <p>We respect your privacy. Our Privacy Policy explains how we collect, use, disclose, and safeguard your personal information. Please review our Privacy Policy to understand our privacy practices.</p>
              <label>
                <input 
                  type="checkbox" 
                  checked={privacyRead}
                  onChange={(e) => setPrivacyRead(e.target.checked)}
                  disabled={loading}
                />
                <span>I accept the Privacy Policy</span>
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
            {loading ? 'Accepting...' : 'Accept & Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConsentModal;

