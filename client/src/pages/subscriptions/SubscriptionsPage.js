/**
 * SubscriptionsPage - With Subscription Confirmation Modal
 * Main container that orchestrates all subscription components
 * 
 * Features:
 * - Browse subscription plans
 * - Manage active subscriptions
 * - Toggle subscription on/off
 * - Change between plans
 * - Confirm incomplete subscriptions
 * - View past subscriptions
 */

import React, { useEffect } from 'react';
import { useBilling } from '../../hooks/useBilling';
import { useSubscriptionState } from './hooks/useSubscriptionState';
import { useSubscriptionHandlers } from './hooks/useSubscriptionHandlers';
import AutoRenewalNotice from './components/AutoRenewalNotice';
import ActiveSubscriptionsSection from './components/ActiveSubscriptionsSection';
import AvailablePlansSection from './components/AvailablePlansSection';
import PastSubscriptionsSection from './components/PastSubscriptionsSection';
import SubscriptionInfo from './components/SubscriptionInfo';
import SubscriptionConfirmationModal from './components/SubscriptionConfirmationModal';
import '../SubscriptionsPage.css';
import '../../styles/modals.css';

export default function SubscriptionsPage({ userId, token, auth }) {
  // State management
  const state = useSubscriptionState(token);
  const billing = useBilling(token);

  // Get Stripe instance from window (or create one)
  const stripeRef = React.useRef(null);
  if (!stripeRef.current && window.Stripe) {
    stripeRef.current = window.Stripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);
  }

  // Load available prices and subscriptions on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          billing.fetchAvailablePrices(),
          billing.fetchSubscriptions(),
        ]);
      } catch (err) {
        console.error('[SUBSCRIPTIONS] Failed to load data:', err);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Event handlers
  const handlers = useSubscriptionHandlers({
    billing,
    setError: state.setError,
    setSuccess: state.setSuccess,
    setActiveSubscriptions: state.setActiveSubscriptions,
    setPendingSubscription: state.setPendingSubscription,
    setShowSubscriptionConfirmationModal: state.setShowSubscriptionConfirmationModal,
  });

  // Helper: Group prices by product
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

  const pricesByProduct = groupPricesByProduct();
  const activeSubscriptionsList = billing.subscriptions?.filter(
    sub => sub.status !== 'canceled'
  ) || [];

  return (
    <div className="subscriptions-page">
      {/* Header */}
      <div className="section-header">
        <h2>📋 Subscriptions</h2>
        <p>Manage your subscription plans and billing</p>
      </div>

      {/* Alerts */}
      {state.error && <div className="alert alert-error">{state.error}</div>}
      {state.success && <div className="alert alert-success">✓ Changes saved successfully!</div>}

      {/* Auto-Renewal Notice */}
      <AutoRenewalNotice />

      {/* Active Subscriptions */}
      <ActiveSubscriptionsSection
        subscriptions={activeSubscriptionsList}
        activeSubscriptions={state.activeSubscriptions}
        pricesByProduct={pricesByProduct}
        expandedSub={state.expandedSub}
        onToggle={handlers.handleToggleSubscription}
        onChangeClick={state.setExpandedSub}
        onChangeSubscription={handlers.handleChangeSubscription}
        billing={billing}
      />

      {/* Available Plans (only if no active subscriptions) */}
      <AvailablePlansSection
        pricesByProduct={pricesByProduct}
        onSubscribe={handlers.handleSubscribe}
        billing={billing}
        showSection={activeSubscriptionsList.length === 0}
      />

      {/* Past Subscriptions */}
      <PastSubscriptionsSection subscriptions={billing.subscriptions || []} />

      {/* Subscription Confirmation Modal */}
      {state.showSubscriptionConfirmationModal && state.pendingSubscription && (
        <SubscriptionConfirmationModal
          subscription={state.pendingSubscription}
          stripeRef={stripeRef}
          onSuccess={handlers.handleSubscriptionConfirmationSuccess}
          onCancel={() => {
            state.setShowSubscriptionConfirmationModal(false);
            state.setPendingSubscription(null);
          }}
        />
      )}

      {/* Info Section */}
      <SubscriptionInfo />
    </div>
  );
}
