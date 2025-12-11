/**
 * PastSubscriptionsSection Component
 * Display canceled/past subscriptions
 */

import React from 'react';

export default function PastSubscriptionsSection({ subscriptions }) {
  const pastSubs = subscriptions.filter(sub => sub.status === 'canceled');

  if (pastSubs.length === 0) {
    return null;
  }

  return (
    <div className="past-subscriptions">
      <h3>Past Subscriptions</h3>
      <div className="subscriptions-list">
        {pastSubs.map(subscription => (
          <div key={subscription.id} className="subscription-card inactive">
            <div className="sub-header">
              <h4>{subscription.items?.data?.[0]?.price?.product?.name || 'Subscription'}</h4>
              <span className="status-badge status-canceled">CANCELED</span>
            </div>
            <div className="sub-details">
              <div className="detail-row">
                <span className="detail-label">Ended:</span>
                <span className="detail-value">
                  {new Date(subscription.ended_at * 1000).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
