/**
 * Password Change Section
 * Displays and manages password change functionality
 */

import React from 'react';
import styles from '../SecurityModal.module.css';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';
import { passwordsMatch } from '../utils/passwordValidation';

const PasswordSection = ({ passwordState }) => {
  const {
    showPasswordForm,
    setShowPasswordForm,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    newPasswordConfirm,
    setNewPasswordConfirm,
    passwordStrength,
    loading,
    handleChangePassword,
    cancelPasswordChange,
  } = passwordState;

  const handleSubmit = async (e) => {
    e.preventDefault();
    await handleChangePassword();
  };

  if (!showPasswordForm) {
    return (
      <div className={styles.securitySection}>
        <h3>Password</h3>
        <p>Keep your account secure by changing your password regularly.</p>
        <button
          className={styles.btnSecondary}
          onClick={() => setShowPasswordForm(true)}
        >
          Change Password
        </button>
      </div>
    );
  }

  return (
    <div className={styles.securitySection}>
      <h3>Change Password</h3>

      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label>Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter your current password"
            disabled={loading}
            autoComplete="current-password"
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label>New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter your new password"
            disabled={loading}
            autoComplete="new-password"
            className={styles.input}
          />
          <PasswordStrengthIndicator password={newPassword} strength={passwordStrength} />
        </div>

        <div className={styles.formGroup}>
          <label>Confirm New Password</label>
          <input
            type="password"
            value={newPasswordConfirm}
            onChange={(e) => setNewPasswordConfirm(e.target.value)}
            placeholder="Re-enter your new password"
            disabled={loading}
            autoComplete="new-password"
            className={styles.input}
          />
          {newPassword && newPasswordConfirm && passwordsMatch(newPassword, newPasswordConfirm) && (
            <span className={styles.passwordMatch}>✓ Passwords match</span>
          )}
          {newPassword && newPasswordConfirm && !passwordsMatch(newPassword, newPasswordConfirm) && (
            <span className={styles.passwordMismatch}>✗ Passwords do not match</span>
          )}
        </div>

        <div className={styles.formActions}>
          <button
            type="submit"
            className={styles.btnPrimary}
            disabled={loading || passwordStrength < 4 || !passwordsMatch(newPassword, newPasswordConfirm)}
          >
            {loading ? 'Changing...' : 'Change Password'}
          </button>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={cancelPasswordChange}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default PasswordSection;
