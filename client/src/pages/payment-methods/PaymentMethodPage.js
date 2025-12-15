import React, { useEffect } from 'react';
import { useBilling } from '../../hooks/useBilling';
import { usePaymentForm } from './hooks/usePaymentForm';
import { usePaymentHandlers } from './hooks/usePaymentHandlers';
import CardPaymentForm from './components/CardPaymentForm';
import BankAccount from './components/BankAccount';
import PaymentMethodsList from './components/PaymentMethodsList';
import PaymentMethodsEmpty from './components/PaymentMethodsEmpty';
import '../PaymentMethodPage.css';

export default function PaymentMethodPage({ userId, token, auth }) {
  const billing = useBilling(token);
  const form = usePaymentForm();

  useEffect(() => {
    billing.fetchPaymentMethods();
  }, []);

  useEffect(() => {
    console.log('[PAGE] Payment methods updated:', billing.paymentMethods);
  }, [billing.paymentMethods]);  
  useEffect(() => {
    billing.fetchPaymentMethods();
  }, []);

  const handlers = usePaymentHandlers({
    billing,
    setupIntent: form.setupIntent,
    billingForm: form.billingForm,
    auth,
    setCardError: form.setCardError,
    setCardSuccess: form.setCardSuccess,
    setLoading: form.setLoading,
    setShowAddPaymentForm: form.setShowAddPaymentForm,
    resetBillingForm: form.resetBillingForm,
    stripeRef: form.stripeRef,
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

  const handleCardSubmit = (cardElement) => {
    handlers.handleCardSubmit(cardElement);
  };

  const handleBankSuccess = async (result) => {
    console.log('[PAGE] Bank account added successfully:', result);
    form.setShowAddPaymentForm(false);
    form.setCardSuccess(true);
    await billing.fetchPaymentMethods();
    setTimeout(() => form.setCardSuccess(false), 3000);
  };

  const handleBankError = (error) => {
    console.error('[PAGE] Bank error:', error);
    form.setCardError(error.message || 'Failed to add bank account');
  };

  return (
    <div className="payment-method-page">
      <div className="section-header">
        <h2>💳 Payment Methods</h2>
        <p>Add and manage your payment methods for subscriptions and purchases</p>
      </div>

      {form.cardError && <div className="alert alert-error">{form.cardError}</div>}
      {form.cardSuccess && (
        <div className="alert alert-success">✓ Payment method added successfully!</div>
      )}

      {!form.showAddPaymentForm && (
        <button
          className="btn-primary"
          onClick={handleAddClick}
          disabled={billing.loading}
        >
          + Add Payment Method
        </button>
      )}

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
            <BankAccount
              token={token}
              onSuccess={handleBankSuccess}
              onError={handleBankError}
              onCancel={() => form.setShowAddPaymentForm(false)}
              loading={form.loading}
            />
          )}
        </div>
      )}

      <PaymentMethodsList
        paymentMethods={billing.paymentMethods}
        defaultPaymentMethodId={billing.paymentMethods?.defaultPaymentMethodId}
        onSetDefault={handlers.handleSetDefault}
        onDelete={handlers.handleDeletePaymentMethod}
      />

      <PaymentMethodsEmpty paymentMethods={billing.paymentMethods} />
    </div>
  );
}
