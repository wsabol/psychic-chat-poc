/**
 * SubscriptionsPage - With Subscription Confirmation Modal
 * Main container that orchestrates all subscription components
 * 
 * LAYOUT PRIORITY (User must subscribe to use site):
 * 1. Available Plans (FIRST - if no active subscription) OR (Active Subscriptions if already subscribed)
 * 2. Active Subscriptions (if user has subscription)
 * 3. Plan Change Options (if already subscribed)
 * 4. Past/Expired Subscriptions (LAST - compact table)
 * 5. Info Section
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from '../../context/TranslationContext';
import { useBilling } from '../../hooks/useBilling';
import { useSubscriptionState } from './hooks/useSubscriptionState';
import { useSubscriptionHandlers } from './hooks/useSubscriptionHandlers';
import AutoRenewalNotice from './components/AutoRenewalNotice';
import ActiveSubscriptionsSection from './components/ActiveSubscriptionsSection';
import AvailablePlansSection from './components/AvailablePlansSection';
import PastSubscriptionsSection from './components/PastSubscriptionsSection';
import SubscriptionInfo from './components/SubscriptionInfo';
import SubscriptionConfirmationModal from './components/SubscriptionConfirmationModal';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import '../SubscriptionsPage.css';
import '../../styles/modals.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export default function SubscriptionsPage({ userId, token, auth, onboarding }) {
  const { t } = useTranslation();
  // State management
  const state = useSubscriptionState(token);
  const billing = useBilling(token);

  // Google Play subscription state (mobile purchases shown read-only on web)
  const [googlePlaySubscription, setGooglePlaySubscription] = useState(null);

  // Get Stripe instance from window (or create one)
  const stripeRef = React.useRef(null);
  if (!stripeRef.current && window.Stripe) {
    const stripeKey = process.env.REACT_APP_STRIPE_PUBLIC_KEY;
    if (stripeKey) {
      stripeRef.current = window.Stripe(stripeKey);
    } else {
      console.error('REACT_APP_STRIPE_PUBLIC_KEY environment variable is required');
    }
  }

  // Load available prices, subscriptions, payment methods, and Google Play status on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          billing.fetchAvailablePrices(),
          billing.fetchSubscriptions(),
          billing.fetchPaymentMethods(),
        ]);
      } catch (err) {
        logErrorFromCatch('[SUBSCRIPTIONS] Failed to load data:', err);
      }
    };

    const loadGooglePlayStatus = async () => {
      if (!token) return;
      try {
        const response = await fetch(`${API_URL}/billing/subscription-status/google`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          // Only store if actually a Google Play subscription
          if (data.hasSubscription || data.billing_platform === 'google_play') {
            setGooglePlaySubscription(data);
          }
        }
      } catch (err) {
        // Non-fatal — Google Play status is supplemental
        logErrorFromCatch('[SUBSCRIPTIONS] Failed to load Google Play status:', err);
      }
    };

    loadData();
    loadGooglePlayStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Event handlers
    const handlers = useSubscriptionHandlers({
    billing,
    auth,
    onboarding,
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

  // User has an active subscription if they have a Stripe OR Google Play subscription
  const hasGooglePlay = googlePlaySubscription?.hasSubscription === true;
  const hasAnyActiveSubscription = activeSubscriptionsList.length > 0 || hasGooglePlay;

  return (
    <div className="subscriptions-page">
      {/* Header */}
      <div className="section-header">
        <h2>📋 {t('subscriptions.title')}</h2>
        <p>{t('subscriptions.managePlans') || 'Manage your subscription plans and billing'}</p>
      </div>

      {/* Alerts */}
      {state.error && <div className="alert alert-error">{state.error}</div>}
      {state.success && <div className="alert alert-success">✓ {t('subscriptions.changesSaved') || 'Changes saved successfully!'}</div>}

      {/* LAYOUT: Show Available Plans FIRST if no subscription, otherwise show Active Subscriptions */}
      {!hasAnyActiveSubscription ? (
        <>
          {/* NO ACTIVE SUBSCRIPTION - Show products first */}
          <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#fff3e0', borderRadius: '8px', borderLeft: '4px solid #ff9800' }}>
            <p style={{ margin: 0, fontWeight: 'bold', color: '#e65100' }}>
              ⚠️ {t('subscriptions.needActiveSubscription') || 'You need an active subscription to use this site. Choose a plan below to get started.'}
            </p>
          </div>

          <AvailablePlansSection
            pricesByProduct={pricesByProduct}
            onSubscribe={handlers.handleSubscribe}
            billing={billing}
            showSection={true}
            defaultPaymentMethodId={billing.paymentMethods?.defaultPaymentMethodId}
          />
        </>
      ) : (
        <>
          {/* HAS ACTIVE SUBSCRIPTION */}
          {/* Show AutoRenewalNotice only for Stripe (not Google Play) subscriptions */}
          {activeSubscriptionsList.length > 0 && <AutoRenewalNotice />}

          {/* Active Subscriptions - includes Google Play if present */}
          <ActiveSubscriptionsSection
            subscriptions={activeSubscriptionsList}
            activeSubscriptions={state.activeSubscriptions}
            pricesByProduct={pricesByProduct}
            expandedSub={state.expandedSub}
            onToggle={handlers.handleToggleSubscription}
            onChangeClick={state.setExpandedSub}
            onChangeSubscription={handlers.handleChangeSubscription}
            billing={billing}
            googlePlaySubscription={googlePlaySubscription}
          />

          {/* Available Plans - show only for Stripe subscribers to allow plan changes */}
          {activeSubscriptionsList.length > 0 && (
            <AvailablePlansSection
              pricesByProduct={pricesByProduct}
              onSubscribe={handlers.handleSubscribe}
              billing={billing}
              showSection={true}
              defaultPaymentMethodId={billing.paymentMethods?.defaultPaymentMethodId}
            />
          )}
        </>
      )}

      {/* Subscription Confirmation Modal */}
      {state.showSubscriptionConfirmationModal && state.pendingSubscription && (
        <SubscriptionConfirmationModal
          subscription={state.pendingSubscription}
          stripeRef={stripeRef}
          token={token}
          onSuccess={handlers.handleSubscriptionConfirmationSuccess}
          onCancel={() => {
            state.setShowSubscriptionConfirmationModal(false);
            state.setPendingSubscription(null);
          }}
        />
      )}

      {/* Past Subscriptions - LAST, compact table */}
      <PastSubscriptionsSection subscriptions={billing.subscriptions || []} />

      {/* Info Section */}
      <SubscriptionInfo />
    </div>
  );
}
