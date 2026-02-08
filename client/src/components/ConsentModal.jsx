import React, { useState } from 'react';
import { DocumentViewer } from './help/DocumentViewer.jsx';
import './ConsentModal.css';

export function ConsentModal({ userId, token, onConsentAccepted }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [termsRead, setTermsRead] = useState(false);
  const [privacyRead, setPrivacyRead] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(null); // 'terms' or 'privacy' or null

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
            <div className="consent-section-header">
              <h3>Terms of Service</h3>
              <button
                type="button"
                onClick={() => setViewingDocument('terms')}
                className="btn-read-document"
              >
                📖 Read Terms
              </button>
            </div>
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
            <div className="consent-section-header">
              <h3>Privacy Policy</h3>
              <button
                type="button"
                onClick={() => setViewingDocument('privacy')}
                className="btn-read-document"
              >
                🔒 Read Privacy Policy
              </button>
            </div>
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
            title={viewingDocument === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
            docType={viewingDocument}
            onBack={() => setViewingDocument(null)}
          />
        </div>
      )}
    </div>
  );
}

export default ConsentModal;

