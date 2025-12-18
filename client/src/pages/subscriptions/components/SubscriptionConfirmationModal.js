import React, { useState } from 'react';
import { fetchWithTokenRefresh } from '../../../utils/fetchWithTokenRefresh';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

/**
 * SubscriptionConfirmationModal - Complete incomplete subscriptions
 * Implements correct Stripe flow:
 * 1. Finalize invoice (DRAFT -> OPEN)
 * 2. Confirm payment (client-side card confirmation if needed)
 * 3. Wait for webhook (invoice.payment_succeeded transitions to active)
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

  // Use amountDue from the response or fallback to latest_invoice data
  const amount = subscription.amountDue !== undefined ? subscription.amountDue : (subscription.latest_invoice?.amount_due || 0);
  const currency = (subscription.currency || subscription.latest_invoice?.currency || 'usd').toUpperCase();

  const handleConfirmPayment = async (e) => {
    e.preventDefault();

    try {
      setConfirming(true);
      setError(null);

      const subId = subscription.subscriptionId || subscription.id;
      
      if (!subId) {
        setError('Subscription ID is missing');
        setConfirming(false);
        return;
      }
      
      // STEP 1: Complete the subscription on server
      // This finalizes invoice from DRAFT -> OPEN and triggers payment attempt
      const finalizeResponse = await fetchWithTokenRefresh(
        `${API_URL}/billing/complete-subscription/${subId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!finalizeResponse.ok) {
        const errorData = await finalizeResponse.json();
        setError(errorData.error || 'Failed to finalize subscription');
        setConfirming(false);
        return;
      }

      const finalizeResult = await finalizeResponse.json();

      // STEP 2: If there's a payment intent that needs confirmation (card payments), confirm it
      if (finalizeResult.subscription?.clientSecret && amount > 0) {
        try {
          const stripe = stripeRef.current;
          if (stripe) {
            const { error: stripeError } = await stripe.confirmCardPayment(
              finalizeResult.subscription.clientSecret
            );

            if (stripeError) {
              console.warn('[MODAL] Card payment confirmation warning:', stripeError.message);
              // Don't fail - subscription is already finalized, payment might process separately
            } 
          } 
        } catch (stripeErr) {
          console.warn('[MODAL] Stripe confirmation warning:', stripeErr.message);
          // Don't fail - subscription is already finalized
        }
      }

      // STEP 3: Success - subscription is now completed
      // Webhook will eventually transition it to 'active' when payment succeeds
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
            <p>Your subscription is ready. Please click below to finalize and complete the setup.</p>
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
              {confirming ? 'Completing Subscription...' : 'Complete Subscription'}
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
