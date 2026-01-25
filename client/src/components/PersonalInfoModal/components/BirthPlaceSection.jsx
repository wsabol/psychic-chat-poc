import React from 'react';
import { COUNTRIES } from '../../../data/countries';
import styles from '../PersonalInfoModal.module.css';

/**
 * BirthPlaceSection - Country, province/state, and city fields
 * Extracted from PersonalInfoModal for better modularity
 */
export function BirthPlaceSection({ formData, handleChange }) {
  return (
    <div className={styles.formSection}>
      <h3 className={styles.sectionTitle}>📍 Place of Birth</h3>
      
      <div className={styles.formField}>
        <label className={styles.label}>
          Country <span className={styles.optional}>(Optional)</span>
        </label>
        <select
          name="birthCountry"
          value={formData.birthCountry}
          onChange={handleChange}
          className={styles.select}
        >
          <option value="">-- Select Country --</option>
          {COUNTRIES.map((country, idx) => (
            <option key={idx} value={country}>{country}</option>
          ))}
        </select>
      </div>

      <div className={styles.formField}>
        <label className={styles.label}>
          State / Province <span className={styles.optional}>(Optional)</span>
        </label>
        <input
          type="text"
          name="birthProvince"
          value={formData.birthProvince}
          onChange={handleChange}
          placeholder="e.g., California, Ontario, Tokyo"
          className={styles.input}
        />
      </div>

      <div className={styles.formField}>
        <label className={styles.label}>
          City <span className={styles.optional}>(Optional)</span>
        </label>
        <input
          type="text"
          name="birthCity"
          value={formData.birthCity}
          onChange={handleChange}
          placeholder="e.g., New York, Toronto, Tokyo"
          className={styles.input}
        />
      </div>
    </div>
  );
}
