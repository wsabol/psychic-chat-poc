/**
 * SubscriptionCard Component
 * Individual subscription display with toggle and actions
 * ACH subscriptions will show 'active' status immediately and charge within 4 business days
 */

import React from 'react';

export default function SubscriptionCard({
  subscription,
  isActive,
  isCanceling,
  pricesByProduct,
  expandedSub,
  onToggle,
  onChangeClick,
  onChangeSubscription,
  billing
}) {
  const planName = subscription.items?.data?.[0]?.price?.product?.name || 'Subscription';
  const interval = subscription.items?.data?.[0]?.price?.recurring?.interval || 'unknown';
  
  // Format status display
  const getStatusDisplay = (status) => {
    switch(status) {
      case 'active':
        return '✅ ACTIVE';
      case 'incomplete':
        return '⏳ INCOMPLETE';
      case 'incomplete_expired':
        return '❌ EXPIRED';
      case 'past_due':
        return '⚠️ PAST DUE';
      case 'canceled':
        return '🛑 CANCELED';
      default:
        return status.toUpperCase();
    }
  };
  
  const getStatusColor = (status) => {
    switch(status) {
      case 'active':
        return '#4caf50';
      case 'incomplete':
        return '#ff9800';
      case 'incomplete_expired':
        return '#f44336';
      case 'past_due':
        return '#ff9800';
      default:
        return '#666';
    }
  };

  return (
    <div className={`subscription-card ${isCanceling ? 'canceling' : 'active'}`}>
      {/* Header with Toggle */}
      <div className="sub-header-with-toggle">
        <div className="sub-header">
          <h4>{planName}</h4>
          <span className={`status-badge status-${subscription.status}`} style={{
            backgroundColor: getStatusColor(subscription.status),
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {getStatusDisplay(subscription.status)}
          </span>
        </div>
        {!isCanceling && subscription.status === 'active' && (
          <div className="subscription-toggle">
            <input
              type="checkbox"
              id={`sub-toggle-${subscription.id}`}
              checked={isActive}
              onChange={() => onToggle(subscription.id, isActive)}
              className="toggle-checkbox"
            />
            <label htmlFor={`sub-toggle-${subscription.id}`} className="toggle-label">
              {isActive ? 'Active' : 'Paused'}
            </label>
          </div>
        )}
      </div>

      {/* Details */}
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
        
        {/* ACH subscription info */}
        {subscription.status === 'active' && (
          <div className="detail-row ach-info">
            <span className="detail-label">🏦 ACH Status:</span>
            <span className="detail-value">
              First charge will process within 4 business days by {new Date(subscription.current_period_end * 1000).toLocaleDateString()}
            </span>
          </div>
        )}
        
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

      {/* Actions */}
      <div className="sub-actions">
        {onChangeClick && (
          <button
            className="btn-secondary btn-small"
            onClick={() => onChangeClick(subscription.id)}
            disabled={subscription.status !== 'active'}
          >
            {expandedSub === subscription.id ? '✕ Close' : '📋 Change Plan'}
          </button>
        )}
      </div>

      {/* Change Plan Options */}
      {expandedSub === subscription.id && subscription.status === 'active' && (
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
                      onClick={() => onChangeSubscription(subscription, price.id)}
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
      
      <style>{`
        .ach-info {
          background-color: #f0f8ff;
          padding: 8px;
          border-radius: 4px;
          border-left: 3px solid #4caf50;
        }
        
        .btn-disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
