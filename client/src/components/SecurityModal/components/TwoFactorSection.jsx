/**
 * Two-Factor Authentication Section
 * Displays and manages 2FA settings
 */

import React from 'react';
import styles from '../SecurityModal.module.css';
import { TWO_FA_METHODS } from '../utils/constants';

const TwoFactorSection = ({ twoFAState }) => {
  const {
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
    saving,
  } = twoFAState;

  const handleSubmit = async (e) => {
    e.preventDefault();
    await handleSaveSettings();
  };

  if (!editMode) {
    return (
      <div className={styles.securitySection}>
        <h3>Two-Factor Authentication (2FA)</h3>

        <div className={styles.settingItem}>
          <div className={styles.settingLabel}>
            <strong>Status:</strong>
            <span className={enabled ? styles.statusEnabled : styles.statusDisabled}>
              {enabled ? '✓ Enabled' : 'Disabled'}
            </span>
          </div>
        </div>

        {enabled && (
          <>
            <div className={styles.settingItem}>
              <strong>Method:</strong>
              <span>{method === TWO_FA_METHODS.SMS ? 'Text Message (SMS)' : 'Email'}</span>
            </div>

            <div className={styles.settingItem}>
              <strong>Phone Number:</strong>
              <span>{phoneNumber || 'Not set'}</span>
            </div>

            {backupPhoneNumber && (
              <div className={styles.settingItem}>
                <strong>Backup Phone:</strong>
                <span>{backupPhoneNumber}</span>
              </div>
            )}
          </>
        )}

        <p className={styles.securityInfo}>
          Two-factor authentication adds an extra layer of security to your account.
          When enabled, you'll need to enter a code sent to your phone in addition to your password when logging in.
        </p>

        <button
          className={styles.btnSecondary}
          onClick={() => setEditMode(true)}
        >
          Edit Settings
        </button>
      </div>
    );
  }

  return (
    <div className={styles.securitySection}>
      <h3>Two-Factor Authentication (2FA)</h3>

      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              disabled={saving}
            />
            <span>Enable Two-Factor Authentication</span>
          </label>
        </div>

        {enabled && (
          <>
            <div className={styles.formGroup}>
              <label>Authentication Method</label>
              <div className={styles.radioGroup}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    value={TWO_FA_METHODS.SMS}
                    checked={method === TWO_FA_METHODS.SMS}
                    onChange={(e) => setMethod(e.target.value)}
                    disabled={saving}
                  />
                  <span>Text Message (SMS)</span>
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    value={TWO_FA_METHODS.EMAIL}
                    checked={method === TWO_FA_METHODS.EMAIL}
                    onChange={(e) => setMethod(e.target.value)}
                    disabled={saving}
                  />
                  <span>Email</span>
                </label>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Primary Phone Number</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="(123) 456-7890 or +1234567890"
                disabled={saving}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Backup Phone Number (Optional)</label>
              <input
                type="tel"
                value={backupPhoneNumber}
                onChange={(e) => setBackupPhoneNumber(e.target.value)}
                placeholder="(123) 456-7890 or +1234567890"
                disabled={saving}
                className={styles.input}
              />
              <small>If your primary phone is unavailable</small>
            </div>
          </>
        )}

        <div className={styles.formActions}>
          <button
            type="submit"
            className={styles.btnPrimary}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={cancelEdit}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default TwoFactorSection;
