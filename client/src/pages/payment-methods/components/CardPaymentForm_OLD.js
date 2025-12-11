import React, { useEffect, useRef, useState } from 'react';

/**
 * CardPaymentForm - Uses Stripe Elements for secure card collection
 */
export default function CardPaymentForm({
  billingForm,
  onBillingFormChange,
  onSubmit,
  onCancel,
  loading,
  cardElementRef,
}) {
  const elementsRef = useRef(null);
  const [elementError, setElementError] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Only initialize once
    if (elementsRef.current) return;

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      try {
        if (!window.Stripe) {
          setElementError('Stripe.js not loaded');
          return;
        }

        const cardElementContainer = document.getElementById('card-element');
        if (!cardElementContainer) {
          setElementError('Card element container not found');
          return;
        }

        // Initialize Stripe Elements
        const stripe = window.Stripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);
        const elements = stripe.elements();
        elementsRef.current = elements;

        // Create card element
        const cardElement = elements.create('card', {
          style: {
            base: {
              fontSize: '14px',
              color: '#424242',
              fontFamily: 'Arial, sans-serif',
            },
            invalid: {
              color: '#fa755a',
            },
          },
        });

        // Mount card element
        cardElement.mount('#card-element');

        // Store reference for parent
        cardElementRef.current = cardElement;
        setElementError(null);
        setReady(true);

        // Handle card errors
        cardElement.addEventListener('change', (event) => {
          if (event.error) {
            setElementError(event.error.message);
          } else {
            setElementError(null);
          }
        });
      } catch (err) {
        setElementError('Failed to initialize card form: ' + err.message);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (cardElementRef.current) {
        try {
          cardElementRef.current.unmount();
        } catch (e) {
          // Ignore unmount errors
        }
        cardElementRef.current = null;
      }
    };
  }, [cardElementRef]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    
    if (elementError) {
      setElementError('Please fix card errors before submitting');
      return;
    }

    if (!ready || !cardElementRef.current) {
      setElementError('Card element is not ready');
      return;
    }

    // Call parent handler with the card element
    onSubmit(cardElementRef.current);
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
          <div id="card-element" className="stripe-card-element"></div>
          {elementError && <div className="element-error">{elementError}</div>}
          {!ready && <div className="element-loading">Loading card form...</div>}
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
        <button type="submit" className="btn-primary" disabled={loading || !ready || elementError}>
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
