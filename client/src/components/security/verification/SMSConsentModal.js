import React, { useState } from 'react';
import { DocumentViewer } from '../../help/DocumentViewer';

/**
 * SMSConsentModal - TCPA-compliant SMS consent for 2FA phone verification.
 * Displayed before collecting a phone number and before sending any SMS.
 * Requires explicit opt-in checkbox before proceeding.
 *
 * Disclosures required by TCPA / CTIA guidelines:
 *  - Brand name (Starship Psychics) — main header
 *  - Purpose (login/verification only)
 *  - Message frequency (1 msg/login)
 *  - Msg & data rates disclosure
 *  - STOP keyword to opt out
 *  - HELP keyword for support info
 *  - In-app links to Terms & Conditions and Privacy Policy (via DocumentViewer)
 */
export default function SMSConsentModal({ isOpen, onAccept, onCancel }) {
  const [consentChecked, setConsentChecked] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(null); // 'terms' | 'privacy' | null

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
        backgroundColor: '#2a2a2a',
        borderRadius: '12px',
        padding: '30px',
        maxWidth: '520px',
        width: '100%',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        color: '#fff'
      }}>

        {/* ── Main brand header ── */}
        <h1 style={{
          margin: '0 0 8px 0',
          fontSize: '26px',
          fontWeight: '800',
          color: '#ffffff',
          textAlign: 'center',
          letterSpacing: '0.5px'
        }}>
          Starship Psychics
        </h1>

        {/* ── Sub-header ── */}
        <h2 style={{
          margin: '0 0 24px 0',
          fontSize: '18px',
          fontWeight: '600',
          color: '#e0e0e0',
          textAlign: 'center'
        }}>
          Enable Two-Factor Authentication via SMS
        </h2>

        {/* ── Conditions disclosure ── */}
        <div style={{
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <p style={{
            margin: '0 0 16px 0',
            lineHeight: '1.7',
            color: '#e0e0e0',
            fontSize: '15px'
          }}>
            By providing your phone number, you consent to receive SMS verification
            codes from <strong style={{ color: '#ffffff' }}>Starship Psychics</strong> for login and
            authentication purposes only.
          </p>

          <ul style={{
            margin: '0 0 20px 0',
            paddingLeft: '24px',
            color: '#c8c8c8',
            fontSize: '14px',
            lineHeight: '2.2'
          }}>
            <li>One message per login. Codes sent for login/verification only.</li>
            <li>Message and data rates may apply.</li>
            <li>Reply <strong style={{ color: '#ffffff' }}>STOP</strong> to opt-out anytime.</li>
            <li>Reply <strong style={{ color: '#ffffff' }}>HELP</strong> for support.</li>
          </ul>

          {/* ── In-app legal links ── */}
          <div style={{ fontSize: '14px', marginBottom: '4px' }}>
            <button
              type="button"
              onClick={() => setViewingDocument('terms')}
              style={{
                background: 'none',
                border: 'none',
                color: '#6b9fff',
                textDecoration: 'underline',
                fontWeight: '600',
                cursor: 'pointer',
                padding: 0,
                fontSize: '14px'
              }}
            >
              Terms &amp; Conditions
            </button>
            <span style={{ color: '#c8c8c8', margin: '0 8px' }}>|</span>
            <button
              type="button"
              onClick={() => setViewingDocument('privacy')}
              style={{
                background: 'none',
                border: 'none',
                color: '#6b9fff',
                textDecoration: 'underline',
                fontWeight: '600',
                cursor: 'pointer',
                padding: 0,
                fontSize: '14px'
              }}
            >
              Privacy Policy
            </button>
          </div>
        </div>

        {/* ── Consent checkbox ── */}
        <label style={{
          display: 'flex',
          alignItems: 'flex-start',
          cursor: 'pointer',
          padding: '15px',
          backgroundColor: consentChecked ? 'rgba(75, 110, 245, 0.15)' : 'rgba(255,255,255,0.05)',
          borderRadius: '8px',
          border: `2px solid ${consentChecked ? '#4c6ef5' : '#555'}`,
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
              accentColor: '#4c6ef5',
              flexShrink: 0
            }}
          />
          <span style={{
            fontSize: '14px',
            color: '#e0e0e0',
            lineHeight: '1.6'
          }}>
            I consent to receive SMS verification codes from{' '}
            <strong style={{ color: '#ffffff' }}>Starship Psychics</strong>. I
            understand that message and data rates may apply, and I can reply STOP
            at any time to opt out.
          </span>
        </label>

        {/* ── Action buttons ── */}
        <div style={{
          display: 'flex',
          gap: '12px'
        }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: 'transparent',
              border: '2px solid #4c6ef5',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '600',
              color: '#fff',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(76, 110, 245, 0.15)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            Cancel
          </button>
          <button
            onClick={handleAccept}
            disabled={!consentChecked}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: consentChecked ? '#4c6ef5' : 'rgba(76, 110, 245, 0.3)',
              border: '2px solid #4c6ef5',
              borderRadius: '6px',
              cursor: consentChecked ? 'pointer' : 'not-allowed',
              fontSize: '15px',
              fontWeight: '600',
              color: 'white',
              transition: 'all 0.2s ease',
              opacity: consentChecked ? 1 : 0.5
            }}
            onMouseOver={(e) => {
              if (consentChecked) e.currentTarget.style.backgroundColor = '#364fc7';
            }}
            onMouseOut={(e) => {
              if (consentChecked) e.currentTarget.style.backgroundColor = '#4c6ef5';
            }}
          >
            Continue
          </button>
        </div>
      </div>

      {/* ── In-app Document Viewer overlay ── */}
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
