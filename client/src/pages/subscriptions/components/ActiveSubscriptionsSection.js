/**
 * ActiveSubscriptionsSection Component
 * Displays user's current active subscriptions (Stripe + Google Play)
 */

import React from 'react';
import { useTranslation } from '../../../context/TranslationContext';
import SubscriptionCard from './SubscriptionCard';

/**
 * GooglePlaySubscriptionCard
 * Read-only display card for subscriptions purchased via Google Play.
 * No cancel/switch controls — those are handled in the mobile app.
 */
function GooglePlaySubscriptionCard({ googlePlaySubscription }) {
  const { t } = useTranslation();

  const planLabel = googlePlaySubscription.plan === 'annual'
    ? t('subscriptions.annualSubscription')
    : t('subscriptions.monthlySubscription');

  const expiresDate = googlePlaySubscription.expiresAt
    ? new Date(googlePlaySubscription.expiresAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      })
    : null;

  return (
    <div className="subscription-card-simple">
      <div className="sub-simple-main">
        {/* Left: Plan info */}
        <div className="sub-simple-left">
          <div className="sub-simple-plan">
            {planLabel}
            <span className="sub-simple-interval"> ({t('subscriptions.purchasedViaGooglePlay')})</span>
          </div>
        </div>

        {/* Center: Status */}
        <div className="sub-simple-status">
          <span className="sub-simple-badge" style={{ backgroundColor: '#4caf50' }}>
            ✅ {t('subscriptions.active')}
          </span>
        </div>

        {/* Right: Expiry */}
        <div className="sub-simple-right">
          {expiresDate && (
            <div className="sub-simple-expires">
              {t('subscriptions.expires')} {expiresDate}
            </div>
          )}
          <div className="sub-google-play-note">
            🔒 {t('subscriptions.purchasedViaGooglePlay')}
          </div>
        </div>
      </div>

      <style>{`
        .subscription-card-simple {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          margin-bottom: 1rem;
          overflow: hidden;
        }
        .sub-simple-main {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          gap: 1.5rem;
        }
        .sub-simple-left { flex: 1; }
        .sub-simple-plan { font-size: 1.1rem; font-weight: 600; color: #333; }
        .sub-simple-interval { font-size: 0.9rem; font-weight: normal; color: #666; }
        .sub-simple-status { flex: 0 0 auto; }
        .sub-simple-badge {
          display: inline-block;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-weight: bold;
          font-size: 0.9rem;
          white-space: nowrap;
        }
        .sub-simple-right {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .sub-simple-expires { font-size: 0.9rem; color: #666; white-space: nowrap; }
        .sub-google-play-note { font-size: 0.8rem; color: #888; white-space: nowrap; }
        @media (max-width: 768px) {
          .sub-simple-main {
            flex-direction: column;
            align-items: flex-start;
            padding: 1rem;
            gap: 0.75rem;
          }
          .sub-simple-right { width: 100%; justify-content: flex-start; }
        }
      `}</style>
    </div>
  );
}

export default function ActiveSubscriptionsSection({
  subscriptions,
  activeSubscriptions,
  pricesByProduct,
  expandedSub,
  onToggle,
  onChangeClick,
  onChangeSubscription,
  billing,
  googlePlaySubscription
}) {
  const { t } = useTranslation();
  
  const hasStripe = subscriptions.length > 0;
  const hasGooglePlay = googlePlaySubscription?.hasSubscription === true;

  if (!hasStripe && !hasGooglePlay) {
    return null;
  }

  return (
    <div className="current-subscriptions">
      <h3>{t('subscriptions.yourActiveSubscriptions')}</h3>
      <div className="subscriptions-list">
        {/* Google Play subscriptions (read-only) */}
        {hasGooglePlay && (
          <GooglePlaySubscriptionCard googlePlaySubscription={googlePlaySubscription} />
        )}

        {/* Stripe subscriptions */}
        {subscriptions.map(subscription => {
          const isActive = activeSubscriptions[subscription.id] !== false;
          const isCanceling = subscription.cancel_at_period_end;

          return (
            <SubscriptionCard
              key={subscription.id}
              subscription={subscription}
              isActive={isActive}
              isCanceling={isCanceling}
              pricesByProduct={pricesByProduct}
              expandedSub={expandedSub}
              onToggle={onToggle}
              onChangeClick={onChangeClick}
              onChangeSubscription={onChangeSubscription}
              billing={billing}
            />
          );
        })}
      </div>
    </div>
  );
}
