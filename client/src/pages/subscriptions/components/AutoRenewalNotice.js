/**
 * AutoRenewalNotice Component
 * Displays automatic renewal information
 */

import React from 'react';
import { useTranslation } from '../../../context/TranslationContext';

export default function AutoRenewalNotice() {
  const { t } = useTranslation();
  return (
    <div className="auto-renewal-notice">
      <div className="notice-icon">🔄</div>
      <div className="notice-content">
        <h4>{t('subscriptions.automaticRenewal')}</h4>
        <p>
          {t('subscriptions.automaticRenewalDesc')}
        </p>
      </div>
    </div>
  );
}
