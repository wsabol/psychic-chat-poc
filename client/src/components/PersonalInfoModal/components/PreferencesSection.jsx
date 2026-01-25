import React from 'react';
import styles from '../PersonalInfoModal.module.css';

/**
 * PreferencesSection - Sex and address preference fields
 * Extracted from PersonalInfoModal for better modularity
 */
export function PreferencesSection({ formData, handleChange, isTemporaryAccount }) {
  return (
    <>
      <div className={styles.formField}>
        <label className={styles.label}>
          Sex{' '}
          {!isTemporaryAccount && <span className={styles.required}>*</span>}
          {isTemporaryAccount && <span className={styles.optional}>(Optional)</span>}
        </label>
        <select
          name="sex"
          value={formData.sex}
          onChange={handleChange}
          required={!isTemporaryAccount}
          className={styles.select}
        >
          <option value="">Select...</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Non-binary">Non-binary</option>
          <option value="Prefer not to say">Prefer not to say</option>
          <option value="Unspecified">Unspecified</option>
        </select>
      </div>

      <div className={styles.formField}>
        <label className={styles.label}>
          How should the oracle address you? <span className={styles.optional}>(Optional)</span>
        </label>
        <input
          type="text"
          name="addressPreference"
          value={formData.addressPreference}
          onChange={handleChange}
          placeholder="e.g., Alex, Sarah, Your Majesty, etc."
          className={styles.input}
        />
      </div>
    </>
  );
}
