import React, { useState, useEffect } from 'react';
import { useBilling } from '../hooks/useBilling';
import './PaymentMethodPage.css';

/**
 * PaymentMethodPage - Manage payment methods (cards, ACH, digital wallets)
 */
export default function PaymentMethodPage({ userId, token, auth }) {
  const billing = useBilling(token);
  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);
  const [paymentMethodType, setPaymentMethodType] = useState('card');
  const [setupIntent, setSetupIntent] = useState(null);
  const [cardError, setCardError] = useState(null);
  const [cardSuccess, setCardSuccess] = useState(false);

  // Load payment methods on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    billing.fetchPaymentMethods();
  }, []);

  const handleAddPaymentMethod = async () => {
    try {
      setCardError(null);
      const intent = await billing.createSetupIntent();
      setSetupIntent(intent);
      setShowAddPaymentForm(true);
    } catch (err) {
      setCardError(err.message || 'Failed to prepare payment form');
    }
  };

  const handleDeletePaymentMethod = async (paymentMethodId) => {
    if (!window.confirm('Are you sure you want to delete this payment method?')) {
      return;
    }

    try {
      await billing.deletePaymentMethod(paymentMethodId);
      setCardSuccess(true);
      setTimeout(() => setCardSuccess(false), 3000);
    } catch (err) {
      setCardError(err.message || 'Failed to delete payment method');
    }
  };

  const handleSetDefault = async (paymentMethodId) => {
    try {
      await billing.setDefaultPaymentMethod(paymentMethodId);
      setCardSuccess(true);
      setTimeout(() => setCardSuccess(false), 3000);
    } catch (err) {
      setCardError(err.message || 'Failed to set default payment method');
    }
  };

  const handleStripeForm = async (e) => {
    e.preventDefault();
    if (!setupIntent || !window.Stripe) {
      setCardError('Payment system not ready');
      return;
    }

    try {
      setCardError(null);
      const stripe = window.Stripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

      if (paymentMethodType === 'card') {
        const elements = stripe.elements();
        const cardElement = elements.create('card');
        cardElement.mount('#card-element-container');

        const { setupIntent: result } = await stripe.confirmCardSetup(
          setupIntent.clientSecret,
          {
            payment_method: {
              card: cardElement,
              billing_details: { email: auth?.authEmail },
            },
          }
        );

        if (result.status === 'succeeded') {
          setCardSuccess(true);
          setShowAddPaymentForm(false);
          await billing.fetchPaymentMethods();
          setTimeout(() => setCardSuccess(false), 3000);
        } else {
          setCardError('Failed to confirm payment method');
        }
      }
    } catch (err) {
      setCardError(err.message || 'Payment method setup failed');
    }
  };

  return (
    <div className="payment-method-page">
      {/* Header */}
      <div className="section-header">
        <h2>💳 Payment Methods</h2>
        <p>Add and manage your payment methods for subscriptions and purchases</p>
      </div>

      {/* Alerts */}
      {cardError && <div className="alert alert-error">{cardError}</div>}
      {cardSuccess && <div className="alert alert-success">✓ Success!</div>}

      {/* Add Payment Method Button */}
      {!showAddPaymentForm && (
        <button className="btn-primary" onClick={handleAddPaymentMethod} disabled={billing.loading}>
          + Add Payment Method
        </button>
      )}

      {/* Add Payment Form */}
      {showAddPaymentForm && (
        <div className="payment-form-container">
          <h3>Add New Payment Method</h3>
          
          <div className="form-group">
            <label>Payment Method Type</label>
            <select
              value={paymentMethodType}
              onChange={(e) => setPaymentMethodType(e.target.value)}
              className="form-select"
            >
              <option value="card">Credit/Debit Card</option>
              <option value="bank">ACH Bank Account (US)</option>
              <option value="wallet">Digital Wallet (Apple Pay / Google Pay)</option>
            </select>
          </div>

          {paymentMethodType === 'card' && (
            <form onSubmit={handleStripeForm} className="form">
              <div className="form-group">
                <label>Card Details</label>
                <div id="card-element-container" className="card-element"></div>
              </div>
              <button type="submit" className="btn-primary" disabled={billing.loading}>
                {billing.loading ? 'Processing...' : 'Add Card'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowAddPaymentForm(false)}
              >
                Cancel
              </button>
            </form>
          )}

          {paymentMethodType === 'bank' && (
            <div className="payment-info">
              <p>ACH Bank Account payments will be set up during checkout.</p>
              <p>You'll be able to link your bank account securely when you subscribe.</p>
              <button
                className="btn-secondary"
                onClick={() => setShowAddPaymentForm(false)}
              >
                Close
              </button>
            </div>
          )}

          {paymentMethodType === 'wallet' && (
            <div className="payment-info">
              <p>Digital wallet payments (Apple Pay, Google Pay) are available during checkout.</p>
              <p>No setup needed - you can use them directly when subscribing.</p>
              <button
                className="btn-secondary"
                onClick={() => setShowAddPaymentForm(false)}
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}

      {/* Payment Methods List */}
      {billing.paymentMethods.cards && billing.paymentMethods.cards.length > 0 && (
        <div className="payment-methods-list">
          <h3>Saved Cards</h3>
          <div className="methods-grid">
            {billing.paymentMethods.cards.map((card) => (
              <div key={card.id} className="payment-method-card">
                <div className="card-header">
                  <span className="card-brand">{card.card?.brand?.toUpperCase()}</span>
                  <span className="card-last4">●●●● {card.card?.last4}</span>
                </div>
                <div className="card-expiry">
                  Expires {card.card?.exp_month}/{card.card?.exp_year}
                </div>
                <div className="card-actions">
                  <button
                    className="btn-link"
                    onClick={() => handleSetDefault(card.id)}
                  >
                    Set as Default
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() => handleDeletePaymentMethod(card.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bank Accounts */}
      {billing.paymentMethods.bankAccounts && billing.paymentMethods.bankAccounts.length > 0 && (
        <div className="payment-methods-list">
          <h3>Saved Bank Accounts</h3>
          <div className="methods-grid">
            {billing.paymentMethods.bankAccounts.map((bank) => (
              <div key={bank.id} className="payment-method-card">
                <div className="card-header">
                  <span className="card-brand">🏦 Bank Account</span>
                  <span className="card-last4">●●●● {bank.us_bank_account?.last4}</span>
                </div>
                <div className="card-expiry">
                  {bank.us_bank_account?.bank_name}
                </div>
                <div className="card-actions">
                  <button
                    className="btn-link"
                    onClick={() => handleSetDefault(bank.id)}
                  >
                    Set as Default
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() => handleDeletePaymentMethod(bank.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!billing.paymentMethods.cards || billing.paymentMethods.cards.length === 0) &&
        (!billing.paymentMethods.bankAccounts || billing.paymentMethods.bankAccounts.length === 0) && (
        <div className="empty-state">
          <p>No payment methods yet. Add one to get started!</p>
        </div>
      )}
    </div>
  );
}
