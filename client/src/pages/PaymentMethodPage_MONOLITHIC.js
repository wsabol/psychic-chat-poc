import React, { useState, useEffect } from 'react';
import { useBilling } from '../hooks/useBilling';
import './PaymentMethodPage.css';

/**
 * PaymentMethodPage - Manage payment methods (cards, ACH)
 * Test data:
 * - Card: 4242 4242 4242 4242, Expires: 11/28, CVC: 546
 * - Bank: Routing: 123456789, Account: 987654321
 */
export default function PaymentMethodPage({ userId, token, auth }) {
  const billing = useBilling(token);
  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);
  const [paymentMethodType, setPaymentMethodType] = useState('card');
  const [setupIntent, setSetupIntent] = useState(null);
  const [cardError, setCardError] = useState(null);
  const [cardSuccess, setCardSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Card form state
  const [cardForm, setCardForm] = useState({
    cardNumber: '',
    expiry: '',
    cvc: '',
    cardholderName: '',
    billingAddress: '',
    billingCity: '',
    billingState: '',
    billingZip: '',
  });

  // Bank form state
  const [bankForm, setBankForm] = useState({
    accountHolderName: '',
    accountType: 'checking',
    routingNumber: '',
    accountNumber: '',
    billingAddress: '',
    billingCity: '',
    billingState: '',
    billingZip: '',
  });

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

  const handleCardFormChange = (e) => {
    const { name, value } = e.target;
    setCardForm(prev => ({ ...prev, [name]: value }));
  };

  const handleBankFormChange = (e) => {
    const { name, value } = e.target;
    setBankForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCardSubmit = async (e) => {
    e.preventDefault();
    if (!setupIntent || !window.Stripe) {
      setCardError('Payment system not ready');
      return;
    }

    // Validate card form
    if (!cardForm.cardNumber || !cardForm.expiry || !cardForm.cvc) {
      setCardError('Please fill in all card details');
      return;
    }

    try {
      setLoading(true);
      setCardError(null);
      const stripe = window.Stripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

      // Parse expiry
      const [expMonth, expYear] = cardForm.expiry.split('/');

      const { setupIntent: result } = await stripe.confirmCardSetup(
        setupIntent.clientSecret,
        {
          payment_method: {
            card: {
              number: cardForm.cardNumber.replace(/\s/g, ''),
              exp_month: parseInt(expMonth),
              exp_year: parseInt('20' + expYear),
              cvc: cardForm.cvc,
            },
            billing_details: {
              name: cardForm.cardholderName,
              email: auth?.authEmail,
              address: {
                line1: cardForm.billingAddress,
                city: cardForm.billingCity,
                state: cardForm.billingState,
                postal_code: cardForm.billingZip,
              },
            },
          },
        }
      );

      if (result.status === 'succeeded') {
        setCardSuccess(true);
        setShowAddPaymentForm(false);
        setCardForm({
          cardNumber: '',
          expiry: '',
          cvc: '',
          cardholderName: '',
          billingAddress: '',
          billingCity: '',
          billingState: '',
          billingZip: '',
        });
        await billing.fetchPaymentMethods();
        setTimeout(() => setCardSuccess(false), 3000);
      } else {
        setCardError('Failed to confirm payment method');
      }
    } catch (err) {
      setCardError(err.message || 'Payment method setup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBankSubmit = async (e) => {
    e.preventDefault();
    
    // Validate bank form
    if (!bankForm.routingNumber || !bankForm.accountNumber) {
      setCardError('Please fill in routing and account numbers');
      return;
    }

    if (!setupIntent || !window.Stripe) {
      setCardError('Payment system not ready');
      return;
    }

    try {
      setLoading(true);
      setCardError(null);
      const stripe = window.Stripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

      const { setupIntent: result } = await stripe.confirmUsBankAccountSetup(
        setupIntent.clientSecret,
        {
          payment_method: {
            us_bank_account: {
              account_holder_type: 'individual',
              account_number: bankForm.accountNumber,
              routing_number: bankForm.routingNumber,
              account_type: bankForm.accountType,
            },
            billing_details: {
              name: bankForm.accountHolderName,
              email: auth?.authEmail,
              address: {
                line1: bankForm.billingAddress,
                city: bankForm.billingCity,
                state: bankForm.billingState,
                postal_code: bankForm.billingZip,
              },
            },
          },
        }
      );

      if (result.status === 'succeeded') {
        setCardSuccess(true);
        setShowAddPaymentForm(false);
        setBankForm({
          accountHolderName: '',
          accountType: 'checking',
          routingNumber: '',
          accountNumber: '',
          billingAddress: '',
          billingCity: '',
          billingState: '',
          billingZip: '',
        });
        await billing.fetchPaymentMethods();
        setTimeout(() => setCardSuccess(false), 3000);
      } else {
        setCardError('Failed to confirm bank account');
      }
    } catch (err) {
      setCardError(err.message || 'Bank account setup failed');
    } finally {
      setLoading(false);
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
      {cardSuccess && <div className="alert alert-success">✓ Payment method added successfully!</div>}

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
              <option value="card">💳 Credit/Debit Card</option>
              <option value="bank">🏦 ACH Bank Account (US)</option>
            </select>
          </div>

          {/* CARD FORM */}
          {paymentMethodType === 'card' && (
            <form onSubmit={handleCardSubmit} className="form payment-form">
              <h4>Card Information</h4>
              
              <div className="form-row">
                <div className="form-group full-width">
                  <label>Cardholder Name *</label>
                  <input
                    type="text"
                    name="cardholderName"
                    value={cardForm.cardholderName}
                    onChange={handleCardFormChange}
                    placeholder="John Doe"
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group full-width">
                  <label>Card Number *</label>
                  <input
                    type="text"
                    name="cardNumber"
                    value={cardForm.cardNumber}
                    onChange={handleCardFormChange}
                    placeholder="4242 4242 4242 4242"
                    maxLength="19"
                    className="form-input"
                    required
                  />
                  <small>Test: 4242 4242 4242 4242</small>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Expiry Date (MM/YY) *</label>
                  <input
                    type="text"
                    name="expiry"
                    value={cardForm.expiry}
                    onChange={handleCardFormChange}
                    placeholder="11/28"
                    maxLength="5"
                    className="form-input"
                    required
                  />
                  <small>Test: 11/28</small>
                </div>
                <div className="form-group">
                  <label>CVC (Security Code) *</label>
                  <input
                    type="text"
                    name="cvc"
                    value={cardForm.cvc}
                    onChange={handleCardFormChange}
                    placeholder="546"
                    maxLength="4"
                    className="form-input"
                    required
                  />
                  <small>Test: 546</small>
                </div>
              </div>

              <h4 style={{ marginTop: '20px' }}>Billing Address</h4>

              <div className="form-row">
                <div className="form-group full-width">
                  <label>Street Address</label>
                  <input
                    type="text"
                    name="billingAddress"
                    value={cardForm.billingAddress}
                    onChange={handleCardFormChange}
                    placeholder="123 Main St"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    name="billingCity"
                    value={cardForm.billingCity}
                    onChange={handleCardFormChange}
                    placeholder="New York"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>State</label>
                  <input
                    type="text"
                    name="billingState"
                    value={cardForm.billingState}
                    onChange={handleCardFormChange}
                    placeholder="NY"
                    maxLength="2"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>ZIP Code</label>
                  <input
                    type="text"
                    name="billingZip"
                    value={cardForm.billingZip}
                    onChange={handleCardFormChange}
                    placeholder="10001"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Processing...' : 'Add Card'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAddPaymentForm(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* BANK ACCOUNT FORM */}
          {paymentMethodType === 'bank' && (
            <form onSubmit={handleBankSubmit} className="form payment-form">
              <h4>Bank Account Information</h4>

              <div className="form-row">
                <div className="form-group full-width">
                  <label>Account Holder Name *</label>
                  <input
                    type="text"
                    name="accountHolderName"
                    value={bankForm.accountHolderName}
                    onChange={handleBankFormChange}
                    placeholder="John Doe"
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Account Type *</label>
                  <select
                    name="accountType"
                    value={bankForm.accountType}
                    onChange={handleBankFormChange}
                    className="form-select"
                    required
                  >
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Routing Number *</label>
                  <input
                    type="text"
                    name="routingNumber"
                    value={bankForm.routingNumber}
                    onChange={handleBankFormChange}
                    placeholder="123456789"
                    maxLength="9"
                    className="form-input"
                    required
                  />
                  <small>Test: 123456789</small>
                </div>
                <div className="form-group">
                  <label>Account Number *</label>
                  <input
                    type="text"
                    name="accountNumber"
                    value={bankForm.accountNumber}
                    onChange={handleBankFormChange}
                    placeholder="987654321"
                    maxLength="17"
                    className="form-input"
                    required
                  />
                  <small>Test: 987654321</small>
                </div>
              </div>

              <h4 style={{ marginTop: '20px' }}>Billing Address</h4>

              <div className="form-row">
                <div className="form-group full-width">
                  <label>Street Address</label>
                  <input
                    type="text"
                    name="billingAddress"
                    value={bankForm.billingAddress}
                    onChange={handleBankFormChange}
                    placeholder="123 Main St"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    name="billingCity"
                    value={bankForm.billingCity}
                    onChange={handleBankFormChange}
                    placeholder="New York"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>State</label>
                  <input
                    type="text"
                    name="billingState"
                    value={bankForm.billingState}
                    onChange={handleBankFormChange}
                    placeholder="NY"
                    maxLength="2"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>ZIP Code</label>
                  <input
                    type="text"
                    name="billingZip"
                    value={bankForm.billingZip}
                    onChange={handleBankFormChange}
                    placeholder="10001"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Processing...' : 'Add Bank Account'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAddPaymentForm(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Payment Methods List */}
      {billing.paymentMethods?.cards && billing.paymentMethods.cards.length > 0 && (
        <div className="payment-methods-list">
          <h3>Saved Cards</h3>
          <div className="methods-grid">
            {billing.paymentMethods.cards.map((card) => (
              <div key={card.id} className="payment-method-card">
                <div className="card-header">
                  <span className="card-brand">💳 {card.card?.brand?.toUpperCase()}</span>
                  <span className="card-last4">●●●● {card.card?.last4}</span>
                </div>
                <div className="card-expiry">
                  Expires {card.card?.exp_month}/{card.card?.exp_year}
                </div>
                <div className="card-actions">
                  <button className="btn-link" onClick={() => handleSetDefault(card.id)}>
                    Set as Default
                  </button>
                  <button className="btn-danger" onClick={() => handleDeletePaymentMethod(card.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bank Accounts */}
      {billing.paymentMethods?.bankAccounts && billing.paymentMethods.bankAccounts.length > 0 && (
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
                  <button className="btn-link" onClick={() => handleSetDefault(bank.id)}>
                    Set as Default
                  </button>
                  <button className="btn-danger" onClick={() => handleDeletePaymentMethod(bank.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!billing.paymentMethods?.cards || billing.paymentMethods.cards.length === 0) &&
        (!billing.paymentMethods?.bankAccounts || billing.paymentMethods.bankAccounts.length === 0) && (
        <div className="empty-state">
          <p>No payment methods yet. Add one to get started!</p>
        </div>
      )}
    </div>
  );
}
