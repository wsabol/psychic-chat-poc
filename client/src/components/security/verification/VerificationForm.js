import React, { useState } from 'react';
import { useTranslation } from '../../../context/TranslationContext';
import SMSConsentModal from './SMSConsentModal';

/**
 * VerificationForm - Edit mode form for updating verification methods
 * Now includes SMS consent modal for phone number changes
 */
export default function VerificationForm({
  phoneNumber,
  setPhoneNumber,
  recoveryPhone,
  setRecoveryPhone,
  recoveryEmail,
  setRecoveryEmail,
  saving,
  onSave,
  onCancel
}) {
  const { t } = useTranslation();
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [pendingPhoneNumber, setPendingPhoneNumber] = useState('');
  const [smsConsentGiven, setSmsConsentGiven] = useState(false);

  const handlePhoneChange = (value) => {
    setPhoneNumber(value);
    // Reset consent if phone number changes after consent was given
    if (smsConsentGiven && value !== pendingPhoneNumber) {
      setSmsConsentGiven(false);
    }
  };

  const handleSaveClick = () => {
    // If phone number is being added/changed and consent not yet given, show modal
    if (phoneNumber && phoneNumber.trim() !== '' && !smsConsentGiven) {
      setPendingPhoneNumber(phoneNumber);
      setShowConsentModal(true);
      return;
    }
    // Otherwise proceed with save
    onSave();
  };

  const handleConsentAccept = () => {
    setSmsConsentGiven(true);
    setShowConsentModal(false);
    // Proceed with save now that consent is given
    onSave();
  };

  const handleConsentCancel = () => {
    setShowConsentModal(false);
  };

  return (
    <>
      {/* SMS Consent Modal */}
      <SMSConsentModal
        isOpen={showConsentModal}
        onAccept={handleConsentAccept}
        onCancel={handleConsentCancel}
      />

      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        border: '1px solid #e0e0e0'
      }}>
        {/* Phone Number Field */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            {t('security.verificationForm.phoneNumberLabel')}
          </label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => handlePhoneChange(e.target.value)}
          placeholder={t('security.verificationForm.phonePlaceholder')}
          disabled={saving}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '4px',
            border: '1px solid #ccc',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Recovery Phone Field */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
          {t('security.verificationForm.recoveryPhoneLabel')}
        </label>
        <input
          type="tel"
          value={recoveryPhone}
          onChange={(e) => setRecoveryPhone(e.target.value)}
          placeholder={t('security.verificationForm.recoveryPhonePlaceholder')}
          disabled={saving}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '4px',
            border: '1px solid #ccc',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Recovery Email Field */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
          {t('security.verificationForm.recoveryEmailLabel')}
        </label>
        <input
          type="email"
          value={recoveryEmail}
          onChange={(e) => setRecoveryEmail(e.target.value)}
          placeholder={t('security.verificationForm.recoveryEmailPlaceholder')}
          disabled={saving}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '4px',
            border: '1px solid #ccc',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          onClick={handleSaveClick}
          disabled={saving}
          style={{
            flex: 1,
            padding: '0.75rem',
            backgroundColor: '#7c63d8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          {saving ? t('security.verificationForm.saving') : t('security.verificationForm.saveAndVerify')}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          style={{
            flex: 1,
            padding: '0.75rem',
            backgroundColor: '#f5f5f5',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '14px'
          }}
        >
          {t('security.verificationForm.cancel')}
        </button>
      </div>
      </div>
    </>
  );
}
