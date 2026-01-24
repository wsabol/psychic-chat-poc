import React, { useEffect, useState, useRef, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { useTranslation } from '../../context/TranslationContext';
import { useBilling } from '../../hooks/useBilling';
import CardPaymentForm from './components/CardPaymentForm';
import PaymentMethodsList from './components/PaymentMethodsList';
import PaymentMethodsEmpty from './components/PaymentMethodsEmpty';
import { logErrorFromCatch } from '../../shared/errorLogger.js';
import '../PaymentMethodPage.css';

const stripePublicKey = process.env.REACT_APP_STRIPE_PUBLIC_KEY || 'pk_test_51RvatUJMQqFkSDqnqnpj19zERg4ECXj9ZpSUloXyNEf6SqusJ0N6PJQXnyrap5POm8ynwuXomOSJh1RUX7AlieyI007B3VSIru';
const stripePromise = loadStripe(stripePublicKey);

/**
 * PaymentMethodPage - Manage payment methods
 * âœ… FIXED: Only fetch on mount, not on every render
 * âœ… DEBOUNCED: Refresh only on explicit user actions
 */
export default function PaymentMethodPage({ userId, token, auth, onboarding }) {
  const { t } = useTranslation();
  const billing = useBilling(token);
  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);
  const [cardError, setCardError] = useState(null);
  const [cardSuccess, setCardSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [setupIntent, setSetupIntent] = useState(null);
  const [billingForm, setBillingForm] = useState({
    cardholderName: '',
    billingCountry: '',
    billingAddress: '',
    billingCity: '',
    billingState: '',
    billingZip: '',
  });
  const cardElementRef = useRef(null);
  const stripeRef = useRef(null);
  const refreshTimeoutRef = useRef(null);
  const hasInitialized = useRef(false);

        // âœ… FIXED: Only fetch once on mount, not on every render
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
      setCardError(err.message || t('paymentMethods.failedToPrepare'));
      setShowAddPaymentForm(true);
    }
  };

  // âœ… Debounced refresh - prevents hammering backend
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
      setCardError(t('paymentMethods.stripeNotReady'));
      return;
    }

    if (!billingForm.cardholderName) {
      setCardError(t('paymentMethods.enterCardholderName'));
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
        setCardError(t('paymentMethods.setupIntentNotAvailable'));
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

      // Note: confirmCardSetup automatically attaches the payment method to the customer
      // No need to call attachPaymentMethod separately

      // Set as default
      await billing.setDefaultPaymentMethod(paymentMethodId);

      // Save billing address to database (for tax calculation)
      if (billingForm.billingCountry) {
        try {
          const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
          await fetch(`${API_URL}/billing/save-billing-address`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              country: billingForm.billingCountry,
              state: billingForm.billingState,
              city: billingForm.billingCity,
              postalCode: billingForm.billingZip,
              addressLine1: billingForm.billingAddress,
            }),
          });
        } catch (err) {
          // Non-critical - billing address save failed but payment method was added
        }
      }

      // âœ… DEBOUNCED: Refresh in background (500ms) - don't wait
      debouncedRefreshPaymentMethods();

            // âœ… ONBOARDING: Update progress if in onboarding
      if (onboarding?.updateOnboardingStep) {
        try {
          await onboarding.updateOnboardingStep('payment_method');
        } catch (err) {
        }
      }

      // Show success immediately
      setShowAddPaymentForm(false);
      setCardSuccess(true);
      setTimeout(() => setCardSuccess(false), 3000);
        } catch (err) {
      logErrorFromCatch('[CARD] Error:', err);
      setCardError(err.message || t('paymentMethods.failedToPrepare'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-method-page">
            <div className="section-header">
        <h2>ðŸ’³ {t('paymentMethods.title')}</h2>
        <p>{t('paymentMethods.description')}</p>
      </div>

      {cardError && <div className="alert alert-error">{cardError}</div>}
      {billing.error && !cardError && (
        <div className="alert alert-error">
          âš ï¸ {billing.error}
                    <br/>
          <small style={{marginTop: '0.5rem', display: 'block'}}>
            {t('paymentMethods.ifIssuePersists')}
          </small>
        </div>
      )}
            {cardSuccess && (
        <div className="alert alert-success">âœ“ {t('paymentMethods.addedSuccessfully')}</div>
      )}

      {!showAddPaymentForm && (
        <button
          className="btn-primary"
          onClick={handleAddClick}
          disabled={false}
                >
          {loading ? `â³ ${t('paymentMethods.processing')}` : t('paymentMethods.addNewButton')}
        </button>
      )}

      {showAddPaymentForm && setupIntent && (
                <div className="payment-form-container">
          <h3>{t('paymentMethods.addNew')}</h3>
          <p style={{ fontSize: '0.95rem', color: '#666', marginBottom: '1.5rem' }}>
            {t('paymentMethods.description')}
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
            // âœ… DEBOUNCED: Refresh in background
            debouncedRefreshPaymentMethods();
            setCardSuccess(true);
            setTimeout(() => setCardSuccess(false), 3000);
                    } catch (err) {
            setCardError(err.message || t('paymentMethods.failedToSetDefault'));
            // Refresh to show true state
            billing.fetchPaymentMethods();
          }
        }}
        onDelete={async (paymentMethodId) => {
          if (!window.confirm(t('paymentMethods.deleteConfirm'))) {
            return;
          }
          try {
            await billing.deletePaymentMethod(paymentMethodId);
            // âœ… DEBOUNCED: Refresh in background
            debouncedRefreshPaymentMethods();
            setCardSuccess(true);
            setTimeout(() => setCardSuccess(false), 3000);
                    } catch (err) {
            setCardError(err.message || t('paymentMethods.failedToDelete'));
            // Refresh to show true state
            billing.fetchPaymentMethods();
          }
        }}
      />

      <PaymentMethodsEmpty paymentMethods={billing.paymentMethods} />
    </div>
  );
}
