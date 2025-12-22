import React, { useState, useCallback, useEffect } from 'react';
import AlertMessage from './verification/AlertMessage';
import VerificationForm from './verification/VerificationForm';
import VerificationCodeInput from './verification/VerificationCodeInput';
import { useVerificationMethods } from './verification/hooks/useVerificationMethods';
import { useVerificationAPI } from './verification/hooks/useVerificationAPI';
import { useVerificationFlow } from './verification/hooks/useVerificationFlow';

/**
 * VerificationAndTwoFATab - Combined tab for verification methods + 2FA
 * 
 * Layout:
 * 1. 2FA Status at top with Change 2FA button on right
 * 2. Verification methods listed compactly (one per line)
 * 3. Edit button below 2FA section
 * 
 * Compact design - all content fits on one screen
 */
export default function VerificationAndTwoFATab({ userId, token, apiUrl, userEmail }) {
  // Verification methods state
  const { methods, loading, error: loadError, reload } = useVerificationMethods(userId, token, apiUrl);
  const { saving, error: apiError, setError, savePhone, saveEmail, verifyCode } = useVerificationAPI(userId, token, apiUrl);
  const flow = useVerificationFlow(methods);

  // 2FA state
  const [twoFASettings, setTwoFASettings] = useState(null);
  const [twoFALoading, setTwoFALoading] = useState(true);
  const [twoFAEditMode, setTwoFAEditMode] = useState(false);
  const [twoFASaving, setTwoFASaving] = useState(false);
  const [twoFAError, setTwoFAError] = useState(null);
  const [twoFASuccess, setTwoFASuccess] = useState(null);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFAMethod, setTwoFAMethod] = useState('email');

  const error = loadError || apiError || twoFAError;

  // Load 2FA settings
  const load2FASettings = useCallback(async () => {
    try {
      setTwoFALoading(true);
      const response = await fetch(`${apiUrl}/security/2fa-settings/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setTwoFASettings(data.settings);
        setTwoFAEnabled(data.settings.enabled);
        setTwoFAMethod(data.settings.method || 'email');
      }
    } catch (err) {
      console.error('[2FA] Error loading settings:', err);
      setTwoFAError(err.message);
    } finally {
      setTwoFALoading(false);
    }
  }, [apiUrl, userId, token]);

  useEffect(() => {
    load2FASettings();
  }, [load2FASettings]);

  const handleSaveVerificationMethods = async () => {
    try {
      setError(null);

      if (flow.hasPhoneChanged()) {
        const result = await savePhone(flow.phoneNumber, flow.recoveryPhone);
        if (!result.success) return;
        flow.enterVerificationMode('phone');
        return;
      }

      if (flow.hasEmailChanged()) {
        const result = await saveEmail(flow.recoveryEmail);
        if (!result.success) return;
        flow.enterVerificationMode('email');
        return;
      }

      flow.showSuccessMessage('Verification methods updated');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleVerifyCode = async () => {
    const result = await verifyCode(flow.verificationCode, flow.verificationType);
    if (result.success) {
      flow.completeVerification();
      reload();
    }
  };

  const handle2FASave = async () => {
    try {
      setTwoFASaving(true);
      setTwoFAError(null);

      const response = await fetch(`${apiUrl}/security/2fa-settings/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled: twoFAEnabled, method: twoFAMethod })
      });

      if (response.ok) {
        const data = await response.json();
        setTwoFASettings(data.settings);
        setTwoFASuccess(data.message || '2FA settings updated');
        setTwoFAEditMode(false);
        setTimeout(() => setTwoFASuccess(''), 3000);
      } else {
        const err = await response.json();
        setTwoFAError(err.error || 'Failed to save settings');
      }
    } catch (err) {
      setTwoFAError(err.message);
    } finally {
      setTwoFASaving(false);
    }
  };

  // Check if verification methods are ready for 2FA
  const hasVerificationMethods = methods?.phoneVerified || methods?.recoveryEmailVerified;

  if (loading || twoFALoading) {
    return <div style={{ textAlign: 'center', padding: '1rem' }}>Loading...</div>;
  }

  return (
    <div style={{ fontSize: '13px' }}>
      {/* Error/Success Messages */}
      <AlertMessage type="error" message={error} />
      <AlertMessage type="success" message={flow.success || twoFASuccess} />

      {/* SECTION 1: 2FA Status at Top (with button on right) */}
      <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: twoFAEnabled ? '#e8f5e9' : '#fff3e0', borderRadius: '6px', border: `1px solid ${twoFAEnabled ? '#4caf50' : '#ff9800'}` }}>
        {/* Header with status and button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: '0.25rem', fontSize: '15px' }}>🔐 Two-Factor Authentication</h3>
            <p style={{ margin: 0, fontSize: '12px', color: twoFAEnabled ? '#2e7d32' : '#f57f17' }}>
              <strong>Status:</strong> {twoFAEnabled ? '✓ Enabled' : '⚠️ Disabled'}
            </p>
          </div>
          {!twoFAEditMode ? (
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
              ⚙️ Change 2FA
            </button>
          ) : null}
        </div>

        {/* Method line */}
        {twoFAEnabled && !twoFAEditMode && (
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '12px', color: '#333' }}>
            <strong>Method:</strong> {twoFAMethod === 'email' ? '📧 Email' : '📱 SMS'}
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
              <span>Enable Two-Factor Authentication</span>
            </label>

            {twoFAEnabled && (
              <div style={{ marginBottom: '0.75rem', marginLeft: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '12px' }}>
                  Method
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
                    <span>📧 Email</span>
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
                    <span>📱 SMS</span>
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
                Save
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
                Cancel
              </button>
            </div>
          </div>
        )}

        {!hasVerificationMethods && !twoFAEnabled && (
          <p style={{ margin: '0.75rem 0 0 0', fontSize: '12px', color: '#f57f17' }}>
            ⚠️ Add phone or email below to enable 2FA
          </p>
        )}
      </div>

      {/* SECTION 2: Verification Methods (Compact one-line format) */}
      <div style={{ padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '15px' }}>📋 Verification Methods</h3>
          {!flow.editMode && !flow.showVerification && (
            <button
              onClick={flow.enterEditMode}
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
              ✏️ Edit
            </button>
          )}
        </div>

        {!flow.editMode && !flow.showVerification && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {/* Primary Email */}
            <div style={{ fontSize: '12px', padding: '0.4rem 0', borderBottom: '1px solid #eee' }}>
              <span><strong>Primary Email:</strong> {userEmail}, verified ✓</span>
            </div>

            {/* Phone Number */}
            <div style={{ fontSize: '12px', padding: '0.4rem 0', borderBottom: '1px solid #eee' }}>
              <span>
                <strong>Phone Number:</strong> {flow.phoneNumber || 'Not set'}{flow.phoneNumber && methods?.phoneVerified ? ', verified ✓' : methods?.phoneVerified ? ', verified ✓' : ''}
              </span>
            </div>

            {/* Recovery Email */}
            <div style={{ fontSize: '12px', padding: '0.4rem 0', borderBottom: '1px solid #eee' }}>
              <span>
                <strong>Recovery Email:</strong> {flow.recoveryEmail || 'Not set'}{flow.recoveryEmail && methods?.recoveryEmailVerified ? ', verified ✓' : ''}
              </span>
            </div>

            {/* Recovery Phone */}
            <div style={{ fontSize: '12px', padding: '0.4rem 0' }}>
              <span>
                <strong>Recovery Phone:</strong> {flow.recoveryPhone || 'Not set'}{flow.recoveryPhone && methods?.recoveryPhoneVerified ? ', verified ✓' : ''}
              </span>
            </div>
          </div>
        )}

        {flow.editMode && !flow.showVerification && (
          <>
            <VerificationForm
              phoneNumber={flow.phoneNumber}
              setPhoneNumber={flow.setPhoneNumber}
              recoveryPhone={flow.recoveryPhone}
              setRecoveryPhone={flow.setRecoveryPhone}
              recoveryEmail={flow.recoveryEmail}
              setRecoveryEmail={flow.setRecoveryEmail}
              saving={saving}
              onSave={handleSaveVerificationMethods}
              onCancel={flow.exitEditMode}
            />
          </>
        )}

        {flow.showVerification && (
          <>
            <VerificationCodeInput
              code={flow.verificationCode}
              setCode={flow.setVerificationCode}
              verificationType={flow.verificationType}
              contactValue={flow.verificationType === 'phone' ? flow.phoneNumber : flow.recoveryEmail}
              saving={saving}
              onVerify={handleVerifyCode}
              onBack={flow.exitVerificationMode}
            />
          </>
        )}
      </div>
    </div>
  );
}
