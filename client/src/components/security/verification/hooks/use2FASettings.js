import { useState, useCallback, useEffect } from 'react';

/**
 * Custom hook for 2FA settings management
 * Handles all 2FA state, loading, and API calls
 */
export function use2FASettings(userId, token, apiUrl) {
  const [twoFASettings, setTwoFASettings] = useState(null);
  const [twoFALoading, setTwoFALoading] = useState(true);
  const [twoFAEditMode, setTwoFAEditMode] = useState(false);
  const [twoFASaving, setTwoFASaving] = useState(false);
  const [twoFAError, setTwoFAError] = useState(null);
  const [twoFASuccess, setTwoFASuccess] = useState(null);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFAMethod, setTwoFAMethod] = useState('email');

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

  // Save 2FA settings
  const handle2FASave = useCallback(async () => {
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
  }, [apiUrl, userId, token, twoFAEnabled, twoFAMethod]);

  return {
    twoFASettings,
    twoFALoading,
    twoFAEditMode,
    setTwoFAEditMode,
    twoFASaving,
    twoFAError,
    setTwoFAError,
    twoFASuccess,
    twoFAEnabled,
    setTwoFAEnabled,
    twoFAMethod,
    setTwoFAMethod,
    handle2FASave,
    load2FASettings
  };
}
