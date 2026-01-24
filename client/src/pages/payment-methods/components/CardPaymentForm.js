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
          <label>{t('paymentMethods.country')} *</label>
          <select
            name="billingCountry"
            value={billingForm.billingCountry || ''}
            onChange={onBillingFormChange}
            className="form-input"
            required
          >
            <option value="">{t('paymentMethods.selectCountry')}</option>
            <option value="US">{t('countries.US')}</option>
            <option value="CA">{t('countries.CA')}</option>
            <option value="GB">{t('countries.GB')}</option>
            <option value="AU">{t('countries.AU')}</option>
            <option value="DE">{t('countries.DE')}</option>
            <option value="FR">{t('countries.FR')}</option>
            <option value="IT">{t('countries.IT')}</option>
            <option value="ES">{t('countries.ES')}</option>
            <option value="NL">{t('countries.NL')}</option>
            <option value="BE">{t('countries.BE')}</option>
            <option value="CH">{t('countries.CH')}</option>
            <option value="AT">{t('countries.AT')}</option>
            <option value="SE">{t('countries.SE')}</option>
            <option value="NO">{t('countries.NO')}</option>
            <option value="DK">{t('countries.DK')}</option>
            <option value="FI">{t('countries.FI')}</option>
            <option value="IE">{t('countries.IE')}</option>
            <option value="PT">{t('countries.PT')}</option>
            <option value="GR">{t('countries.GR')}</option>
            <option value="PL">{t('countries.PL')}</option>
            <option value="CZ">{t('countries.CZ')}</option>
            <option value="HU">{t('countries.HU')}</option>
            <option value="RO">{t('countries.RO')}</option>
            <option value="BG">{t('countries.BG')}</option>
            <option value="HR">{t('countries.HR')}</option>
            <option value="SI">{t('countries.SI')}</option>
            <option value="SK">{t('countries.SK')}</option>
            <option value="LT">{t('countries.LT')}</option>
            <option value="LV">{t('countries.LV')}</option>
            <option value="EE">{t('countries.EE')}</option>
            <option value="JP">{t('countries.JP')}</option>
            <option value="CN">{t('countries.CN')}</option>
            <option value="IN">{t('countries.IN')}</option>
            <option value="BR">{t('countries.BR')}</option>
            <option value="MX">{t('countries.MX')}</option>
            <option value="AR">{t('countries.AR')}</option>
            <option value="CL">{t('countries.CL')}</option>
            <option value="CO">{t('countries.CO')}</option>
            <option value="PE">{t('countries.PE')}</option>
            <option value="ZA">{t('countries.ZA')}</option>
            <option value="KR">{t('countries.KR')}</option>
            <option value="SG">{t('countries.SG')}</option>
            <option value="MY">{t('countries.MY')}</option>
            <option value="TH">{t('countries.TH')}</option>
            <option value="ID">{t('countries.ID')}</option>
            <option value="PH">{t('countries.PH')}</option>
            <option value="VN">{t('countries.VN')}</option>
            <option value="NZ">{t('countries.NZ')}</option>
            <option value="IL">{t('countries.IL')}</option>
            <option value="TR">{t('countries.TR')}</option>
            <option value="AE">{t('countries.AE')}</option>
            <option value="SA">{t('countries.SA')}</option>
          </select>
        </div>
      </div>

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
