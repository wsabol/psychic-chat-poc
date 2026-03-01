import { useState, useCallback, useEffect } from 'react';
import { logErrorFromCatch } from '../../../../shared/errorLogger.js';

/**
 * Custom hook for 2FA settings management
 * Handles all 2FA state, loading, API calls, and SMS consent gating.
 *
 * SMS Consent flow:
 *  1. User selects 'sms' as method and clicks Save.
 *  2. handle2FASave detects method === 'sms' and no consent yet → sets
 *     showSMSConsentModal = true (caller renders <SMSConsentModal>).
 *  3. User accepts → handleSMSConsentAccept fires the actual API save.
 *  4. User cancels → handleSMSConsentCancel closes the modal; nothing is saved.
 *  5. Consent is reset whenever the method changes away from 'sms' or the
 *     user re-enters edit mode, ensuring they see the modal on each new
 *     SMS selection.
 */
export function use2FASettings(userId, token, apiUrl) {
  const [twoFASettings, setTwoFASettings] = useState(null);
  const [twoFALoading, setTwoFALoading] = useState(true);
  const [twoFAEditMode, setTwoFAEditMode] = useState(false);
  const [twoFASaving, setTwoFASaving] = useState(false);
  const [twoFAError, setTwoFAError] = useState(null);
  const [twoFASuccess, setTwoFASuccess] = useState(null);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFAMethod, setTwoFAMethodRaw] = useState('email');

  // SMS consent state
  const [showSMSConsentModal, setShowSMSConsentModal] = useState(false);
  const [smsConsentGiven, setSmsConsentGiven] = useState(false);

  // ── Reset consent whenever the user re-opens edit mode ───────────────────
  useEffect(() => {
    if (twoFAEditMode) {
      setSmsConsentGiven(false);
    }
  }, [twoFAEditMode]);

  /** Wrap the raw setter so switching away from 'sms' clears consent. */
  const setTwoFAMethod = useCallback((m) => {
    setTwoFAMethodRaw(m);
    if (m !== 'sms') {
      setSmsConsentGiven(false);
    }
  }, []);

  // ── Load 2FA settings ─────────────────────────────────────────────────────
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
        setTwoFAMethodRaw(data.settings.method || 'email');
      }
    } catch (err) {
      logErrorFromCatch('[2FA] Error loading settings:', err);
      setTwoFAError(err.message);
    } finally {
      setTwoFALoading(false);
    }
  }, [apiUrl, userId, token]);

  useEffect(() => {
    load2FASettings();
  }, [load2FASettings]);

  // ── Internal: performs the actual API call (post-consent) ─────────────────
  const performSave = useCallback(async (enabledVal, methodVal) => {
    try {
      setTwoFASaving(true);
      setTwoFAError(null);

      const response = await fetch(`${apiUrl}/security/2fa-settings/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled: enabledVal, method: methodVal })
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
  }, [apiUrl, userId, token]);

  // ── Save — intercepts when SMS is selected and consent not yet given ───────
  const handle2FASave = useCallback(async () => {
    if (twoFAEnabled && twoFAMethod === 'sms' && !smsConsentGiven) {
      setShowSMSConsentModal(true);
      return;
    }
    await performSave(twoFAEnabled, twoFAMethod);
  }, [twoFAEnabled, twoFAMethod, smsConsentGiven, performSave]);

  // ── Cancel edit ───────────────────────────────────────────────────────────

  /**
   * Resets 2FA form state to whatever was last loaded from the API and exits
   * edit mode.  Extracted here so TwoFASection doesn't need the raw
   * twoFASettings object passed as a prop just to implement the cancel button.
   */
  const cancelEdit = useCallback(() => {
    setTwoFAEditMode(false);
    if (twoFASettings) {
      setTwoFAEnabled(twoFASettings.enabled);
      setTwoFAMethodRaw(twoFASettings.method || 'email');
    }
  }, [twoFASettings]);

  // ── SMS consent modal callbacks ───────────────────────────────────────────

  /** User accepted the SMS consent — mark consent given, close modal, save. */
  const handleSMSConsentAccept = useCallback(async () => {
    setSmsConsentGiven(true);
    setShowSMSConsentModal(false);
    // Use the current state values captured in the closure via the hook's
    // state refs. performSave reads twoFAEnabled/twoFAMethod from the call
    // params to avoid stale-closure issues.
    await performSave(twoFAEnabled, twoFAMethod);
  }, [performSave, twoFAEnabled, twoFAMethod]);

  /** User cancelled the SMS consent modal — close without saving. */
  const handleSMSConsentCancel = useCallback(() => {
    setShowSMSConsentModal(false);
  }, []);

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
    cancelEdit,
    load2FASettings,
    // SMS consent modal
    showSMSConsentModal,
    handleSMSConsentAccept,
    handleSMSConsentCancel,
  };
}
