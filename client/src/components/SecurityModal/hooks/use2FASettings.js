/**
 * Custom hook for 2FA settings management
 * Extracted from SecurityModal for better separation of concerns
 */

import { useState, useEffect, useCallback } from 'react';

export const use2FASettings = (userId, token, apiUrl) => {
  const [twoFASettings, setTwoFASettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editMode, setEditMode] = useState(false);

  // Form state
  const [enabled, setEnabled] = useState(true);
  const [method, setMethod] = useState('sms');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [backupPhoneNumber, setBackupPhoneNumber] = useState('');

  const loadTwoFASettings = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/auth/2fa-settings/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTwoFASettings(data.settings);
        setEnabled(data.settings.enabled);
        setMethod(data.settings.method || 'sms');
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

  const handleSaveSettings = useCallback(async () => {
    setError('');
    setSuccess('');

    if (enabled && !phoneNumber.trim()) {
      setError('Phone number is required when 2FA is enabled');
      return false;
    }

    setSaving(true);
    try {
      const response = await fetch(`${apiUrl}/auth/2fa-settings/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          enabled,
          method,
          phoneNumber: phoneNumber || undefined,
          backupPhoneNumber: backupPhoneNumber || undefined
        })
      });

      const data = await response.json();

      if (response.ok) {
        setTwoFASettings(data.settings);
        setSuccess('2FA settings updated successfully');
        setEditMode(false);
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
  }, [enabled, method, phoneNumber, backupPhoneNumber, userId, token, apiUrl]);

  const cancelEdit = useCallback(() => {
    setEditMode(false);
    if (twoFASettings) {
      setEnabled(twoFASettings.enabled);
      setMethod(twoFASettings.method || 'sms');
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
  };
};
