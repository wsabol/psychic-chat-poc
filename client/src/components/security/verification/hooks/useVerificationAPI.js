import { useState } from 'react';

/**
 * useVerificationAPI - Handle all verification-related API calls
 */
export function useVerificationAPI(userId, token, apiUrl) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Save phone number (primary + recovery)
   */
  const savePhone = async (phoneNumber, recoveryPhone) => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`${apiUrl}/security/phone/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phoneNumber, recoveryPhone })
      });

      if (!response.ok) throw new Error('Failed to save phone number');
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  };

  /**
   * Save recovery email
   */
  const saveEmail = async (recoveryEmail) => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`${apiUrl}/security/email/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ recoveryEmail })
      });

      if (!response.ok) throw new Error('Failed to save recovery email');
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  };

  /**
   * Verify code (phone or email)
   */
  const verifyCode = async (code, verificationType) => {
    try {
      setSaving(true);
      setError(null);

      if (!code.trim()) {
        setError('Please enter verification code');
        return { success: false };
      }

      let endpoint = '';
      if (verificationType === 'phone') {
        endpoint = `${apiUrl}/security/phone/${userId}/verify`;
      } else if (verificationType === 'email') {
        endpoint = `${apiUrl}/security/email/${userId}/verify`;
      } else {
        throw new Error('Invalid verification type');
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code })
      });

      if (!response.ok) throw new Error('Invalid verification code');
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  };

  return {
    saving,
    error,
    setError,
    savePhone,
    saveEmail,
    verifyCode
  };
}
