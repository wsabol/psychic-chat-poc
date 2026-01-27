/**
 * Security Tips Component
 * Displays helpful security tips for users
 */

import React from 'react';
import styles from '../SecurityModal.module.css';

const SecurityTips = () => {
  return (
    <div className={`${styles.securitySection} ${styles.securityTips}`}>
      <h3>Security Tips</h3>
      <ul>
        <li>Keep your phone number updated in case you need to recover your account</li>
        <li>Use a strong, unique password that you don't use elsewhere</li>
        <li>Don't share your 2FA codes with anyone</li>
        <li>Enable 2FA for the highest level of account protection</li>
      </ul>
    </div>
  );
};

export default SecurityTips;
