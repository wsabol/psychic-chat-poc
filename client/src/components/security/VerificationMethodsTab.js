import React from 'react';
import AlertMessage from './verification/AlertMessage';
import VerificationDisplay from './verification/VerificationDisplay';
import VerificationForm from './verification/VerificationForm';
import VerificationCodeInput from './verification/VerificationCodeInput';
import { useVerificationMethods } from './verification/hooks/useVerificationMethods';
import { useVerificationAPI } from './verification/hooks/useVerificationAPI';
import { useVerificationFlow } from './verification/hooks/useVerificationFlow';

/**
 * VerificationMethodsTab - Combine phone + email in single view
 * Reads/writes to: security table (phone, recovery_email)
 * 
 * Refactored for modularity with:
 * - Custom hooks for data/API/flow
 * - Reusable sub-components
 * - Clear separation of concerns
 */
export default function VerificationMethodsTab({ userId, token, apiUrl, userEmail }) {
  // Load verification methods
  const { methods, loading, error: loadError, reload } = useVerificationMethods(userId, token, apiUrl);

  // API operations
  const { saving, error: apiError, setError, savePhone, saveEmail, verifyCode } = useVerificationAPI(userId, token, apiUrl);

  // Form workflow
  const flow = useVerificationFlow(methods);

  // Combined error state
  const error = loadError || apiError || null;

  /**
   * Handle saving verification methods
   */
  const handleSaveVerificationMethods = async () => {
    try {
      setError(null);

      // Save phone if changed
      if (flow.hasPhoneChanged()) {
        const result = await savePhone(flow.phoneNumber, flow.recoveryPhone);
        if (!result.success) return;
        flow.enterVerificationMode('phone');
        return;
      }

      // Save email if changed
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

  /**
   * Handle code verification
   */
  const handleVerifyCode = async () => {
    const result = await verifyCode(flow.verificationCode, flow.verificationType);
    if (result.success) {
      flow.completeVerification();
      reload();
    }
  };

  // Loading state
  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading verification methods...</div>;
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Verification Methods</h2>
      <p style={{ color: '#666' }}>
        Add phone and email for account recovery and two-factor authentication.
      </p>

      {/* Error/Success Messages */}
      <AlertMessage type="error" message={error} />
      <AlertMessage type="success" message={flow.success} />

      {/* Display Mode (Read-only) */}
      {!flow.editMode && !flow.showVerification && (
        <VerificationDisplay
          userEmail={userEmail}
          phoneNumber={flow.phoneNumber}
          recoveryPhone={flow.recoveryPhone}
          recoveryEmail={flow.recoveryEmail}
          methods={methods}
          onEdit={flow.enterEditMode}
        />
      )}

      {/* Edit Mode (Form) */}
      {flow.editMode && !flow.showVerification && (
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
      )}

      {/* Verification Mode (Code Input) */}
      {flow.showVerification && (
        <VerificationCodeInput
          code={flow.verificationCode}
          setCode={flow.setVerificationCode}
          verificationType={flow.verificationType}
          contactValue={flow.verificationType === 'phone' ? flow.phoneNumber : flow.recoveryEmail}
          saving={saving}
          onVerify={handleVerifyCode}
          onBack={flow.exitVerificationMode}
        />
      )}
    </div>
  );
}
