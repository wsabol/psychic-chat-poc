/**
 * ActiveSubscriptionsSection Component
 * Displays user's current active subscriptions
 */

import React from 'react';
import SubscriptionCard from './SubscriptionCard';

export default function ActiveSubscriptionsSection({
  subscriptions,
  activeSubscriptions,
  pricesByProduct,
  expandedSub,
  onToggle,
  onChangeClick,
  onChangeSubscription,
  billing
}) {
  if (subscriptions.length === 0) {
    return null;
  }

  return (
    <div className="current-subscriptions">
      <h3>Your Active Subscriptions</h3>
      <div className="subscriptions-list">
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
