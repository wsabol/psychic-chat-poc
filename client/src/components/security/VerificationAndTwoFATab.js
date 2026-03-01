import React from 'react';
import AlertMessage from './verification/AlertMessage';
import { useVerificationMethods } from './verification/hooks/useVerificationMethods';
import { useVerificationAPI } from './verification/hooks/useVerificationAPI';
import { useVerificationFlow } from './verification/hooks/useVerificationFlow';
import { use2FASettings } from './verification/hooks/use2FASettings';
import { useTrustedDevices } from './verification/hooks/useTrustedDevices';
import { TwoFASection } from './verification/TwoFASection';
import { VerificationMethodsSection } from './verification/VerificationMethodsSection';
import { TrustCurrentDeviceSection } from './verification/TrustCurrentDeviceSection';
import { TrustedDevicesSection } from './verification/TrustedDevicesSection';
import SMSConsentModal from './verification/SMSConsentModal';
import { logErrorFromCatch } from '../../shared/errorLogger.js';

/**
 * VerificationAndTwoFATab – Orchestrator component for the Security page's
 * "Verification & 2FA" tab.
 *
 * Responsibilities:
 *  - Composes the four child sections (2FA, Verification Methods,
 *    Trust This Device, Trusted Devices).
 *  - Lifts device-list state via useTrustedDevices so TrustCurrentDeviceSection
 *    and TrustedDevicesSection always show data from the same API call and
 *    can never disagree about whether the current device is trusted.
 *  - Delegates 2FA state/logic to use2FASettings and verification
 *    state/logic to useVerificationFlow + useVerificationAPI.
 *
 * What this component does NOT do:
 *  - No direct fetch calls (all in hooks).
 *  - No SMS consent or cancel-reset logic (both owned by their respective hooks).
 */
export default function VerificationAndTwoFATab({ userId, token, apiUrl, userEmail }) {
  // ── Verification methods ──────────────────────────────────────────────────
  const { methods, loading, error: loadError, reload } = useVerificationMethods(userId, token, apiUrl);
  const { saving, error: apiError, setError, savePhone, saveEmail, verifyCode } = useVerificationAPI(userId, token, apiUrl);
  const flow = useVerificationFlow(methods);

  // ── 2FA settings ──────────────────────────────────────────────────────────
  const twoFA = use2FASettings(userId, token, apiUrl);

  // ── Trusted devices (single source of truth for both device sections) ─────
  const {
    devices,
    isCurrentDeviceTrusted,
    loading: devicesLoading,
    reload: reloadDevices,
  } = useTrustedDevices(userId, token, apiUrl, twoFA.twoFAEnabled);

  // ── Aggregated error ──────────────────────────────────────────────────────
  const error = loadError || apiError || twoFA.twoFAError;

  // ── Verification-method save / verify handlers ────────────────────────────

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
      logErrorFromCatch('[VERIFICATION] Save error:', err);
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

  // ── Derived values ────────────────────────────────────────────────────────
  const hasVerificationMethods = methods?.phoneVerified || methods?.recoveryEmailVerified;

  // ── Loading gate ──────────────────────────────────────────────────────────
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

      <AlertMessage type="error"   message={error} />
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
        onCancel={twoFA.cancelEdit}
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

      {/* Section 3: Trust This Device
          Receives trust status derived from the same fetch as the devices table —
          both sections therefore always show the same state. */}
      {twoFA.twoFAEnabled && (
        <TrustCurrentDeviceSection
          userId={userId}
          token={token}
          apiUrl={apiUrl}
          isCurrentDeviceTrusted={isCurrentDeviceTrusted}
          onDeviceTrusted={reloadDevices}
          onDeviceRevoked={reloadDevices}
        />
      )}

      {/* Section 4: Trusted Devices list — shares same device list */}
      {twoFA.twoFAEnabled && (
        <TrustedDevicesSection
          devices={devices}
          loading={devicesLoading}
          userId={userId}
          token={token}
          apiUrl={apiUrl}
          onRevoked={reloadDevices}
        />
      )}
    </div>
  );
}
