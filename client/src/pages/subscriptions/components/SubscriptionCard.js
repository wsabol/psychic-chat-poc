/**
 * SubscriptionCard Component - SIMPLIFIED
 * Show: Plan name, Status (Active/Canceling), Expires date
 * Keep it compact and clean - just the essentials
 */

import React from 'react';
import { useTranslation } from '../../../context/TranslationContext';

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
  const { t } = useTranslation();
  const planName = subscription.items?.data?.[0]?.price?.product?.name || 'Subscription';
  const interval = subscription.items?.data?.[0]?.price?.recurring?.interval || 'month';
  const expiresDate = new Date(subscription.current_period_end * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  // Status display
  const getStatusBadge = () => {
    if (isCanceling) {
      return { text: `⏱️ ${t('subscriptions.canceling')}`, color: '#ff9800' };
    }
    return { text: `✅ ${t('subscriptions.active')}`, color: '#4caf50' };
  };

  const statusBadge = getStatusBadge();

  return (
    <div className="subscription-card-simple">
      <div className="sub-simple-main">
        {/* Left: Plan info */}
        <div className="sub-simple-left">
          <div className="sub-simple-plan">
            {planName}           <span className="sub-simple-interval">({interval === 'month' ? t('subscriptions.monthly') : t('subscriptions.yearly')})</span>
          </div>
          {isCanceling && (
            <div className="sub-simple-canceling">
              ⚠️ {t('subscriptions.thisSubscriptionEnds')} <strong>{expiresDate}</strong>
            </div>
          )}
        </div>

        {/* Center: Status */}
        <div className="sub-simple-status">
          <span className="sub-simple-badge" style={{ backgroundColor: statusBadge.color }}>
            {statusBadge.text}
          </span>
        </div>

        {/* Right: Expiry + Action */}
        <div className="sub-simple-right">
          <div className="sub-simple-expires">
            {t('subscriptions.expires')} {expiresDate}
          </div>
          {!isCanceling && subscription.status === 'active' && (
            <button
              className="btn-secondary btn-small"
              onClick={() => expandedSub === subscription.id ? onChangeClick(null) : onChangeClick(subscription.id)}
              title={expandedSub === subscription.id ? t('subscriptions.close') : t('subscriptions.switchPlanOrCancel')}
            >
              {expandedSub === subscription.id ? `✕` : `📋 ${t('subscriptions.switchPlanOrCancel')}`}
            </button>
          )}
        </div>
      </div>

      {/* Change Plan Options - Expanded */}
      {expandedSub === subscription.id && subscription.status === 'active' && !isCanceling && (
        <div className="sub-simple-expand">
          <h5>{t('subscriptions.switchToADifferentPlan')}</h5>
          <div className="sub-simple-plans-grid">
            {Object.entries(pricesByProduct).map(([productId, { product, prices }]) => (
              prices.map(price => {
                const newInterval = price.recurring?.interval;
                const currentPrice = subscription.items?.data?.[0]?.price;
                const isSamePrice = price.id === currentPrice?.id;

                return (
                  <div key={price.id} className="sub-simple-plan-option">
                    <div className="sub-simple-plan-name">
                      {product?.name} ({newInterval === 'month' ? t('subscriptions.mo') : t('subscriptions.yr')})
                    </div>
                    <div className="sub-simple-plan-price">
                      ${(price.unit_amount / 100).toFixed(2)}
                    </div>
                    <button
                      className={`btn-small ${isSamePrice ? 'btn-disabled' : 'btn-primary'}`}
                      onClick={() => onChangeSubscription(subscription, price.id)}
                      disabled={isSamePrice || billing.loading}
                    >
                      {isSamePrice ? t('subscriptions.current') : t('subscriptions.switch')}
                    </button>
                  </div>
                );
              })
            ))}
          </div>

          {/* Cancel Subscription Option */}
          <div className="sub-simple-cancel-section">
            <div className="sub-simple-cancel-box">
              <h6>{t('subscriptions.orCancelSubscription')}</h6>
              <p className="sub-simple-cancel-note">
                {t('subscriptions.cancelNote')}
              </p>
              <button
                className="btn-small btn-danger"
                onClick={() => onToggle(subscription.id, isActive)}
                disabled={billing.loading}
              >
                ✕ {t('subscriptions.cancelSubscriptionButton')}
              </button>
            </div>
          </div>
        </div>
      )}

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

        .sub-simple-left {
          flex: 1;
        }

        .sub-simple-plan {
          font-size: 1.1rem;
          font-weight: 600;
          color: #333;
          margin-bottom: 0.25rem;
        }

        .sub-simple-interval {
          font-size: 0.9rem;
          font-weight: normal;
          color: #666;
        }

        .sub-simple-canceling {
          font-size: 0.9rem;
          color: #ff6f00;
          margin-top: 0.5rem;
        }

        .sub-simple-status {
          flex: 0 0 auto;
        }

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
        }

        .sub-simple-expires {
          font-size: 0.9rem;
          color: #666;
          white-space: nowrap;
        }

        .btn-small {
          padding: 0.5rem 1rem;
          font-size: 0.85rem;
          border-radius: 4px;
          border: none;
          cursor: pointer;
          font-weight: 600;
        }

        .btn-secondary {
          background-color: #f5f5f5;
          color: #333;
          border: 1px solid #ccc;
        }

        .btn-secondary:hover:not(:disabled) {
          background-color: #e8e8e8;
        }

        .btn-disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .sub-simple-expand {
          background-color: #fafafa;
          padding: 1.5rem;
          border-top: 1px solid #e0e0e0;
        }

        .sub-simple-expand h5 {
          margin: 0 0 1rem 0;
          font-size: 1rem;
          color: #333;
        }

        .sub-simple-plans-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
        }

        .sub-simple-plan-option {
          background: white;
          padding: 1rem;
          border: 1px solid #ddd;
          border-radius: 6px;
          text-align: center;
        }

        .sub-simple-plan-name {
          font-size: 0.9rem;
          font-weight: 600;
          color: #333;
          margin-bottom: 0.5rem;
        }

        .sub-simple-plan-price {
          font-size: 1.2rem;
          font-weight: bold;
          color: #4caf50;
          margin-bottom: 0.75rem;
        }

        .btn-primary {
          background-color: #7c63d8;
          color: white;
          border: none;
          width: 100%;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #6a52b8;
        }

        .sub-simple-cancel-section {
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 2px solid #e0e0e0;
        }

        .sub-simple-cancel-box {
          background: #fff5f5;
          border: 1px solid #ffcdd2;
          border-radius: 6px;
          padding: 1.5rem;
          text-align: center;
        }

        .sub-simple-cancel-box h6 {
          margin: 0 0 0.75rem 0;
          font-size: 1rem;
          color: #c62828;
          font-weight: 600;
        }

        .sub-simple-cancel-note {
          margin: 0 0 1rem 0;
          font-size: 0.9rem;
          color: #666;
          line-height: 1.5;
        }

        .btn-danger {
          background-color: #d32f2f;
          color: white;
          border: none;
          padding: 0.75rem 2rem;
        }

        .btn-danger:hover:not(:disabled) {
          background-color: #c62828;
        }

        .btn-danger:disabled {
          background-color: #e57373;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .sub-simple-main {
            flex-direction: column;
            align-items: flex-start;
            padding: 1rem;
            gap: 0.75rem;
          }

          .sub-simple-right {
            width: 100%;
            justify-content: space-between;
          }

          .sub-simple-plans-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </div>
  );
}
