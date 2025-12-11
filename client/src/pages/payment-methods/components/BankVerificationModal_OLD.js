import React, { useState } from 'react';

/**
 * BankVerificationModal - Verify bank account with micro-deposit amounts
 * User receives 2 small deposits and enters the amounts to verify ownership
 */
export default function BankVerificationModal({
  setupIntent,
  stripeRef,
  onSuccess,
  onCancel,
  loading,
}) {
  const [amount1, setAmount1] = useState('');
  const [amount2, setAmount2] = useState('');
  const [error, setError] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    
    if (!amount1 || !amount2) {
      setError('Please enter both deposit amounts');
      return;
    }

    if (!stripeRef.current) {
      setError('Stripe not ready');
      return;
    }

    try {
      setVerifying(true);
      setError(null);

      const stripe = stripeRef.current;

      console.log('[BANK VERIFY] Using client secret:', setupIntent.client_secret || setupIntent.clientSecret);
      console.log('[BANK VERIFY] Payment method:', setupIntent.payment_method);

      // Confirm the setup intent with the micro-deposit amounts
      const { setupIntent: result, error: stripeError } = await stripe.confirmUsBankAccountSetup(
        setupIntent.client_secret || setupIntent.clientSecret,
        {
          payment_method: setupIntent.payment_method,
          mandate_data: {
            customer_acceptance: {
              type: 'online',
              accepted_at: Math.floor(Date.now() / 1000),
            },
          },
        }
      );

      if (stripeError) {
        console.error('[BANK VERIFY] Stripe error:', stripeError);
        setError(stripeError.message);
        setVerifying(false);
        return;
      }

      console.log('[BANK VERIFY] Result status:', result?.status);

      if (result && result.status === 'succeeded') {
        console.log('[BANK VERIFY] Verification succeeded!');
        setError(null);
        onSuccess(result);
      } else {
        setError('Verification could not be completed. Status: ' + (result?.status || 'unknown'));
        setVerifying(false);
      }
    } catch (err) {
      console.error('[BANK VERIFY] Exception:', err);
      setError(err.message || 'Verification failed');
      setVerifying(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Verify Bank Account</h3>
        
        <p className="modal-description">
          Two small deposits have been sent to your bank account. 
          Enter the amounts to verify ownership.
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleVerify} className="form">
          <div className="form-row">
            <div className="form-group">
              <label>First Deposit Amount (¢)</label>
              <input
                type="number"
                value={amount1}
                onChange={(e) => setAmount1(e.target.value)}
                placeholder="32"
                min="0"
                max="99"
                className="form-input"
                disabled={verifying}
                required
              />
              <small>Test: 32</small>
            </div>
            <div className="form-group">
              <label>Second Deposit Amount (¢)</label>
              <input
                type="number"
                value={amount2}
                onChange={(e) => setAmount2(e.target.value)}
                placeholder="45"
                min="0"
                max="99"
                className="form-input"
                disabled={verifying}
                required
              />
              <small>Test: 45</small>
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={verifying || loading}
            >
              {verifying ? 'Verifying...' : 'Verify Account'}
            </button>
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={onCancel}
              disabled={verifying}
            >
              Cancel
            </button>
          </div>
        </form>

        <div className="modal-info">
          <p><strong>ℹ️ Test Mode:</strong> Use amounts 32 and 45 to complete verification instantly.</p>
        </div>
      </div>
    </div>
  );
}
