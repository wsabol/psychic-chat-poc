import { useState } from 'react';

/**
 * useVerificationFlow - Manage form workflow and state transitions
 */
export function useVerificationFlow(initialMethods) {
  const [editMode, setEditMode] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationType, setVerificationType] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [success, setSuccess] = useState(null);

  // Form state
  const [phoneNumber, setPhoneNumber] = useState(initialMethods?.phoneNumber || '');
  const [recoveryPhone, setRecoveryPhone] = useState(initialMethods?.recoveryPhone || '');
  const [recoveryEmail, setRecoveryEmail] = useState(initialMethods?.recoveryEmail || '');

  /**
   * Enter edit mode
   */
  const enterEditMode = () => {
    setEditMode(true);
  };

  /**
   * Exit edit mode and reload data
   */
  const exitEditMode = () => {
    setEditMode(false);
    resetForm();
  };

  /**
   * Enter verification mode (show code input)
   */
  const enterVerificationMode = (type) => {
    setShowVerification(true);
    setVerificationType(type);
    setVerificationCode('');
  };

  /**
   * Exit verification mode
   */
  const exitVerificationMode = () => {
    setShowVerification(false);
    setVerificationType(null);
    setVerificationCode('');
  };

  /**
   * Complete verification successfully
   */
  const completeVerification = () => {
    setSuccess('Verification successful!');
    setShowVerification(false);
    setEditMode(false);
    setVerificationCode('');
    setTimeout(() => setSuccess(null), 3000);
  };

  /**
   * Update success message
   */
  const showSuccessMessage = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  /**
   * Reset form to initial values
   */
  const resetForm = () => {
    if (initialMethods) {
      setPhoneNumber(initialMethods.phoneNumber || '');
      setRecoveryPhone(initialMethods.recoveryPhone || '');
      setRecoveryEmail(initialMethods.recoveryEmail || '');
    }
  };

  /**
   * Check if phone has changed
   */
  const hasPhoneChanged = () => {
    return phoneNumber !== (initialMethods?.phoneNumber || '') ||
           recoveryPhone !== (initialMethods?.recoveryPhone || '');
  };

  /**
   * Check if email has changed
   */
  const hasEmailChanged = () => {
    return recoveryEmail !== (initialMethods?.recoveryEmail || '');
  };

  return {
    // View state
    editMode,
    showVerification,
    verificationType,
    success,

    // Form state
    phoneNumber,
    setPhoneNumber,
    recoveryPhone,
    setRecoveryPhone,
    recoveryEmail,
    setRecoveryEmail,
    verificationCode,
    setVerificationCode,

    // Actions
    enterEditMode,
    exitEditMode,
    enterVerificationMode,
    exitVerificationMode,
    completeVerification,
    showSuccessMessage,
    resetForm,

    // Helpers
    hasPhoneChanged,
    hasEmailChanged
  };
}
