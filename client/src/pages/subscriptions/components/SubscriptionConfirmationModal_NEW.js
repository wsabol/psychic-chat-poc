import React, { useState } from 'react';

/**
 * SubscriptionConfirmationModal - Complete subscriptions
 * Handles payment confirmation for subscriptions that require payment action
 * For ACH (async) subscriptions, they go directly to 'active' and charge asynchronously (up to 4 business days)
 */
export default function SubscriptionConfirmationModal({
  subscription,
  stripeRef,
  onSuccess,
  onCancel,
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);

  // For ACH subscriptions, status will be 'active' immediately
  const isACHSubscription = subscription.status === 'active';
  
  const paymentIntent = subscription.latest_invoice?.payment_intent;
  const amount = subscription.latest_invoice?.amount_due || 0;
  const currency = subscription.latest_invoice?.currency?.toUpperCase() || 'USD';
  const chargeDate = subscription.current_period_end 
    ? new Date(subscription.current_period_end * 1000).toLocaleDateString()
    : 'the scheduled date';

  const handleConfirmPayment = async (e) => {
    e.preventDefault();

    // For ACH subscriptions that are already active, just close the modal
    if (isACHSubscription) {
      onSuccess({ status: 'succeeded', id: subscription.id });
      return;
    }

    if (!stripeRef.current) {
      setError('Stripe not ready');
      return;
    }

    // If amount due is $0, no payment needed - just confirm
    if (amount === 0) {
      onSuccess({ status: 'succeeded', id: subscription.id });
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
          {isACHSubscription ? (
            <p>✅ Your subscription is active! Your bank account will be charged within 4 business days ({chargeDate}).</p>
          ) : amount === 0 ? (
            <p>Your subscription is ready to start. You will be charged at the end of your first billing period on {chargeDate}.</p>
          ) : (
            <p>Your subscription is ready, but payment needs to be confirmed.</p>
          )}
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="subscription-summary">
          <div className="summary-row">
            <span>Amount Due:</span>
            <strong>{(amount / 100).toFixed(2)} {currency}</strong>
          </div>
          <div className="summary-row">
            <span>Status:</span>
            <strong className={isACHSubscription ? "status-active" : "status-warning"}>
              {isACHSubscription ? 'Active' : 'Incomplete'}
            </strong>
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
              {isACHSubscription 
                ? (confirming ? 'Closing...' : 'Close') 
                : (confirming ? 'Processing...' : 'Confirm & Complete')}
            </button>
            {!isACHSubscription && (
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={onCancel}
                disabled={confirming}
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="modal-info">
          {isACHSubscription ? (
            <p>🏦 Your bank account will be debited. This may take up to 4 business days to settle.</p>
          ) : (
            <p>💳 Your saved payment method will be charged for this subscription.</p>
          )}
        </div>

        <style>{`
          .status-active {
            color: #4caf50;
            font-weight: bold;
          }

          .status-warning {
            color: #ff9800;
            font-weight: bold;
          }
        `}</style>
      </div>
    </div>
  );
}
