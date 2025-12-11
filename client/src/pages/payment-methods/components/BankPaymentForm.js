import React from 'react';

export default function BankPaymentForm({
  bankForm,
  onBankFormChange,
  onSubmit,
  onCancel,
  loading,
}) {
  return (
    <form onSubmit={onSubmit} className="form payment-form">
      <h4>Bank Account Information</h4>

      <div className="form-row">
        <div className="form-group full-width">
          <label>Account Holder Name *</label>
          <input
            type="text"
            name="accountHolderName"
            value={bankForm.accountHolderName}
            onChange={onBankFormChange}
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
            onChange={onBankFormChange}
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
            onChange={onBankFormChange}
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
            onChange={onBankFormChange}
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
            onChange={onBankFormChange}
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
            onChange={onBankFormChange}
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
            onChange={onBankFormChange}
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
            onChange={onBankFormChange}
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
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
