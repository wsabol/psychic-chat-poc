import React from 'react';
import { useTranslation } from '../../../context/TranslationContext';

// ── Styles ────────────────────────────────────────────────────────────────────
// Extracted from inline style props so changes to the look-and-feel are made in
// one place rather than scattered through JSX.

const ENABLED_COLOR  = '#4caf50';
const DISABLED_COLOR = '#ff9800';

const makeContainerStyle = (enabled) => ({
  marginBottom: '1.5rem',
  padding: '1rem',
  backgroundColor: enabled ? '#e8f5e9' : '#fff3e0',
  borderRadius: '6px',
  border: `1px solid ${enabled ? ENABLED_COLOR : DISABLED_COLOR}`,
});

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem',
  },
  heading: {
    marginTop: 0,
    marginBottom: '0.25rem',
    fontSize: '15px',
  },
  subtitle: {
    margin: 0,
    fontSize: '11px',
    color: '#666',
    marginBottom: '0.5rem',
  },
  editButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#7c63d8',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  methodLine: {
    margin: '0.5rem 0 0 0',
    fontSize: '12px',
    color: '#333',
  },
  editSection: {
    marginTop: '1rem',
  },
  enableCheckboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    fontSize: '12px',
    marginBottom: '0.75rem',
  },
  checkboxInput: {
    cursor: 'pointer',
    width: '16px',
    height: '16px',
  },
  methodGroup: {
    marginBottom: '0.75rem',
    marginLeft: '1.5rem',
  },
  methodGroupLabel: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: 'bold',
    fontSize: '12px',
  },
  methodOptions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  methodOptionLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    fontSize: '12px',
  },
  radioInput: {
    cursor: 'pointer',
    width: '16px',
    height: '16px',
  },
  actionButtons: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '1rem',
  },
  saveButton: (saving) => ({
    flex: 1,
    padding: '0.5rem',
    backgroundColor: '#7c63d8',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: saving ? 'not-allowed' : 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
  }),
  cancelButton: (saving) => ({
    flex: 1,
    padding: '0.5rem',
    backgroundColor: '#f5f5f5',
    border: '1px solid #ccc',
    borderRadius: '4px',
    cursor: saving ? 'not-allowed' : 'pointer',
    fontSize: '12px',
  }),
  warningText: {
    margin: '0.75rem 0 0 0',
    fontSize: '12px',
    color: '#f57f17',
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * TwoFASection – Render-only view for 2FA settings.
 *
 * Prop changes vs. the previous version:
 *  - `twoFASettings` REMOVED – the hook now owns reset-on-cancel via `onCancel`.
 *  - `onCancel`     ADDED   – called when the user clicks "Cancel" in edit mode.
 *
 * This keeps data-layer concerns (knowing what the last-saved values were) inside
 * use2FASettings rather than leaking them into the presentational layer.
 */
export function TwoFASection({
  twoFAEnabled,
  setTwoFAEnabled,
  twoFAMethod,
  setTwoFAMethod,
  twoFAEditMode,
  setTwoFAEditMode,
  twoFASaving,
  handle2FASave,
  onCancel,
  hasVerificationMethods,
}) {
  const { t } = useTranslation();

  const statusColor = twoFAEnabled ? '#2e7d32' : '#f57f17';

  return (
    <div style={makeContainerStyle(twoFAEnabled)}>
      {/* ── Header: title + edit button ──────────────────────────────────── */}
      <div style={styles.header}>
        <div>
          <h3 style={styles.heading}>
            {t('security.twoFA.heading')}
          </h3>
          <p style={styles.subtitle}>
            {t('security.twoFactor')}
          </p>
          <p style={{ margin: 0, fontSize: '12px', color: statusColor }}>
            <strong>{t('security.twoFA.statusLabel')}</strong>{' '}
            {twoFAEnabled ? t('security.twoFA.enabled') : t('security.twoFA.disabled')}
          </p>
        </div>

        {!twoFAEditMode && (
          <button onClick={() => setTwoFAEditMode(true)} style={styles.editButton}>
            {t('security.twoFA.changeButton')}
          </button>
        )}
      </div>

      {/* ── Read-only method line ─────────────────────────────────────────── */}
      {twoFAEnabled && !twoFAEditMode && (
        <p style={styles.methodLine}>
          <strong>{t('security.twoFA.methodLabel')}</strong>{' '}
          {twoFAMethod === 'email'
            ? t('security.twoFA.methodEmail')
            : t('security.twoFA.methodSMS')}
        </p>
      )}

      {/* ── Edit mode ────────────────────────────────────────────────────── */}
      {twoFAEditMode && (
        <div style={styles.editSection}>
          {/* Enable checkbox */}
          <label style={styles.enableCheckboxLabel}>
            <input
              type="checkbox"
              checked={twoFAEnabled}
              onChange={(e) => setTwoFAEnabled(e.target.checked)}
              disabled={twoFASaving}
              style={styles.checkboxInput}
            />
            <span>{t('security.twoFA.enableCheckbox')}</span>
          </label>

          {/* Method selector (only shown when enabled) */}
          {twoFAEnabled && (
            <div style={styles.methodGroup}>
              <label style={styles.methodGroupLabel}>
                {t('security.twoFA.methodSectionLabel')}
              </label>
              <div style={styles.methodOptions}>
                <label style={styles.methodOptionLabel}>
                  <input
                    type="radio"
                    value="email"
                    checked={twoFAMethod === 'email'}
                    onChange={(e) => setTwoFAMethod(e.target.value)}
                    disabled={twoFASaving}
                    style={styles.radioInput}
                  />
                  <span>{t('security.twoFA.methodEmail')}</span>
                </label>
                <label style={styles.methodOptionLabel}>
                  <input
                    type="radio"
                    value="sms"
                    checked={twoFAMethod === 'sms'}
                    onChange={(e) => setTwoFAMethod(e.target.value)}
                    disabled={twoFASaving}
                    style={styles.radioInput}
                  />
                  <span>{t('security.twoFA.methodSMS')}</span>
                </label>
              </div>
            </div>
          )}

          {/* Save / Cancel */}
          <div style={styles.actionButtons}>
            <button
              onClick={handle2FASave}
              disabled={twoFASaving}
              style={styles.saveButton(twoFASaving)}
            >
              {t('security.twoFA.save')}
            </button>
            <button
              onClick={onCancel}
              disabled={twoFASaving}
              style={styles.cancelButton(twoFASaving)}
            >
              {t('security.twoFA.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* ── Warning: no verification methods + 2FA disabled ──────────────── */}
      {!hasVerificationMethods && !twoFAEnabled && (
        <p style={styles.warningText}>
          {t('security.twoFA.warningNoVerification')}
        </p>
      )}
    </div>
  );
}
