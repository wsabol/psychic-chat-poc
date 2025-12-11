import React, { useState } from 'react';

/**
 * SubscriptionConfirmationModal - Complete incomplete subscriptions
 * Handles payment confirmation for subscriptions that require payment action
 */
export default function SubscriptionConfirmationModal({
  subscription,
  stripeRef,
  onSuccess,
  onCancel,
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);

  const paymentIntent = subscription.latest_invoice?.payment_intent;
  const amount = subscription.latest_invoice?.amount_due || 0;
  const currency = subscription.latest_invoice?.currency?.toUpperCase() || 'USD';

  const handleConfirmPayment = async (e) => {
    e.preventDefault();

    if (!stripeRef.current) {
      setError('Stripe not ready');
      return;
    }

    if (!paymentIntent?.client_secret) {
      setError('No payment intent found');
      return;
    }

    try {
      setConfirming(true);
      setError(null);

      const stripe = stripeRef.current;

      // Confirm the payment for this invoice
      const { paymentIntent: result, error: stripeError } = await stripe.confirmCardPayment(
        paymentIntent.client_secret
      );

      if (stripeError) {
        setError(stripeError.message);
        setConfirming(false);
        return;
      }

      if (result && result.status === 'succeeded') {
        setError(null);
        onSuccess(result);
      } else {
        setError('Payment could not be confirmed. Status: ' + (result?.status || 'unknown'));
        setConfirming(false);
      }
    } catch (err) {
      setError(err.message || 'Payment confirmation failed');
      setConfirming(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Complete Your Subscription</h3>
        
        <div className="modal-description">
          <p>Your subscription is ready, but payment needs to be confirmed.</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="subscription-summary">
          <div className="summary-row">
            <span>Amount Due:</span>
            <strong>{(amount / 100).toFixed(2)} {currency}</strong>
          </div>
          <div className="summary-row">
            <span>Status:</span>
            <strong className="status-warning">Incomplete</strong>
          </div>
          <div className="summary-row">
            <span>Subscription ID:</span>
            <code>{subscription.id}</code>
          </div>
        </div>

        <form onSubmit={handleConfirmPayment} className="form">
          <div className="form-actions">
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={confirming}
            >
              {confirming ? 'Processing...' : 'Confirm & Complete'}
            </button>
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={onCancel}
              disabled={confirming}
            >
              Cancel
            </button>
          </div>
        </form>

        <div className="modal-info">
          <p>💳 Your saved payment method will be charged for this subscription.</p>
        </div>
      </div>
    </div>
  );
}
