import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DocumentViewer } from './help/DocumentViewer.jsx';
import '../styles/ConsentForm.css';

/**
 * ConsentForm Component
 * Displays consent checkboxes for data processing
 * Used during registration and in account settings
 * 
 * Props:
 *   - onSubmit: (consents) => Promise<void>
 *   - onCancel: () => void
 *   - initialConsents: { astrology, health_data, chat_analysis }
 *   - mode: 'registration' | 'settings' (for different UI modes)
 */
export const ConsentForm = ({ 
  onSubmit, 
  onCancel,
  initialConsents = { astrology: false, health_data: false, chat_analysis: false },
  mode = 'registration'
}) => {
  const [consents, setConsents] = useState({
    consent_astrology: initialConsents.astrology || false,
    consent_health_data: initialConsents.health_data || false,
    consent_chat_analysis: initialConsents.chat_analysis || false
  });

  // Separate state for required legal acceptances
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewingDocument, setViewingDocument] = useState(null); // 'terms' or 'privacy' or null

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setConsents(prev => ({
      ...prev,
      [name]: checked
    }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate that Terms and Privacy are accepted in registration mode
    if (mode === 'registration' && (!termsAccepted || !privacyAccepted)) {
      setError('You must accept both the Terms of Service and Privacy Policy to continue.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit(consents);
    } catch (err) {
      setError(err.message || 'Failed to save consent preferences');
      setLoading(false);
    }
  };

  return (
    <div className="consent-form-container">
      <div className="consent-form">
        <h2>
          {mode === 'registration' 
            ? 'Privacy & Consent' 
            : 'Manage Your Privacy Preferences'}
        </h2>

        {mode === 'registration' && (
          <p className="intro-text">
            We're committed to transparency about data processing. 
            Please review and consent to how we use your information.
          </p>
        )}

        <form onSubmit={handleSubmit}>
          {/* Astrology Consent */}
          <div className="consent-item">
            <label className="consent-checkbox-label">
              <input
                type="checkbox"
                name="consent_astrology"
                checked={consents.consent_astrology}
                onChange={handleCheckboxChange}
                disabled={loading}
              />
              <span className="checkbox-text">
                <strong>Astrology Readings</strong>
                <p className="consent-description">
                  I consent to collection and processing of my astrology-related data 
                  (birth information, readings, preferences) to provide personalized 
                  astrology services.
                </p>
              </span>
            </label>
          </div>

          {/* Chat Analysis Consent */}
          <div className="consent-item">
            <label className="consent-checkbox-label">
              <input
                type="checkbox"
                name="consent_chat_analysis"
                checked={consents.consent_chat_analysis}
                onChange={handleCheckboxChange}
                disabled={loading}
              />
              <span className="checkbox-text">
                <strong>Chat Analysis & Improvements</strong>
                <p className="consent-description">
                  I consent to analysis of my chat messages to improve service quality, 
                  detect patterns, and enhance the user experience. Your data will be 
                  anonymized and encrypted.
                </p>
              </span>
            </label>
          </div>

          {/* Health Data Consent - SPECIAL WARNING */}
          <div className="consent-item">
            <label className="consent-checkbox-label health-warning">
              <input
                type="checkbox"
                name="consent_health_data"
                checked={consents.consent_health_data}
                onChange={handleCheckboxChange}
                disabled={loading}
              />
              <span className="checkbox-text">
                <strong>Health & Wellness Data ⚠️</strong>
                <p className="consent-description">
                  <strong className="warning">
                    IMPORTANT: This service DOES NOT provide medical or mental health advice.
                  </strong>
                  <br />
                  We will NOT discuss health conditions, mental health, medications, 
                  or medical treatments. For health concerns, please consult a healthcare professional.
                  <br />
                  This checkbox enables general wellness-related discussions only 
                  (e.g., self-care routines, stress management).
                </p>
              </span>
            </label>
          </div>

          {/* Required Legal Acceptances */}
          {mode === 'registration' && (
            <div className="legal-acceptance-section">
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#333' }}>
                Terms & Privacy Policy
              </h3>

              {/* Terms of Service Section */}
              <div className="legal-acceptance-item">
                <div className="legal-header">
                  <strong>Terms of Service</strong>
                  <button
                    type="button"
                    onClick={() => setViewingDocument('terms')}
                    className="view-document-btn"
                  >
                    📖 Read Terms
                  </button>
                </div>
                <p className="legal-description">
                  By using this application, you agree to our Terms of Service and all 
                  applicable laws and regulations. You agree that you are responsible for 
                  compliance with any local laws in your jurisdiction.
                </p>
                <label className="legal-checkbox-label">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => {
                      setTermsAccepted(e.target.checked);
                      setError(null);
                    }}
                    disabled={loading}
                  />
                  <span>I accept the Terms of Service</span>
                </label>
              </div>

              {/* Privacy Policy Section */}
              <div className="legal-acceptance-item">
                <div className="legal-header">
                  <strong>Privacy Policy</strong>
                  <button
                    type="button"
                    onClick={() => setViewingDocument('privacy')}
                    className="view-document-btn"
                  >
                    🔒 Read Privacy Policy
                  </button>
                </div>
                <p className="legal-description">
                  We respect your privacy. Our Privacy Policy explains how we collect, use, 
                  disclose, and safeguard your personal information. Please review our Privacy 
                  Policy to understand our privacy practices.
                </p>
                <label className="legal-checkbox-label">
                  <input
                    type="checkbox"
                    checked={privacyAccepted}
                    onChange={(e) => {
                      setPrivacyAccepted(e.target.checked);
                      setError(null);
                    }}
                    disabled={loading}
                  />
                  <span>I accept the Privacy Policy</span>
                </label>
              </div>

              <p className="ip-notice">
                Your IP address and device information are recorded as proof of consent 
                for compliance purposes.
              </p>
            </div>
          )}

          {/* Settings mode - just show links */}
          {mode === 'settings' && (
            <div className="legal-links">
              <p style={{ marginBottom: '1rem' }}>
                Review our legal documents:
              </p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setViewingDocument('terms')}
                  className="btn btn-link"
                  style={{ 
                    padding: '0.5rem 1rem',
                    backgroundColor: 'rgba(100, 150, 255, 0.2)',
                    border: '1px solid rgba(100, 150, 255, 0.4)',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    color: '#64B5F6'
                  }}
                >
                  📖 View Terms of Service
                </button>
                <button
                  type="button"
                  onClick={() => setViewingDocument('privacy')}
                  className="btn btn-link"
                  style={{ 
                    padding: '0.5rem 1rem',
                    backgroundColor: 'rgba(100, 150, 255, 0.2)',
                    border: '1px solid rgba(100, 150, 255, 0.4)',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    color: '#64B5F6'
                  }}
                >
                  🔒 View Privacy Policy
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="consent-actions">
            {mode === 'settings' && (
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading || (mode === 'registration' && (!termsAccepted || !privacyAccepted))}
              className="btn btn-primary"
            >
              {loading 
                ? 'Saving...' 
                : mode === 'registration' 
                  ? 'Accept & Continue' 
                  : 'Save Preferences'}
            </button>
          </div>

          {/* Registration-specific text */}
          {mode === 'registration' && (
            <p className="consent-optional">
              You can skip individual consents (uncheck items) and still use basic app features. 
              Some features may require specific consents.
            </p>
          )}
        </form>
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
    </div>
  );
};

export default ConsentForm;
