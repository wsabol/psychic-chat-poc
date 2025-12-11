import React, { useEffect } from 'react';
import { useBilling } from '../../hooks/useBilling';
import { usePaymentForm } from './hooks/usePaymentForm';
import { usePaymentHandlers } from './hooks/usePaymentHandlers';
import CardPaymentForm from './components/CardPaymentForm';
import BankPaymentForm from './components/BankPaymentForm';
import PaymentMethodsList from './components/PaymentMethodsList';
import PaymentMethodsEmpty from './components/PaymentMethodsEmpty';
import '../PaymentMethodPage.css';

/**
 * PaymentMethodPage - Manage payment methods (cards, ACH)
 * Test data:
 * - Card: 4242 4242 4242 4242, Expires: 11/28, CVC: 546
 * - Bank: Routing: 123456789, Account: 987654321
 */
export default function PaymentMethodPage({ userId, token, auth }) {
  const billing = useBilling(token);
  const form = usePaymentForm();

  // Load payment methods on mount
  useEffect(() => {
    billing.fetchPaymentMethods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlers = usePaymentHandlers({
    billing,
    setupIntent: form.setupIntent,
    billingForm: form.billingForm,
    bankForm: form.bankForm,
    auth,
    setCardError: form.setCardError,
    setCardSuccess: form.setCardSuccess,
    setLoading: form.setLoading,
    setShowAddPaymentForm: form.setShowAddPaymentForm,
    resetBillingForm: form.resetBillingForm,
    resetBankForm: form.resetBankForm,
    stripeRef: form.stripeRef, // Pass the stripe instance ref
  });

  const handleAddClick = async () => {
    const intent = await handlers.handleAddPaymentMethod();
    if (intent) {
      form.setSetupIntent(intent);
    }
  };

  const handleBillingFormChange = (e) => {
    const { name, value } = e.target;
    form.setBillingForm(prev => ({ ...prev, [name]: value }));
  };

  const handleBankFormChange = (e) => {
    const { name, value } = e.target;
    form.setBankForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCardSubmit = (cardElement) => {
    handlers.handleCardSubmit(cardElement);
  };

  const handleBankSubmit = (e) => {
    handlers.handleBankSubmit(e);
  };

  return (
    <div className="payment-method-page">
      {/* Header */}
      <div className="section-header">
        <h2>💳 Payment Methods</h2>
        <p>Add and manage your payment methods for subscriptions and purchases</p>
      </div>

      {/* Alerts */}
      {form.cardError && <div className="alert alert-error">{form.cardError}</div>}
      {form.cardSuccess && (
        <div className="alert alert-success">✓ Payment method added successfully!</div>
      )}

      {/* Add Payment Method Button */}
      {!form.showAddPaymentForm && (
        <button
          className="btn-primary"
          onClick={handleAddClick}
          disabled={billing.loading}
        >
          + Add Payment Method
        </button>
      )}

      {/* Add Payment Form */}
      {form.showAddPaymentForm && (
        <div className="payment-form-container">
          <h3>Add New Payment Method</h3>

          <div className="form-group">
            <label>Payment Method Type</label>
            <select
              value={form.paymentMethodType}
              onChange={(e) => form.setPaymentMethodType(e.target.value)}
              className="form-select"
            >
              <option value="card">💳 Credit/Debit Card</option>
              <option value="bank">🏦 ACH Bank Account (US)</option>
            </select>
          </div>

          {form.paymentMethodType === 'card' && (
            <CardPaymentForm
              billingForm={form.billingForm}
              onBillingFormChange={handleBillingFormChange}
              onSubmit={handleCardSubmit}
              onCancel={() => form.setShowAddPaymentForm(false)}
              loading={form.loading}
              cardElementRef={form.cardElementRef}
              stripeRef={form.stripeRef}
            />
          )}

          {form.paymentMethodType === 'bank' && (
            <BankPaymentForm
              bankForm={form.bankForm}
              onBankFormChange={handleBankFormChange}
              onSubmit={handleBankSubmit}
              onCancel={() => form.setShowAddPaymentForm(false)}
              loading={form.loading}
            />
          )}
        </div>
      )}

      {/* Payment Methods List */}
      <PaymentMethodsList
        paymentMethods={billing.paymentMethods}
        onSetDefault={handlers.handleSetDefault}
        onDelete={handlers.handleDeletePaymentMethod}
      />

      {/* Empty State */}
      <PaymentMethodsEmpty paymentMethods={billing.paymentMethods} />
    </div>
  );
}
