/**
 * Custom hook for 2FA settings management
 * Extracted from SecurityModal for better separation of concerns
 *
 * SMS Consent flow:
 *   When the user selects SMS and submits, handleSaveSettings intercepts and
 *   sets showSMSConsentModal = true. The caller renders <SMSConsentModal> and
 *   calls handleSMSConsentAccept / handleSMSConsentCancel.
 *   Consent is reset each time the user re-opens edit mode or switches away
 *   from the SMS method.
 */

import { useState, useEffect, useCallback } from 'react';

export const use2FASettings = (userId, token, apiUrl) => {
  const [twoFASettings, setTwoFASettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editMode, setEditModeRaw] = useState(false);

  // Form state
  const [enabled, setEnabled] = useState(true);
  const [method, setMethodRaw] = useState('sms');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [backupPhoneNumber, setBackupPhoneNumber] = useState('');

  // SMS consent state
  const [showSMSConsentModal, setShowSMSConsentModal] = useState(false);
  const [smsConsentGiven, setSmsConsentGiven] = useState(false);

  // ── Wrap setEditMode to reset consent when entering edit mode ─────────────
  const setEditMode = useCallback((value) => {
    setEditModeRaw(value);
    if (value) {
      setSmsConsentGiven(false);
    }
  }, []);

  // ── Wrap setMethod to reset consent when switching away from SMS ──────────
  const setMethod = useCallback((value) => {
    setMethodRaw(value);
    if (value !== 'sms') {
      setSmsConsentGiven(false);
    }
  }, []);

  // ── Load 2FA settings ─────────────────────────────────────────────────────
  const loadTwoFASettings = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/security/2fa-settings/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setTwoFASettings(data.settings);
        setEnabled(data.settings.enabled);
        setMethodRaw(data.settings.method || 'sms');
        setPhoneNumber(data.settings.phone_number || '');
        setBackupPhoneNumber(data.settings.backup_phone_number || '');
      } else {
        setError('Failed to load 2FA settings');
      }
    } catch (err) {
      setError('Failed to load settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, token, apiUrl]);

  useEffect(() => {
    loadTwoFASettings();
  }, [loadTwoFASettings]);

  // ── Internal: performs the actual API call (post-consent) ─────────────────
  const performSave = useCallback(async (enabledVal, methodVal) => {
    if (enabledVal && methodVal === 'sms' && !phoneNumber.trim()) {
      setError('Phone number is required when 2FA SMS is enabled');
      return false;
    }

    setSaving(true);
    try {
      const response = await fetch(`${apiUrl}/security/2fa-settings/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          enabled: enabledVal,
          method: methodVal,
          phoneNumber: phoneNumber || undefined,
          backupPhoneNumber: backupPhoneNumber || undefined
        })
      });

      const data = await response.json();

      if (response.ok) {
        setTwoFASettings(data.settings);
        setSuccess('2FA settings updated successfully');
        setEditModeRaw(false);
        await loadTwoFASettings();
        setTimeout(() => setSuccess(''), 3000);
        return true;
      } else {
        setError(data.error || 'Failed to save settings');
        return false;
      }
    } catch (err) {
      setError('Failed to save settings: ' + err.message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [phoneNumber, backupPhoneNumber, userId, token, apiUrl, loadTwoFASettings]);

  // ── Save — intercepts when SMS selected and no consent yet ────────────────
  const handleSaveSettings = useCallback(async () => {
    setError('');
    setSuccess('');

    if (enabled && method === 'sms' && !smsConsentGiven) {
      setShowSMSConsentModal(true);
      return false;
    }

    return performSave(enabled, method);
  }, [enabled, method, smsConsentGiven, performSave]);

  // ── SMS consent modal callbacks ───────────────────────────────────────────

  /** User accepted the SMS consent modal → save. */
  const handleSMSConsentAccept = useCallback(async () => {
    setSmsConsentGiven(true);
    setShowSMSConsentModal(false);
    return performSave(enabled, method);
  }, [performSave, enabled, method]);

  /** User cancelled the SMS consent modal → close without saving. */
  const handleSMSConsentCancel = useCallback(() => {
    setShowSMSConsentModal(false);
  }, []);

  // ── Cancel edit ───────────────────────────────────────────────────────────
  const cancelEdit = useCallback(() => {
    setEditModeRaw(false);
    setSmsConsentGiven(false);
    if (twoFASettings) {
      setEnabled(twoFASettings.enabled);
      setMethodRaw(twoFASettings.method || 'sms');
      setPhoneNumber(twoFASettings.phone_number || '');
      setBackupPhoneNumber(twoFASettings.backup_phone_number || '');
    }
  }, [twoFASettings]);

  return {
    twoFASettings,
    loading,
    saving,
    error,
    success,
    editMode,
    setEditMode,
    enabled,
    setEnabled,
    method,
    setMethod,
    phoneNumber,
    setPhoneNumber,
    backupPhoneNumber,
    setBackupPhoneNumber,
    handleSaveSettings,
    cancelEdit,
    setError,
    setSuccess,
    // SMS consent modal
    showSMSConsentModal,
    handleSMSConsentAccept,
    handleSMSConsentCancel,
  };
};
