/**
 * SubscriptionInfo Component
 * Helpful information about how subscriptions work
 */

import React from 'react';
import { useTranslation } from '../../../context/TranslationContext';

export default function SubscriptionInfo() {
  const { t } = useTranslation();
  return (
    <div className="subscription-info">
      <h3>{t('subscriptions.howSubscriptionsWork')}</h3>
      <ul>
        <li>✓ {t('subscriptions.automaticRenewalInfo')}</li>
        <li>✓ {t('subscriptions.cancelAnytime')}</li>
        <li>✓ {t('subscriptions.noInterruption')}</li>
        <li>✓ {t('subscriptions.planChanges')}</li>
        <li>✓ {t('subscriptions.simpleBilling')}</li>
      </ul>
    </div>
  );
}
