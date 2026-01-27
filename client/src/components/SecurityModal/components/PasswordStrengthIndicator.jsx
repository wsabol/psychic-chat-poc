/**
 * Password strength indicator component
 * Displays visual feedback on password strength
 */

import React from 'react';
import styles from '../SecurityModal.module.css';
import { getPasswordStrengthLabel, getPasswordRequirements } from '../utils/passwordValidation';

const PasswordStrengthIndicator = ({ password, strength }) => {
  const strengthLabel = getPasswordStrengthLabel(strength);
  const requirements = getPasswordRequirements(password);

  return (
    <>
      <div className={styles.passwordStrength}>
        <div className={styles.strengthBar}>
          <div
            className={styles.strengthFill}
            style={{
              width: `${(strength / 4) * 100}%`,
              backgroundColor: strengthLabel.color
            }}
          />
        </div>
        <span style={{ color: strengthLabel.color }}>
          {strengthLabel.label}
        </span>
      </div>

      <div className={styles.passwordRequirements}>
        <p>Password must contain:</p>
        <ul>
          {requirements.map((req, index) => (
            <li key={index} className={req.met ? styles.requirementMet : styles.requirementUnmet}>
              {req.met ? '✓' : '✗'} {req.label}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
};

export default PasswordStrengthIndicator;
