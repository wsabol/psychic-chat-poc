import React, { useEffect, useState, useRef } from 'react';
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
 * Supported: Credit/Debit Cards, Apple Pay, Google Pay, Amazon Pay
 * (ACH bank accounts removed due to Sandbox settlement limitations)
 */
export default function PaymentMethodPage({ userId, token, auth }) {
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

  useEffect(() => {
    billing.fetchPaymentMethods();
  }, []);

  const handleAddClick = async () => {
    try {
      setCardError(null);
      const intent = await billing.createSetupIntent();
      setSetupIntent(intent);
      setShowAddPaymentForm(true);
    } catch (err) {
      setCardError(err.message || 'Failed to prepare payment form');
    }
  };

  const handlePaymentSuccess = async (result) => {
    console.log('[PAGE] Payment method added successfully:', result);
    
    try {
      setLoading(true);
      const paymentMethodId = result.paymentMethodId;

      // Attach to customer
      await billing.attachPaymentMethod(paymentMethodId);
      console.log('[PAGE] Payment method attached');

      // Set as default
      await billing.setDefaultPaymentMethod(paymentMethodId);
      console.log('[PAGE] Payment method set as default');

      // Refresh list
      await billing.fetchPaymentMethods();

      // Show success
      setShowAddPaymentForm(false);
      setCardSuccess(true);
      setTimeout(() => setCardSuccess(false), 3000);
    } catch (err) {
      console.error('[PAGE] Error finalizing payment method:', err);
      setCardError(err.message || 'Failed to finalize payment method');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentError = (error) => {
    console.error('[PAGE] Payment error:', error);
    setCardError(error.message || 'Payment failed');
  };

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
      console.log('[CARD] Payment method created:', paymentMethodId);

      const { setupIntent: si, error: confirmError } = await stripeRef.current.confirmCardSetup(
        setupIntent.clientSecret,
        { payment_method: paymentMethodId }
      );

      if (confirmError) {
        setCardError(confirmError.message);
        setLoading(false);
        return;
      }

      console.log('[CARD] Setup succeeded');

      // Attach to customer
      await billing.attachPaymentMethod(paymentMethodId);
      console.log('[CARD] Payment method attached');

      // Set as default
      await billing.setDefaultPaymentMethod(paymentMethodId);
      console.log('[CARD] Payment method set as default');

      // Refresh list
      await billing.fetchPaymentMethods();

      // Show success
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
      {cardSuccess && (
        <div className="alert alert-success">✓ Payment method added successfully!</div>
      )}

      {!showAddPaymentForm && (
        <button
          className="btn-primary"
          onClick={handleAddClick}
          disabled={billing.loading}
        >
          + Add Payment Method
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
            await billing.fetchPaymentMethods();
            setCardSuccess(true);
            setTimeout(() => setCardSuccess(false), 3000);
          } catch (err) {
            setCardError(err.message || 'Failed to set default payment method');
          }
        }}
        onDelete={async (paymentMethodId) => {
          if (!window.confirm('Are you sure you want to delete this payment method?')) {
            return;
          }
          try {
            await billing.deletePaymentMethod(paymentMethodId);
            await billing.fetchPaymentMethods();
            setCardSuccess(true);
            setTimeout(() => setCardSuccess(false), 3000);
          } catch (err) {
            setCardError(err.message || 'Failed to delete payment method');
          }
        }}
      />

      <PaymentMethodsEmpty paymentMethods={billing.paymentMethods} />
    </div>
  );
}

