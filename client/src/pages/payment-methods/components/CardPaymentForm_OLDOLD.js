import React, { useEffect, useRef } from 'react';

export default function CardPaymentForm({
  setupIntent,
  billingForm,
  onBillingFormChange,
  onSubmit,
  onCancel,
  loading,
}) {
  const cardElementRef = useRef(null);
  const elementsRef = useRef(null);
  const cardElementInputRef = useRef(null);

  useEffect(() => {
    // Initialize Stripe Elements when component mounts
    if (window.Stripe && !elementsRef.current) {
      const stripe = window.Stripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);
      elementsRef.current = stripe.elements();

      const cardElement = elementsRef.current.create('card');
      cardElement.mount('#card-element');
      cardElementInputRef.current = cardElement;
    }

    return () => {
      // Cleanup
      if (cardElementInputRef.current) {
        cardElementInputRef.current.unmount();
      }
    };
  }, []);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    if (!cardElementInputRef.current) {
      alert('Card element not loaded');
      return;
    }

    // Pass the card element to parent handler
    onSubmit(cardElementInputRef.current);
  };

  return (
    <form onSubmit={handleFormSubmit} className="form payment-form">
      <h4>Card Information</h4>

      <div className="form-row">
        <div className="form-group full-width">
          <label>Cardholder Name *</label>
          <input
            type="text"
            name="cardholderName"
            value={billingForm.cardholderName}
            onChange={onBillingFormChange}
            placeholder="John Doe"
            className="form-input"
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group full-width">
          <label>Card Details *</label>
          <div id="card-element" className="stripe-element"></div>
          <small>Test: 4242 4242 4242 4242, Expires: 11/28, CVC: 546</small>
        </div>
      </div>

      <h4 style={{ marginTop: '20px' }}>Billing Address</h4>

      <div className="form-row">
        <div className="form-group full-width">
          <label>Street Address</label>
          <input
            type="text"
            name="billingAddress"
            value={billingForm.billingAddress}
            onChange={onBillingFormChange}
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
            value={billingForm.billingCity}
            onChange={onBillingFormChange}
            placeholder="New York"
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label>State</label>
          <input
            type="text"
            name="billingState"
            value={billingForm.billingState}
            onChange={onBillingFormChange}
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
            value={billingForm.billingZip}
            onChange={onBillingFormChange}
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
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
