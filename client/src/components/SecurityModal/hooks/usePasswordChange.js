/**
 * Custom hook for password change management
 * Extracted from SecurityModal for better separation of concerns
 */

import { useState, useCallback } from 'react';
import { checkPasswordStrength, validatePassword } from '../utils/passwordValidation';

export const usePasswordChange = (userId, token, apiUrl) => {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handlePasswordChange = useCallback((value) => {
    setNewPassword(value);
    setPasswordStrength(checkPasswordStrength(value));
  }, []);

  const handleChangePassword = useCallback(async () => {
    setError('');
    setSuccess('');

    if (passwordStrength < 4) {
      setError('Password does not meet strength requirements');
      return false;
    }

    if (newPassword !== newPasswordConfirm) {
      setError('Passwords do not match');
      return false;
    }

    if (!currentPassword.trim()) {
      setError('Current password is required');
      return false;
    }

    const validationError = validatePassword(newPassword);
    if (validationError) {
      setError(validationError);
      return false;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/auth/change-password/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          newPasswordConfirm
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Password changed successfully');
        setShowPasswordForm(false);
        setCurrentPassword('');
        setNewPassword('');
        setNewPasswordConfirm('');
        setPasswordStrength(0);
        setTimeout(() => setSuccess(''), 3000);
        return true;
      } else {
        setError(data.error || 'Failed to change password');
        return false;
      }
    } catch (err) {
      setError('Failed to change password: ' + err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentPassword, newPassword, newPasswordConfirm, passwordStrength, userId, token, apiUrl]);

  const cancelPasswordChange = useCallback(() => {
    setShowPasswordForm(false);
    setCurrentPassword('');
    setNewPassword('');
    setNewPasswordConfirm('');
    setPasswordStrength(0);
    setError('');
  }, []);

  return {
    showPasswordForm,
    setShowPasswordForm,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword: handlePasswordChange,
    newPasswordConfirm,
    setNewPasswordConfirm,
    passwordStrength,
    loading,
    error,
    success,
    handleChangePassword,
    cancelPasswordChange,
    setError,
    setSuccess,
  };
};
