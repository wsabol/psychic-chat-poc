import React from 'react';
import { useTranslation } from '../../../context/TranslationContext';
import VerificationForm from './VerificationForm';
import VerificationCodeInput from './VerificationCodeInput';

/**
 * VerificationMethodsSection - Render verification methods UI
 * Displays phone, recovery email, recovery phone in a compact format
 */
export function VerificationMethodsSection({
  userEmail,
  flow,
  methods,
  saving,
  onSaveVerificationMethods,
  onVerifyCode,
  onEnterEditMode
}) {
  const { t } = useTranslation();

  return (
    <div style={{ padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '15px' }}>{t('security.verification.heading')}</h3>
        {!flow.editMode && !flow.showVerification && (
          <button
            onClick={onEnterEditMode}
            style={{
              padding: '0.4rem 0.8rem',
              backgroundColor: '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 'bold'
            }}
          >
            {t('security.verification.editButton')}
          </button>
        )}
      </div>

      {/* Display Mode */}
      {!flow.editMode && !flow.showVerification && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {/* Primary Email */}
          <div style={{ fontSize: '12px', padding: '0.4rem 0', borderBottom: '1px solid #eee' }}>
            <span><strong>{t('security.verification.primaryEmailLabel')}</strong> {userEmail}, {t('security.verification.verified')}</span>
          </div>

          {/* Phone Number */}
          <div style={{ fontSize: '12px', padding: '0.4rem 0', borderBottom: '1px solid #eee' }}>
            <span>
              <strong>{t('security.verification.phoneNumberLabel')}</strong> {flow.phoneNumber || t('security.verification.notSet')}
              {flow.phoneNumber && methods?.phoneVerified && `, ${t('security.verification.verified')}`}
            </span>
          </div>

          {/* Recovery Email */}
          <div style={{
            fontSize: '12px',
            padding: '0.4rem 0',
            borderBottom: '1px solid #eee',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>
              <strong>{t('security.verification.recoveryEmailLabel')}</strong> {flow.recoveryEmail || t('security.verification.notSet')}
            </span>
            {flow.recoveryEmail && methods?.recoveryEmailVerified && (
              <span style={{
                backgroundColor: '#e8f5e9',
                color: '#2e7d32',
                padding: '0.2rem 0.5rem',
                borderRadius: '3px',
                fontSize: '11px',
                fontWeight: '600'
              }}>
                {t('security.verification.verifiedBadge')}
              </span>
            )}
          </div>

          {/* Recovery Phone */}
          <div style={{ fontSize: '12px', padding: '0.4rem 0' }}>
            <span>
              <strong>{t('security.verification.recoveryPhoneLabel')}</strong> {flow.recoveryPhone || t('security.verification.notSet')}
              {flow.recoveryPhone && methods?.recoveryPhoneVerified && `, ${t('security.verification.verified')}`}
            </span>
          </div>
        </div>
      )}

      {/* Edit Mode */}
      {flow.editMode && !flow.showVerification && (
        <VerificationForm
          phoneNumber={flow.phoneNumber}
          setPhoneNumber={flow.setPhoneNumber}
          recoveryPhone={flow.recoveryPhone}
          setRecoveryPhone={flow.setRecoveryPhone}
          recoveryEmail={flow.recoveryEmail}
          setRecoveryEmail={flow.setRecoveryEmail}
          saving={saving}
          onSave={onSaveVerificationMethods}
          onCancel={flow.exitEditMode}
        />
      )}

      {/* Verification Code Input Mode */}
      {flow.showVerification && (
        <VerificationCodeInput
          code={flow.verificationCode}
          setCode={flow.setVerificationCode}
          verificationType={flow.verificationType}
          contactValue={flow.verificationType === 'phone' ? flow.phoneNumber : flow.recoveryEmail}
          saving={saving}
          onVerify={onVerifyCode}
          onBack={flow.exitVerificationMode}
        />
      )}
    </div>
  );
}
