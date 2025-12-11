import React, { useState, useEffect } from 'react';
import { useBilling } from '../hooks/useBilling';
import './SubscriptionsPage.css';

/**
 * SubscriptionsPage - Browse plans and manage subscriptions
 * Features:
 * - Auto-renewal with cancel anytime
 * - Cancel by unchecking checkbox
 * - Subscription continues until period end
 * - Upgrade/Downgrade: new plan starts at end of current period
 */
export default function SubscriptionsPage({ userId, token, auth }) {
  const billing = useBilling(token);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [activeSubscriptions, setActiveSubscriptions] = useState({});
  const [expandedSub, setExpandedSub] = useState(null);

  // Load data on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    billing.fetchAvailablePrices();
    billing.fetchSubscriptions();
  }, [])

  // Initialize active subscriptions state
  useEffect(() => {
    const active = {};
    billing.subscriptions?.forEach(sub => {
      if (sub.status !== 'canceled' && !sub.cancel_at_period_end) {
        active[sub.id] = true;
      }
    });
    setActiveSubscriptions(active);
  }, [billing.subscriptions]);

  // Group prices by product
  const groupPricesByProduct = () => {
    const grouped = {};
    billing.availablePrices.forEach(price => {
      const productId = price.product?.id || 'unknown';
      if (!grouped[productId]) {
        grouped[productId] = {
          product: price.product,
          prices: [],
        };
      }
      grouped[productId].prices.push(price);
    });
    return grouped;
  };

  const formatPrice = (price) => {
    const amount = (price.unit_amount / 100).toFixed(2);
    const interval = price.recurring?.interval || '';
    
    if (interval === 'month') {
      return `$${amount}/month`;
    } else if (interval === 'year') {
      return `$${amount}/year`;
    }
    return `$${amount}`;
  };

  const getCurrentSubscriptionInterval = (subscription) => {
    return subscription.items?.data?.[0]?.price?.recurring?.interval || 'unknown';
  };

  const handleSubscribe = async (priceId) => {
    try {
      setError(null);
      const result = await billing.createSubscription(priceId);
      
      if (result.clientSecret && window.Stripe) {
        // If payment confirmation needed
        const stripe = window.Stripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);
        const { error: stripeError } = await stripe.confirmCardPayment(result.clientSecret);
        
        if (stripeError) {
          setError(stripeError.message);
          return;
        }
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to create subscription');
    }
  };

  const handleToggleSubscription = async (subscriptionId, isActive) => {
    const newState = !isActive;
    
    if (newState === false) {
      // Canceling subscription
      if (!window.confirm(
        'Are you sure you want to cancel this subscription?\n\n' +
        'Your subscription will continue until the end of your current billing period, then stop.\n\n' +
        'You can reactivate your subscription at any time.'
      )) {
        return;
      }
    }

    try {
      setError(null);
      if (newState === false) {
        // Cancel subscription
        await billing.cancelSubscription(subscriptionId);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
      // Update local state
      setActiveSubscriptions(prev => ({
        ...prev,
        [subscriptionId]: newState
      }));
    } catch (err) {
      setError(err.message || 'Failed to update subscription');
    }
  };

  const handleChangeSubscription = async (currentSub, newPriceId) => {
    if (!window.confirm(
      'Ready to change your subscription plan?\n\n' +
      'Your current subscription will be canceled.\n' +
      'Your new subscription will start at the end of your current billing period.\n\n' +
      'This ensures a smooth transition without any interruption.'
    )) {
      return;
    }

    try {
      setError(null);
      // Cancel current subscription at period end
      await billing.cancelSubscription(currentSub.id);
      // Create new subscription (backend will handle billing_cycle_anchor if needed)
      const result = await billing.createSubscription(newPriceId);
      
      if (result.clientSecret && window.Stripe) {
        const stripe = window.Stripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);
        const { error: stripeError } = await stripe.confirmCardPayment(result.clientSecret);
        if (stripeError) {
          setError(stripeError.message);
          return;
        }
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to change subscription');
    }
  };

  const pricesByProduct = groupPricesByProduct();
  const activeSubscriptionsList = billing.subscriptions?.filter(sub => sub.status !== 'canceled') || [];

  return (
    <div className="subscriptions-page">
      {/* Header */}
      <div className="section-header">
        <h2>📋 Subscriptions</h2>
        <p>Manage your subscription plans and billing</p>
      </div>

      {/* Alerts */}
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">✓ Changes saved successfully!</div>}

      {/* Auto-Renewal Notice */}
      <div className="auto-renewal-notice">
        <div className="notice-icon">🔄</div>
        <div className="notice-content">
          <h4>Automatic Renewal</h4>
          <p>
            Your subscription automatically renews at the end of each billing period. 
            <strong> You can cancel anytime</strong> by unchecking the checkbox below. 
            Your subscription will continue until the end of the current period, then stop.
          </p>
        </div>
      </div>

      {/* Current Subscriptions */}
      {activeSubscriptionsList.length > 0 && (
        <div className="current-subscriptions">
          <h3>Your Active Subscriptions</h3>
          <div className="subscriptions-list">
            {activeSubscriptionsList.map(subscription => {
              const isActive = activeSubscriptions[subscription.id] !== false;
              const isCanceling = subscription.cancel_at_period_end;
              const planName = subscription.items?.data?.[0]?.price?.product?.name || 'Subscription';
              const interval = getCurrentSubscriptionInterval(subscription);
              
              return (
                <div 
                  key={subscription.id} 
                  className={`subscription-card ${isCanceling ? 'canceling' : 'active'}`}
                >
                  {/* Subscription Header with Toggle */}
                  <div className="sub-header-with-toggle">
                    <div className="sub-header">
                      <h4>{planName}</h4>
                      <span className={`status-badge status-${subscription.status}`}>
                        {subscription.status.toUpperCase()}
                      </span>
                    </div>
                    {!isCanceling && (
                      <div className="subscription-toggle">
                        <input
                          type="checkbox"
                          id={`sub-toggle-${subscription.id}`}
                          checked={isActive}
                          onChange={() => handleToggleSubscription(subscription.id, isActive)}
                          className="toggle-checkbox"
                        />
                        <label htmlFor={`sub-toggle-${subscription.id}`} className="toggle-label">
                          {isActive ? 'Active' : 'Paused'}
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Subscription Details */}
                  <div className="sub-details">
                    <div className="detail-row">
                      <span className="detail-label">Price:</span>
                      <span className="detail-value">
                        ${(subscription.items?.data?.[0]?.price?.unit_amount / 100 || 0).toFixed(2)}
                        <span className="interval-badge">{interval === 'month' ? '/mo' : '/yr'}</span>
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Current Period:</span>
                      <span className="detail-value">
                        {new Date(subscription.current_period_start * 1000).toLocaleDateString()} 
                        {' '} - {' '}
                        {new Date(subscription.current_period_end * 1000).toLocaleDateString()}
                      </span>
                    </div>
                    {isCanceling && (
                      <div className="detail-row cancellation-notice">
                        <span className="detail-label">⚠️ Cancellation:</span>
                        <span className="detail-value">
                          This subscription will stop on{' '}
                          <strong>{new Date(subscription.current_period_end * 1000).toLocaleDateString()}</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Change Plan Option */}
                  <div className="sub-actions">
                    <button
                      className="btn-secondary btn-small"
                      onClick={() => setExpandedSub(expandedSub === subscription.id ? null : subscription.id)}
                    >
                      {expandedSub === subscription.id ? '✕ Close' : '📋 Change Plan'}
                    </button>
                  </div>

                  {/* Change Plan Options */}
                  {expandedSub === subscription.id && (
                    <div className="change-plan-options">
                      <h5>Switch to a Different Plan</h5>
                      <div className="plan-options-grid">
                        {Object.entries(pricesByProduct).map(([productId, { product, prices }]) => (
                          prices.map(price => {
                            const newInterval = price.recurring?.interval;
                            const currentPrice = subscription.items?.data?.[0]?.price;
                            const isSamePrice = price.id === currentPrice?.id;
                            
                            return (
                              <div key={price.id} className="plan-option-card">
                                <div className="plan-option-name">
                                  {product?.name} ({newInterval === 'month' ? 'Monthly' : 'Yearly'})
                                </div>
                                <div className="plan-option-price">
                                  ${(price.unit_amount / 100).toFixed(2)}
                                  <span className="plan-option-interval">
                                    /{newInterval === 'month' ? 'mo' : 'yr'}
                                  </span>
                                </div>
                                <button
                                  className={`btn-small ${isSamePrice ? 'btn-disabled' : 'btn-primary'}`}
                                  onClick={() => handleChangeSubscription(subscription, price.id)}
                                  disabled={isSamePrice || billing.loading}
                                >
                                  {isSamePrice ? 'Current Plan' : 'Switch'}
                                </button>
                              </div>
                            );
                          })
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Plans Section */}
      {activeSubscriptionsList.length === 0 && (
        <div className="available-plans">
          <h3>Choose a Plan to Get Started</h3>
          <div className="plans-grid">
            {Object.keys(pricesByProduct).length > 0 ? (
              Object.entries(pricesByProduct).map(([productId, { product, prices }]) => (
                <div key={productId} className="plan-card">
                  <div className="plan-header">
                    <h4>{product?.name || 'Plan'}</h4>
                    {product?.description && <p className="plan-description">{product.description}</p>}
                  </div>

                  <div className="plan-pricing">
                    {prices.map(price => (
                      <div key={price.id} className="price-option">
                        <div className="price-amount">{formatPrice(price)}</div>
                        <div className="price-interval">
                          {price.recurring?.interval === 'month' && 'per month'}
                          {price.recurring?.interval === 'year' && 'per year'}
                          {!price.recurring?.interval && 'one-time'}
                        </div>
                        <button
                          className="btn-primary"
                          onClick={() => handleSubscribe(price.id)}
                          disabled={billing.loading}
                        >
                          {billing.loading ? 'Processing...' : 'Subscribe Now'}
                        </button>
                      </div>
                    ))}
                  </div>

                  {product?.features && (
                    <div className="plan-features">
                      <h5>Features:</h5>
                      <ul>
                        {product.features.map((feature, idx) => (
                          <li key={idx}>✓ {feature}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>No subscription plans available yet. Check back soon!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Past Subscriptions */}
      {billing.subscriptions && billing.subscriptions.some(sub => sub.status === 'canceled') && (
        <div className="past-subscriptions">
          <h3>Past Subscriptions</h3>
          <div className="subscriptions-list">
            {billing.subscriptions
              .filter(sub => sub.status === 'canceled')
              .map(subscription => (
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
      )}

      {/* Info Section */}
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
    </div>
  );
}
