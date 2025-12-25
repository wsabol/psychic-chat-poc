import React, { useEffect, useState, useRef, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { useBilling } from '../../hooks/useBilling';
import CardPaymentForm from './components/CardPaymentForm';
import PaymentMethodsList from './components/PaymentMethodsList';
import PaymentMethodsEmpty from './components/PaymentMethodsEmpty';
import '../PaymentMethodPage.css';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

/**
 * PaymentMethodPage - Manage payment methods
 * ✅ FIXED: Only fetch on mount, not on every render
 * ✅ DEBOUNCED: Refresh only on explicit user actions
 */
export default function PaymentMethodPage({ userId, token, auth, onboarding }) {
  const billing = useBilling(token);
  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);
  const [cardError, setCardError] = useState(null);
  const [cardSuccess, setCardSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [setupIntent, setSetupIntent] = useState(null);
  const [billingForm, setBillingForm] = useState({
    cardholderName: '',
    billingAddress: '',
    billingCity: '',
    billingState: '',
    billingZip: '',
  });
  const cardElementRef = useRef(null);
  const stripeRef = useRef(null);
  const refreshTimeoutRef = useRef(null);
  const hasInitialized = useRef(false);

        // ✅ FIXED: Only fetch once on mount, not on every render
  useEffect(() => {
    if (!hasInitialized.current && billing) {
      hasInitialized.current = true;
      billing.fetchPaymentMethods();
    }
    
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [billing]);

  const handleAddClick = async () => {
    try {
      setCardError(null);
      const intent = await billing.createSetupIntent();
      setSetupIntent(intent);
      setShowAddPaymentForm(true);
    } catch (err) {
      setCardError(err.message || 'Failed to prepare payment form');
      setShowAddPaymentForm(true);
    }
  };

  // ✅ Debounced refresh - prevents hammering backend
  const debouncedRefreshPaymentMethods = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    refreshTimeoutRef.current = setTimeout(() => {
      billing.fetchPaymentMethods();
    }, 500);
  }, [billing]);

  const handleCardSubmit = async (cardElement) => {
    if (!stripeRef.current) {
      setCardError('Stripe not ready');
      return;
    }

    if (!billingForm.cardholderName) {
      setCardError('Please enter cardholder name');
      return;
    }

    setLoading(true);
    setCardError(null);

    try {
      const { paymentMethod, error } = await stripeRef.current.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: { name: billingForm.cardholderName },
      });

      if (error) {
        setCardError(error.message);
        setLoading(false);
        return;
      }

      const paymentMethodId = paymentMethod.id;

      if (!setupIntent?.clientSecret) {
        setCardError('Setup intent not available. Please try again.');
        setLoading(false);
        return;
      }

      const { error: confirmError } = await stripeRef.current.confirmCardSetup(
        setupIntent.clientSecret,
        { payment_method: paymentMethodId }
      );

      if (confirmError) {
        setCardError(confirmError.message);
        setLoading(false);
        return;
      }

      // Attach to customer
      await billing.attachPaymentMethod(paymentMethodId);

      // Set as default
      await billing.setDefaultPaymentMethod(paymentMethodId);

      // ✅ DEBOUNCED: Refresh in background (500ms) - don't wait
      debouncedRefreshPaymentMethods();

            // ✅ ONBOARDING: Update progress if in onboarding
      if (onboarding?.updateOnboardingStep) {
        try {
          await onboarding.updateOnboardingStep('payment_method');
        } catch (err) {
          console.warn('[ONBOARDING] Failed to update payment method step:', err);
        }
      }

      // Show success immediately
      setShowAddPaymentForm(false);
      setCardSuccess(true);
      setTimeout(() => setCardSuccess(false), 3000);
    } catch (err) {
      console.error('[CARD] Error:', err);
      setCardError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-method-page">
      <div className="section-header">
        <h2>💳 Payment Methods</h2>
        <p>Add and manage your payment methods for subscriptions and purchases</p>
      </div>

      {cardError && <div className="alert alert-error">{cardError}</div>}
      {billing.error && !cardError && (
        <div className="alert alert-error">
          ⚠️ {billing.error}
          <br/>
          <small style={{marginTop: '0.5rem', display: 'block'}}>
            If the issue persists, please refresh the page or contact support.
          </small>
        </div>
      )}
      {cardSuccess && (
        <div className="alert alert-success">✓ Payment method added successfully!</div>
      )}

      {!showAddPaymentForm && (
        <button
          className="btn-primary"
          onClick={handleAddClick}
          disabled={false}
        >
          {loading ? '⏳ Processing...' : '+ Add Payment Method'}
        </button>
      )}

      {showAddPaymentForm && setupIntent && (
        <div className="payment-form-container">
          <h3>Add New Payment Method</h3>
          <p style={{ fontSize: '0.95rem', color: '#666', marginBottom: '1.5rem' }}>
            Choose your preferred payment method:
          </p>

          <Elements
            stripe={stripePromise}
            options={{
              clientSecret: setupIntent.clientSecret,
              appearance: {
                theme: 'stripe',
              },
            }}
          >
            <CardPaymentForm
              billingForm={billingForm}
              onBillingFormChange={(e) => setBillingForm({ ...billingForm, [e.target.name]: e.target.value })}
              onSubmit={(cardElement) => handleCardSubmit(cardElement)}
              onCancel={() => setShowAddPaymentForm(false)}
              loading={loading}
              cardElementRef={cardElementRef}
              stripeRef={stripeRef}
            />
          </Elements>
        </div>
      )}

      <PaymentMethodsList
        paymentMethods={billing.paymentMethods}
        defaultPaymentMethodId={billing.paymentMethods?.defaultPaymentMethodId}
        onSetDefault={async (paymentMethodId) => {
          try {
            await billing.setDefaultPaymentMethod(paymentMethodId);
            // ✅ DEBOUNCED: Refresh in background
            debouncedRefreshPaymentMethods();
            setCardSuccess(true);
            setTimeout(() => setCardSuccess(false), 3000);
          } catch (err) {
            setCardError(err.message || 'Failed to set default payment method');
            // Refresh to show true state
            billing.fetchPaymentMethods();
          }
        }}
        onDelete={async (paymentMethodId) => {
          if (!window.confirm('Are you sure you want to delete this payment method?')) {
            return;
          }
          try {
            await billing.deletePaymentMethod(paymentMethodId);
            // ✅ DEBOUNCED: Refresh in background
            debouncedRefreshPaymentMethods();
            setCardSuccess(true);
            setTimeout(() => setCardSuccess(false), 3000);
          } catch (err) {
            setCardError(err.message || 'Failed to delete payment method');
            // Refresh to show true state
            billing.fetchPaymentMethods();
          }
        }}
      />

      <PaymentMethodsEmpty paymentMethods={billing.paymentMethods} />
    </div>
  );
}

