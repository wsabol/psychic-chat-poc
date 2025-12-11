/**
 * SubscriptionInfo Component
 * Helpful information about how subscriptions work
 */

import React from 'react';

export default function SubscriptionInfo() {
  return (
    <div className="subscription-info">
      <h3>How Subscriptions Work</h3>
      <ul>
        <li>✓ <strong>Automatic Renewal:</strong> Your subscription automatically renews at the end of each billing period</li>
        <li>✓ <strong>Cancel Anytime:</strong> Uncheck the box next to your subscription to cancel</li>
        <li>✓ <strong>No Interruption:</strong> Your service continues until the end of your current billing period</li>
        <li>✓ <strong>Plan Changes:</strong> When changing plans, your new subscription starts after your current period ends</li>
        <li>✓ <strong>Simple Billing:</strong> All charges appear clearly on your invoices</li>
      </ul>
    </div>
  );
}
