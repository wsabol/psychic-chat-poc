import React from 'react';
import { useTranslation } from '../../../context/TranslationContext';

/**
 * TwoFASection - Render 2FA settings UI
 * Handles display and edit mode for two-factor authentication
 */
export function TwoFASection({
  twoFAEnabled,
  setTwoFAEnabled,
  twoFAMethod,
  setTwoFAMethod,
  twoFAEditMode,
  setTwoFAEditMode,
  twoFASaving,
  handle2FASave,
  twoFASettings,
  hasVerificationMethods
}) {
  const { t } = useTranslation();

  return (
    <div style={{
      marginBottom: '1.5rem',
      padding: '1rem',
      backgroundColor: twoFAEnabled ? '#e8f5e9' : '#fff3e0',
      borderRadius: '6px',
      border: `1px solid ${twoFAEnabled ? '#4caf50' : '#ff9800'}`
    }}>
      {/* Header with status and button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div>
          <h3 style={{ marginTop: 0, marginBottom: '0.25rem', fontSize: '15px' }}>
            {t('security.twoFA.heading')}
          </h3>
          <p style={{ margin: 0, fontSize: '11px', color: '#666', marginBottom: '0.5rem' }}>
            Two-Factor Authentication is bypassed on trusted devices
          </p>
          <p style={{ margin: 0, fontSize: '12px', color: twoFAEnabled ? '#2e7d32' : '#f57f17' }}>
            <strong>{t('security.twoFA.statusLabel')}</strong> {twoFAEnabled ? t('security.twoFA.enabled') : t('security.twoFA.disabled')}
          </p>
        </div>
        {!twoFAEditMode && (
          <button
            onClick={() => setTwoFAEditMode(true)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#7c63d8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap'
            }}
          >
            {t('security.twoFA.changeButton')}
          </button>
        )}
      </div>

      {/* Method line */}
      {twoFAEnabled && !twoFAEditMode && (
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '12px', color: '#333' }}>
          <strong>{t('security.twoFA.methodLabel')}</strong> {twoFAMethod === 'email' ? t('security.twoFA.methodEmail') : t('security.twoFA.methodSMS')}
        </p>
      )}

      {/* 2FA Edit Mode */}
      {twoFAEditMode && (
        <div style={{ marginTop: '1rem' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            fontSize: '12px',
            marginBottom: '0.75rem'
          }}>
            <input
              type="checkbox"
              checked={twoFAEnabled}
              onChange={(e) => setTwoFAEnabled(e.target.checked)}
              disabled={twoFASaving}
              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
            />
            <span>{t('security.twoFA.enableCheckbox')}</span>
          </label>

          {twoFAEnabled && (
            <div style={{ marginBottom: '0.75rem', marginLeft: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '12px' }}>
                {t('security.twoFA.methodSectionLabel')}
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}>
                  <input
                    type="radio"
                    value="email"
                    checked={twoFAMethod === 'email'}
                    onChange={(e) => setTwoFAMethod(e.target.value)}
                    disabled={twoFASaving}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  <span>{t('security.twoFA.methodEmail')}</span>
                </label>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}>
                  <input
                    type="radio"
                    value="sms"
                    checked={twoFAMethod === 'sms'}
                    onChange={(e) => setTwoFAMethod(e.target.value)}
                    disabled={twoFASaving}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  <span>{t('security.twoFA.methodSMS')}</span>
                </label>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button
              onClick={handle2FASave}
              disabled={twoFASaving}
              style={{
                flex: 1,
                padding: '0.5rem',
                backgroundColor: '#7c63d8',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: twoFASaving ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            >
              {t('security.twoFA.save')}
            </button>
            <button
              onClick={() => {
                setTwoFAEditMode(false);
                setTwoFAEnabled(twoFASettings.enabled);
                setTwoFAMethod(twoFASettings.method || 'email');
              }}
              disabled={twoFASaving}
              style={{
                flex: 1,
                padding: '0.5rem',
                backgroundColor: '#f5f5f5',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: twoFASaving ? 'not-allowed' : 'pointer',
                fontSize: '12px'
              }}
            >
              {t('security.twoFA.cancel')}
            </button>
          </div>
        </div>
      )}

      {!hasVerificationMethods && !twoFAEnabled && (
        <p style={{ margin: '0.75rem 0 0 0', fontSize: '12px', color: '#f57f17' }}>
          {t('security.twoFA.warningNoVerification')}
        </p>
      )}
    </div>
  );
}
