/**
 * SecurityModal - Refactored
 * Main entry point for the security settings modal
 * 
 * Refactored from monolithic SecurityModal.js to modular structure:
 * - Separated concerns into hooks, components, and utilities
 * - Extracted inline styles to CSS modules
 * - Improved maintainability and testability
 */

import React from 'react';
import styles from './SecurityModal.module.css';
import { use2FASettings } from './hooks/use2FASettings';
import { usePasswordChange } from './hooks/usePasswordChange';
import StatusMessage from './components/StatusMessage';
import TwoFactorSection from './components/TwoFactorSection';
import PasswordSection from './components/PasswordSection';
import SecurityTips from './components/SecurityTips';

const SecurityModal = ({ userId, token, onClose }) => {
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

  // Use custom hooks for separated concerns
  const twoFAState = use2FASettings(userId, token, API_URL);
  const passwordState = usePasswordChange(userId, token, API_URL);

  // Loading state
  if (twoFAState.loading) {
    return (
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <div className={styles.loadingContainer}>
            <p>Loading security settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.modalClose} onClick={onClose}>×</button>

        <h2>Account Security</h2>

        {/* Global status messages */}
        <StatusMessage type="error" message={twoFAState.error || passwordState.error} />
        <StatusMessage type="success" message={twoFAState.success || passwordState.success} />

        {/* Two-Factor Authentication Section */}
        <TwoFactorSection twoFAState={twoFAState} />

        {/* Password Change Section */}
        <PasswordSection passwordState={passwordState} />

        {/* Security Tips */}
        <SecurityTips />
      </div>
    </div>
  );
};

export default SecurityModal;
