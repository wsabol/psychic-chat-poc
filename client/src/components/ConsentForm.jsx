import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

          {/* Legal Links */}
          <div className="legal-links">
            <p>
              By proceeding, you agree to our{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer">
                Terms of Service
              </a>
              {' '}and{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </a>
            </p>
            <p className="ip-notice">
              Your IP address and device information are recorded as proof of consent 
              for compliance purposes.
            </p>
          </div>

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
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Saving...' : mode === 'registration' ? 'Continue' : 'Save Preferences'}
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
    </div>
  );
};

export default ConsentForm;
