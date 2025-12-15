/**
 * AutoRenewalNotice Component
 * Displays automatic renewal information
 */

import React from 'react';

export default function AutoRenewalNotice() {
  return (
    <div className="auto-renewal-notice">
      <div className="notice-icon">🔄</div>
      <div className="notice-content">
        <h4>Automatic Renewal</h4>
        <p>
          Your subscription automatically renews at the end of each billing period and grants you 
          <strong> unlimited access to the Psychic Oracle</strong>. You can cancel anytime by unchecking 
          the checkbox below. Your subscription will continue until the end of the current period, then stop.
        </p>
      </div>
    </div>
  );
}
