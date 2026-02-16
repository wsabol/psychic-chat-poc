import React, { useEffect, useRef, useState } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { useTranslation } from '../../../context/TranslationContext';

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
  const elements = useElements();
  const [elementError, setElementError] = useState(null);
  const [ready, setReady] = useState(false);

  // Store stripe instance in ref for parent to use
  useEffect(() => {
    if (stripe && stripeRef) {
      stripeRef.current = stripe;
    }
  }, [stripe, stripeRef]);

  useEffect(() => {
    if (!stripe || !elements) {
      console.log('[CARD-FORM] Waiting for Stripe/Elements:', { stripe: !!stripe, elements: !!elements });
      return;
    }

    console.log('[CARD-FORM] Getting card element from Elements...');
    
    // Get the card element that was already created by Elements provider
    const cardElement = elements.getElement(CardElement);
    
    if (!cardElement) {
      console.error('[CARD-FORM] Card element not found!');
      setElementError(t('paymentMethods.containerNotFound'));
      return;
    }

    console.log('[CARD-FORM] Card element found, setting up...');
    
    // Store reference for parent
    cardElementRef.current = cardElement;
    setReady(true);
    
    // Handle card errors
    const handleChange = (event) => {
      console.log('[CARD-FORM] Card element change:', event);
      if (event.error) {
        setElementError(event.error.message);
      } else {
        setElementError(null);
      }
      if (event.complete) {
        console.log('[CARD-FORM] Card is complete!');
      }
    };

    const handleReady = () => {
      console.log('[CARD-FORM] ✅ Card element is READY for input!');
      setReady(true);
    };

    const handleFocus = () => {
      console.log('[CARD-FORM] Card element focused');
    };

    cardElement.on('change', handleChange);
    cardElement.on('ready', handleReady);
    cardElement.on('focus', handleFocus);

    return () => {
      cardElement.off('change', handleChange);
      cardElement.off('ready', handleReady);
      cardElement.off('focus', handleFocus);
    };
  }, [stripe, elements, cardElementRef, t]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    
    if (elementError) {
      setElementError(t('paymentMethods.fixCardErrors'));
      return;
    }

    if (!stripe || !elements) {
      setElementError(t('paymentMethods.stripeNotReady'));
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setElementError(t('paymentMethods.cardElementNotReady'));
      return;
    }

    // Call parent handler with the card element
    onSubmit(cardElement);
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
          <div className="stripe-card-element">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '14px',
                    color: '#424242',
                    fontFamily: 'Arial, sans-serif',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                  invalid: {
                    color: '#fa755a',
                    iconColor: '#fa755a',
                  },
                },
              }}
            />
          </div>
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
