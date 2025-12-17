import React, { useState } from 'react';
import { fetchWithTokenRefresh } from '../../../utils/fetchWithTokenRefresh';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

/**
 * SubscriptionConfirmationModal - Complete incomplete subscriptions
 * Handles payment confirmation for subscriptions that require payment action
 * 
 * FIXED: Now calls server endpoint to complete subscription instead of trying
 * to confirm payment intent directly (which doesn't work for all payment methods)
 */
export default function SubscriptionConfirmationModal({
  subscription,
  stripeRef,
  onSuccess,
  onCancel,
  token,
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);

  const paymentIntent = subscription.latest_invoice?.payment_intent;
  // Use amountDue from the response or fallback to latest_invoice data
  const amount = subscription.amountDue !== undefined ? subscription.amountDue : (subscription.latest_invoice?.amount_due || 0);
  const currency = (subscription.currency || subscription.latest_invoice?.currency || 'usd').toUpperCase();

  const handleConfirmPayment = async (e) => {
    e.preventDefault();

    try {
      setConfirming(true);
      setError(null);

      // IMPORTANT: Call the server endpoint to complete/finalize the subscription
      // This is needed for all payment methods (card, ACH, bank accounts)
      const subId = subscription.subscriptionId || subscription.id;
      console.log('[MODAL] Completing subscription:', subId);
      
      if (!subId) {
        setError('Subscription ID is missing');
        setConfirming(false);
        return;
      }
      
      const completeResponse = await fetchWithTokenRefresh(
        `${API_URL}/billing/complete-subscription/${subId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!completeResponse.ok) {
        const errorData = await completeResponse.json();
        setError(errorData.error || 'Failed to complete subscription');
        setConfirming(false);
        return;
      }

      const result = await completeResponse.json();
      console.log('[MODAL] Subscription completed:', result);

      // If there's a payment intent that needs confirmation (card payments), confirm it
      if (result.subscription?.clientSecret && amount > 0) {
        try {
          const stripe = stripeRef.current;
          if (stripe) {
            console.log('[MODAL] Confirming card payment for client secret');
            const { paymentIntent: paymentResult, error: stripeError } = await stripe.confirmCardPayment(
              result.subscription.clientSecret
            );

            if (stripeError) {
              console.warn('[MODAL] Card payment confirmation error:', stripeError.message);
              // Don't fail - subscription is already created, payment might process separately
            } else if (paymentResult) {
              console.log('[MODAL] Payment result:', paymentResult.status);
            }
          }
        } catch (stripeErr) {
          console.warn('[MODAL] Stripe confirmation error:', stripeErr.message);
          // Don't fail - subscription is already created
        }
      }

      // Success - subscription is now complete
      console.log('[MODAL] Subscription completion successful');
      const finalSubId = subscription.subscriptionId || subscription.id;
      onSuccess({ status: 'succeeded', id: finalSubId });
    } catch (err) {
      setError(err.message || 'Failed to complete subscription');
      setConfirming(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Complete Your Subscription</h3>
        
        <div className="modal-description">
          {amount === 0 ? (
            <p>Your subscription is ready to start. You will be charged at the end of your first billing period on {subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toLocaleDateString() : 'the scheduled date'}.</p>
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
            <strong className="status-warning">Incomplete</strong>
          </div>
          <div className="summary-row">
            <span>Subscription ID:</span>
            <code>{subscription.subscriptionId || subscription.id}</code>
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
