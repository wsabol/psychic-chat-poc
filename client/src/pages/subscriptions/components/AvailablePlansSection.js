/**
 * AvailablePlansSection Component
 * Display available subscription plans for new subscribers
 */

import React from 'react';
import { useTranslation } from '../../../context/TranslationContext';

function formatPrice(price) {
  const amount = (price.unit_amount / 100).toFixed(2);
  // Just return the amount without the interval text - let translations handle that
  return `$${amount}`;
}

export default function AvailablePlansSection({
  pricesByProduct,
  onSubscribe,
  billing,
  showSection,
  defaultPaymentMethodId
}) {
  const { t } = useTranslation();
  
  if (!showSection) {
    return null;
  }

  const noPaymentMethod = !defaultPaymentMethodId;

  return (
    <div className="available-plans">
      <h3>{t('subscriptions.chooseAPlan')}</h3>
      
      {noPaymentMethod && (
        <div className="alert alert-warning">
          <strong>⚠️ {t('subscriptions.paymentMethodRequired')}:</strong> {t('subscriptions.paymentMethodRequiredDesc')}
        </div>
      )}

      <div className="plans-grid">
        {Object.keys(pricesByProduct).length > 0 ? (
          Object.entries(pricesByProduct).map(([productId, { product, prices }]) => (
            <div key={productId} className="plan-card">
                            <div className="plan-header">
                <h4>
                  {product?.name?.toLowerCase().includes('monthly') ? t('subscriptions.monthlySubscription') :
                   product?.name?.toLowerCase().includes('annual') || product?.name?.toLowerCase().includes('yearly') ? t('subscriptions.annualSubscription') :
                   product?.name || 'Plan'}
                </h4>
                {product?.description && (
                  <p className="plan-description">
                    {product?.name?.toLowerCase().includes('monthly') ? t('subscriptions.monthlyDescription') :
                     product?.name?.toLowerCase().includes('annual') || product?.name?.toLowerCase().includes('yearly') ? t('subscriptions.annualDescription') :
                     product.description}
                  </p>
                )}
              </div>

              <div className="plan-pricing">
                {prices.map(price => (
                  <div key={price.id} className="price-option">
                                        <div className="price-display">
                      <span className="price-amount">{formatPrice(price)}</span>
                      <span className="price-interval">
                        {price.recurring?.interval === 'month' && `/${t('subscriptions.perMonth').toLowerCase()}`}
                        {price.recurring?.interval === 'year' && `/${t('subscriptions.perYear').toLowerCase()}`}
                        {!price.recurring?.interval && ` ${t('subscriptions.oneTime')}`}
                      </span>
                    </div>
                                        <button
                      className="btn-primary"
                      onClick={() => onSubscribe(price.id)}
                      disabled={billing.loading || noPaymentMethod}
                      title={noPaymentMethod ? t('subscriptions.addPaymentMethodFirst') : ''}
                    >
                      {billing.loading ? t('subscriptions.processingEllipsis') : (noPaymentMethod ? t('subscriptions.addPaymentMethodFirst') : t('subscriptions.subscribeNow'))}
                    </button>
                  </div>
                ))}
              </div>

                            {product?.features && (
                <div className="plan-features">
                  <h5>{t('subscriptions.features')}:</h5>
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
            <p>{t('subscriptions.noPlanAvailable')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
