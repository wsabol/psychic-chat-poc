import React, { useState } from 'react';

/**
 * SMSConsentModal - AWS-compliant SMS consent for 2FA phone verification
 * Shows before collecting phone number, requires explicit consent with:
 * - Brand name (Starship Psychics)
 * - Purpose (authentication)
 * - STOP/HELP keywords
 * - Rates disclosure
 */
export default function SMSConsentModal({ isOpen, onAccept, onCancel }) {
  const [consentChecked, setConsentChecked] = useState(false);

  if (!isOpen) return null;

  const handleAccept = () => {
    if (consentChecked) {
      onAccept();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '30px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
      }}>
        <h2 style={{
          margin: '0 0 20px 0',
          fontSize: '22px',
          color: '#333',
          textAlign: 'center'
        }}>
          Enable Two-Factor Authentication
        </h2>

        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #e9ecef'
        }}>
          <p style={{
            margin: '0 0 15px 0',
            lineHeight: '1.6',
            color: '#495057',
            fontSize: '14px'
          }}>
            By providing your phone number, you consent to receive SMS verification codes from <strong>Starship Psychics</strong> for authentication purposes only.
          </p>

          <ul style={{
            margin: '0',
            paddingLeft: '20px',
            color: '#6c757d',
            fontSize: '13px',
            lineHeight: '1.8'
          }}>
            <li>Codes sent only at login</li>
            <li>Message & data rates may apply</li>
            <li>Reply STOP to opt out anytime</li>
            <li>Reply HELP for assistance</li>
          </ul>
        </div>

        <label style={{
          display: 'flex',
          alignItems: 'flex-start',
          cursor: 'pointer',
          padding: '15px',
          backgroundColor: consentChecked ? '#e7f5ff' : '#f8f9fa',
          borderRadius: '8px',
          border: `2px solid ${consentChecked ? '#4c6ef5' : '#dee2e6'}`,
          marginBottom: '25px',
          transition: 'all 0.2s ease'
        }}>
          <input
            type="checkbox"
            checked={consentChecked}
            onChange={(e) => setConsentChecked(e.target.checked)}
            style={{
              width: '20px',
              height: '20px',
              marginRight: '12px',
              marginTop: '2px',
              cursor: 'pointer',
              accentColor: '#4c6ef5'
            }}
          />
          <span style={{
            fontSize: '14px',
            color: '#495057',
            lineHeight: '1.5'
          }}>
            I consent to receive SMS from <strong>Starship Psychics</strong>
          </span>
        </label>

        <div style={{
          display: 'flex',
          gap: '12px'
        }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '600',
              color: '#495057',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#e9ecef'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#f8f9fa'}
          >
            Cancel
          </button>
          <button
            onClick={handleAccept}
            disabled={!consentChecked}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: consentChecked ? '#4c6ef5' : '#ced4da',
              border: 'none',
              borderRadius: '6px',
              cursor: consentChecked ? 'pointer' : 'not-allowed',
              fontSize: '15px',
              fontWeight: '600',
              color: 'white',
              transition: 'all 0.2s ease',
              opacity: consentChecked ? 1 : 0.6
            }}
            onMouseOver={(e) => {
              if (consentChecked) e.target.style.backgroundColor = '#364fc7';
            }}
            onMouseOut={(e) => {
              if (consentChecked) e.target.style.backgroundColor = '#4c6ef5';
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
