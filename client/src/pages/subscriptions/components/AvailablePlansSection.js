/**
 * AvailablePlansSection Component
 * Display available subscription plans for new subscribers
 */

import React from 'react';

function formatPrice(price) {
  const amount = (price.unit_amount / 100).toFixed(2);
  const interval = price.recurring?.interval || '';

  if (interval === 'month') {
    return `$${amount}/month`;
  } else if (interval === 'year') {
    return `$${amount}/year`;
  }
  return `$${amount}`;
}

export default function AvailablePlansSection({
  pricesByProduct,
  onSubscribe,
  billing,
  showSection,
  defaultPaymentMethodId
}) {
  if (!showSection) {
    return null;
  }

  const noPaymentMethod = !defaultPaymentMethodId;

  return (
    <div className="available-plans">
      <h3>Choose a Plan to Get Started</h3>
      
      {noPaymentMethod && (
        <div className="alert alert-warning">
          <strong>⚠️ Payment Method Required:</strong> Please add a payment method in your billing settings before subscribing to a plan.
        </div>
      )}

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
                      onClick={() => onSubscribe(price.id)}
                      disabled={billing.loading || noPaymentMethod}
                      title={noPaymentMethod ? 'Please add a payment method first' : ''}
                    >
                      {billing.loading ? 'Processing...' : (noPaymentMethod ? 'Add Payment Method First' : 'Subscribe Now')}
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
  );
}
