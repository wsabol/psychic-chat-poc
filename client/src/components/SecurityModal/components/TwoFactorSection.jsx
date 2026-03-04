/**
 * Two-Factor Authentication Section
 * Displays and manages 2FA settings
 *
 * Renders the SMSConsentModal when the user selects SMS and submits.
 * The modal is driven by twoFAState.showSMSConsentModal from use2FASettings.
 */

import React from 'react';
import styles from '../SecurityModal.module.css';
import { TWO_FA_METHODS } from '../utils/constants';
import SMSConsentModal from '../../security/verification/SMSConsentModal';

/**
 * SMS_DISABLED – set to true while AWS SMS approval is pending.
 * Flip to false once outbound SMS is approved to re-enable the option.
 */
const SMS_DISABLED = true;

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
    showSMSConsentModal,
    handleSMSConsentAccept,
    handleSMSConsentCancel,
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
      {/* SMS Consent Modal — shown when user selects SMS and clicks Save Changes */}
      <SMSConsentModal
        isOpen={showSMSConsentModal}
        onAccept={handleSMSConsentAccept}
        onCancel={handleSMSConsentCancel}
      />

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
                {/* SMS option — disabled while AWS outbound SMS approval is pending */}
                <label
                  className={styles.radioLabel}
                  style={SMS_DISABLED ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                  title={SMS_DISABLED ? 'SMS is not yet available — pending carrier approval' : undefined}
                >
                  <input
                    type="radio"
                    value={TWO_FA_METHODS.SMS}
                    checked={method === TWO_FA_METHODS.SMS}
                    onChange={(e) => !SMS_DISABLED && setMethod(e.target.value)}
                    disabled={saving || SMS_DISABLED}
                    style={SMS_DISABLED ? { cursor: 'not-allowed' } : undefined}
                  />
                  <span>
                    Text Message (SMS)
                    {SMS_DISABLED && (
                      <span style={{
                        marginLeft: '8px',
                        fontSize: '11px',
                        backgroundColor: '#f0ad4e',
                        color: '#7a5200',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        fontWeight: '600',
                        verticalAlign: 'middle'
                      }}>
                        Coming Soon
                      </span>
                    )}
                  </span>
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
