import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../../../context/TranslationContext';
import { useStripe } from '../hooks/useStripe';

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
  stripeRef, // Now receives the Stripe instance
}) {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elementsRef = useRef(null);
  const [elementError, setElementError] = useState(null);
  const [ready, setReady] = useState(false);

  // Store stripe instance in ref for parent to use
  useEffect(() => {
    if (stripe && stripeRef) {
      stripeRef.current = stripe;
    }
  }, [stripe, stripeRef]);

  useEffect(() => {
    // Only initialize once
    if (elementsRef.current || !stripe) return;

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      try {
        const cardElementContainer = document.getElementById('card-element');
        if (!cardElementContainer) {
          setElementError(t('paymentMethods.containerNotFound'));
          return;
        }

        // Create elements from the same Stripe instance
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
        setElementError(t('paymentMethods.failedToInitialize') + ': ' + err.message);
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
  }, [stripe, cardElementRef]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    
    if (elementError) {
      setElementError(t('paymentMethods.fixCardErrors'));
      return;
    }

    if (!ready || !cardElementRef.current) {
      setElementError(t('paymentMethods.cardElementNotReady'));
      return;
    }

    // Call parent handler with the card element
    onSubmit(cardElementRef.current);
  };

  return (
    <form onSubmit={handleFormSubmit} className="form payment-form">
      <h4>{t('paymentMethods.cardInformation')}</h4>

      <div className="form-row">
        <div className="form-group full-width">
          <label>{t('paymentMethods.cardholderName')} *</label>
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
          <label>{t('paymentMethods.cardDetails')} *</label>
          <div id="card-element" className="stripe-card-element"></div>
          {elementError && <div className="element-error">{elementError}</div>}
          {!ready && <div className="element-loading">{t('paymentMethods.loadingCardForm')}</div>}
          <small>{t('paymentMethods.testCardInfo')}</small>
        </div>
      </div>

      <h4 style={{ marginTop: '20px' }}>{t('paymentMethods.billingAddress')}</h4>

      <div className="form-row">
        <div className="form-group full-width">
          <label>{t('paymentMethods.streetAddress')}</label>
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
          <label>{t('paymentMethods.city')}</label>
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
          <label>{t('paymentMethods.state')}</label>
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
          <label>{t('paymentMethods.zipCode')}</label>
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
          {loading ? t('paymentMethods.processing') : t('paymentMethods.addCard')}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={onCancel}
          disabled={loading}
        >
          {t('paymentMethods.cancel')}
        </button>
      </div>
    </form>
  );
}
