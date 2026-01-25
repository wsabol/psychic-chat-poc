import React from 'react';
import styles from '../PersonalInfoModal.module.css';

/**
 * PersonalInfoSection - Name and Email fields
 * Extracted from PersonalInfoModal for better modularity
 */
export function PersonalInfoSection({ formData, handleChange, isTemporaryAccount }) {
  return (
    <>
      {!isTemporaryAccount && (
        <>
          <div className={styles.formField}>
            <label className={styles.label}>
              First Name <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              className={styles.input}
            />
          </div>

          <div className={styles.formField}>
            <label className={styles.label}>
              Last Name <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              className={styles.input}
            />
          </div>
        </>
      )}

      <div className={styles.formField}>
        <label className={styles.label}>
          Email <span className={styles.required}>*</span>
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          className={styles.input}
        />
        {isTemporaryAccount && (
          <p className={styles.helpText}>
            This temporary email can be changed when you create an account
          </p>
        )}
      </div>
    </>
  );
}
