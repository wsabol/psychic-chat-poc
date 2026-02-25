import React, { useState, useEffect, useCallback } from 'react';
import AlertMessage from './verification/AlertMessage';
import { useVerificationMethods } from './verification/hooks/useVerificationMethods';
import { useVerificationAPI } from './verification/hooks/useVerificationAPI';
import { useVerificationFlow } from './verification/hooks/useVerificationFlow';
import { use2FASettings } from './verification/hooks/use2FASettings';
import { TwoFASection } from './verification/TwoFASection';
import { VerificationMethodsSection } from './verification/VerificationMethodsSection';
import { TrustCurrentDeviceSection } from './verification/TrustCurrentDeviceSection';
import { TrustedDevicesSection } from './verification/TrustedDevicesSection';
import SMSConsentModal from './verification/SMSConsentModal';
import { logErrorFromCatch } from '../../shared/errorLogger.js';

/**
 * VerificationAndTwoFATab - Orchestrator component
 *
 * Owns the single trusted-devices fetch so that TrustCurrentDeviceSection
 * and TrustedDevicesSection always show data from the exact same API call —
 * they cannot disagree about whether the current device is trusted.
 */
export default function VerificationAndTwoFATab({ userId, token, apiUrl, userEmail }) {
  // Verification methods
  const { methods, loading, error: loadError, reload } = useVerificationMethods(userId, token, apiUrl);
  const { saving, error: apiError, setError, savePhone, saveEmail, verifyCode } = useVerificationAPI(userId, token, apiUrl);
  const flow = useVerificationFlow(methods);

  // 2FA settings
  const twoFA = use2FASettings(userId, token, apiUrl);

  // ── Single source of truth for device list ──────────────────────────────
  const [devices, setDevices] = useState([]);
  const [isCurrentDeviceTrusted, setIsCurrentDeviceTrusted] = useState(false);
  const [devicesLoading, setDevicesLoading] = useState(false);

  const loadDevices = useCallback(async () => {
    if (!userId || !token) return;
    try {
      setDevicesLoading(true);
      const response = await fetch(`${apiUrl}/auth/trusted-devices/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const list = data.devices || [];
        setDevices(list);
        // Derive current-device trust from the list — same row the table shows
        const currentRow = list.find(d => d.is_current_device);
        setIsCurrentDeviceTrusted(currentRow ? currentRow.is_trusted !== false : false);
      }
    } catch (err) {
      logErrorFromCatch('[DEVICE-LIST] Error loading devices:', err);
    } finally {
      setDevicesLoading(false);
    }
  }, [apiUrl, userId, token]);

  useEffect(() => {
    if (twoFA.twoFAEnabled) {
      loadDevices();
    }
  }, [twoFA.twoFAEnabled, loadDevices]);
  // ────────────────────────────────────────────────────────────────────────

  const error = loadError || apiError || twoFA.twoFAError;

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

  const hasVerificationMethods = methods?.phoneVerified || methods?.recoveryEmailVerified;

  if (loading || twoFA.twoFALoading) {
    return <div style={{ textAlign: 'center', padding: '1rem' }}>Loading...</div>;
  }

  return (
    <div style={{ fontSize: '13px' }}>
      {/* SMS consent modal — shown when user selects SMS 2FA and clicks Save */}
      <SMSConsentModal
        isOpen={twoFA.showSMSConsentModal}
        onAccept={twoFA.handleSMSConsentAccept}
        onCancel={twoFA.handleSMSConsentCancel}
      />

      <AlertMessage type="error" message={error} />
      <AlertMessage type="success" message={flow.success || twoFA.twoFASuccess} />

      {/* Section 1: 2FA Status */}
      <TwoFASection
        twoFAEnabled={twoFA.twoFAEnabled}
        setTwoFAEnabled={twoFA.setTwoFAEnabled}
        twoFAMethod={twoFA.twoFAMethod}
        setTwoFAMethod={twoFA.setTwoFAMethod}
        twoFAEditMode={twoFA.twoFAEditMode}
        setTwoFAEditMode={twoFA.setTwoFAEditMode}
        twoFASaving={twoFA.twoFASaving}
        handle2FASave={twoFA.handle2FASave}
        twoFASettings={twoFA.twoFASettings}
        hasVerificationMethods={hasVerificationMethods}
      />

      {/* Section 2: Verification Methods */}
      <VerificationMethodsSection
        userEmail={userEmail}
        flow={flow}
        methods={methods}
        saving={saving}
        onSaveVerificationMethods={handleSaveVerificationMethods}
        onVerifyCode={handleVerifyCode}
        onEnterEditMode={flow.enterEditMode}
      />

      {/* Section 3: Trust This Device — receives trust status from the same fetch as the table */}
      {twoFA.twoFAEnabled && (
        <TrustCurrentDeviceSection
          userId={userId}
          token={token}
          apiUrl={apiUrl}
          isCurrentDeviceTrusted={isCurrentDeviceTrusted}
          onDeviceTrusted={loadDevices}
          onDeviceRevoked={loadDevices}
        />
      )}

      {/* Section 4: Trusted Devices List — receives same device list */}
      {twoFA.twoFAEnabled && (
        <TrustedDevicesSection
          devices={devices}
          loading={devicesLoading}
          userId={userId}
          token={token}
          apiUrl={apiUrl}
          onRevoked={loadDevices}
        />
      )}
    </div>
  );
}
