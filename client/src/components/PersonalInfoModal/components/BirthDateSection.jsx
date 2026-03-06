import React from 'react';
import styles from '../PersonalInfoModal.module.css';

/**
 * BirthDateSection - Birth date, time, and timezone fields
 * Extracted from PersonalInfoModal for better modularity
 */
export function BirthDateSection({ formData, handleChange }) {
  return (
    <div className={styles.formSection}>
      <h3 className={styles.sectionTitle}>⏰ Date of Birth</h3>
      
      <div className={styles.formField}>
        <label className={styles.label}>
          Date of Birth <span className={styles.required}>*</span>
        </label>
        <input
          type="text"
          name="birthDate"
          value={formData.birthDate}
          onChange={handleChange}
          placeholder="dd-mmm-yyyy, dd mmm yyyy, or dd/mmm/yyyy (e.g., 26-Jun-1995 or 26 jun 1995)"
          required
          className={styles.input}
        />
      </div>

      <div className={styles.formField}>
        <label className={styles.label}>
          Time of Birth <span className={styles.optional}>(Optional)</span>
        </label>
        <input
          type="text"
          name="birthTime"
          value={formData.birthTime}
          onChange={handleChange}
          placeholder="HH:MM (e.g., 14:30 or 02:30)"
          className={styles.input}
        />
      </div>

      <div className={styles.formField}>
        <label className={styles.label}>
          Timezone <span className={styles.optional}>(Optional)</span>
        </label>
        <input
          type="text"
          name="birthTimezone"
          value={formData.birthTimezone}
          onChange={handleChange}
          placeholder="e.g., America/New_York, Europe/London"
          className={styles.input}
        />
      </div>
    </div>
  );
}
