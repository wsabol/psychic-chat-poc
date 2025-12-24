import React from 'react';
import AlertMessage from './verification/AlertMessage';
import { useVerificationMethods } from './verification/hooks/useVerificationMethods';
import { useVerificationAPI } from './verification/hooks/useVerificationAPI';
import { useVerificationFlow } from './verification/hooks/useVerificationFlow';
import { use2FASettings } from './verification/hooks/use2FASettings';
import { TwoFASection } from './verification/TwoFASection';
import { VerificationMethodsSection } from './verification/VerificationMethodsSection';
import { TrustCurrentDeviceSection } from './verification/TrustCurrentDeviceSection';
import { TrustedDevicesSection } from './verification/TrustedDevicesSection';

/**
 * VerificationAndTwoFATab - Orchestrator component
 * Composes 2FA, Verification Methods, Trust Current Device, and Trusted Devices sections
 */
export default function VerificationAndTwoFATab({ userId, token, apiUrl, userEmail }) {
  // Verification methods
  const { methods, loading, error: loadError, reload } = useVerificationMethods(userId, token, apiUrl);
  const { saving, error: apiError, setError, savePhone, saveEmail, verifyCode } = useVerificationAPI(userId, token, apiUrl);
  const flow = useVerificationFlow(methods);

  // 2FA settings
  const twoFA = use2FASettings(userId, token, apiUrl);

  const error = loadError || apiError || twoFA.twoFAError;

  // Handlers
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

  // Check if verification methods are ready for 2FA
  const hasVerificationMethods = methods?.phoneVerified || methods?.recoveryEmailVerified;

  if (loading || twoFA.twoFALoading) {
    return <div style={{ textAlign: 'center', padding: '1rem' }}>Loading...</div>;
  }

  return (
    <div style={{ fontSize: '13px' }}>
      {/* Error/Success Messages */}
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

      {/* Section 3: Trust This Device (Current) */}
      {twoFA.twoFAEnabled && (
        <TrustCurrentDeviceSection
          userId={userId}
          token={token}
          apiUrl={apiUrl}
        />
      )}

      {/* Section 4: Trusted Devices List */}
      {twoFA.twoFAEnabled && (
        <TrustedDevicesSection
          userId={userId}
          token={token}
          apiUrl={apiUrl}
        />
      )}
    </div>
  );
}
