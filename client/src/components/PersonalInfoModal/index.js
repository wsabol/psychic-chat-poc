import React from 'react';
import { usePersonalInfoForm } from './hooks/usePersonalInfoForm';
import { PersonalInfoSection } from './components/PersonalInfoSection';
import { BirthDateSection } from './components/BirthDateSection';
import { BirthPlaceSection } from './components/BirthPlaceSection';
import { PreferencesSection } from './components/PreferencesSection';
import styles from './PersonalInfoModal.module.css';

/**
 * PersonalInfoModal - Refactored version
 * Now uses modular components and custom hooks for better maintainability
 * Reduced from 480+ lines to ~100 lines by extracting concerns
 */
function PersonalInfoModal({ userId, token, isOpen, isTemporaryAccount, onClose, onSave }) {
  const { formData, loading, error, success, handleChange, handleSubmit } = usePersonalInfoForm(
    userId,
    token,
    isOpen,
    isTemporaryAccount
  );

  if (!isOpen) return null;

  const onFormSubmit = async (e) => {
    const result = await handleSubmit(e);
    if (result?.success && onSave) {
      onSave();
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Personal Information</h2>
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Status Messages */}
        {error && (
          <p className={styles.errorText}>
            ⚠️ Error: {error}
          </p>
        )}
        {success && (
          <p className={styles.successText}>
            ✓ Saved successfully!
          </p>
        )}

        {/* Form */}
        <form onSubmit={onFormSubmit}>
          {/* Personal Info Section */}
          <PersonalInfoSection
            formData={formData}
            handleChange={handleChange}
            isTemporaryAccount={isTemporaryAccount}
          />

          {/* Birth Date Section */}
          <BirthDateSection
            formData={formData}
            handleChange={handleChange}
          />

          {/* Birth Place Section */}
          <BirthPlaceSection
            formData={formData}
            handleChange={handleChange}
          />

          {/* Preferences Section */}
          <PreferencesSection
            formData={formData}
            handleChange={handleChange}
            isTemporaryAccount={isTemporaryAccount}
          />

          {/* Action Buttons */}
          <div className={styles.buttonGroup}>
            <button
              type="submit"
              disabled={loading}
              className={styles.submitButton}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PersonalInfoModal;
