import React, { useState } from 'react';

/**
 * PaymentVerificationModal - Verify bank account with microdeposit amounts
 * User enters the two small amounts they received in their bank account
 */
export default function PaymentVerificationModal({
  paymentMethod,
  onVerify,
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

    try {
      setVerifying(true);
      setError(null);

      const amt1 = parseInt(amount1, 10);
      const amt2 = parseInt(amount2, 10);

      if (isNaN(amt1) || isNaN(amt2)) {
        setError('Amounts must be valid numbers');
        return;
      }
      await onVerify([amt1, amt2]);
    } catch (err) {
      console.error('[VERIFY-MODAL] Error:', err);
      setError(err.message || 'Verification failed');
      setVerifying(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>🏦 Verify Bank Account</h3>
        
        <p className="modal-description">
          Two small deposits have been sent to your bank account ending in {paymentMethod?.us_bank_account?.last4}.
          <br />
          Enter the amounts to complete verification.
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
                placeholder="e.g., 32"
                min="0"
                max="99"
                className="form-input"
                disabled={verifying}
                required
              />
            </div>
            <div className="form-group">
              <label>Second Deposit Amount (¢)</label>
              <input
                type="number"
                value={amount2}
                onChange={(e) => setAmount2(e.target.value)}
                placeholder="e.g., 45"
                min="0"
                max="99"
                className="form-input"
                disabled={verifying}
                required
              />
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
          <p><strong>ℹ️ How it works:</strong></p>
          <ul>
            <li>Check your bank account in 1-2 business days</li>
            <li>Look for two deposits from Stripe (around $0.32 and $0.45)</li>
            <li>Enter the exact amounts above</li>
            <li>Your account will be verified and ready to use</li>
          </ul>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          padding: 30px;
          border-radius: 8px;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .modal-content h3 {
          margin-top: 0;
          color: #333;
        }

        .modal-description {
          color: #666;
          line-height: 1.6;
          margin: 15px 0 20px 0;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin: 20px 0;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group label {
          font-weight: 600;
          margin-bottom: 8px;
          color: #333;
          font-size: 14px;
        }

        .form-input {
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
        }

        .form-input:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .form-input:disabled {
          background-color: #f5f5f5;
          cursor: not-allowed;
        }

        .form-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin: 25px 0;
        }

        .btn-primary, .btn-secondary {
          padding: 12px 20px;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background-color: #007bff;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #0056b3;
        }

        .btn-primary:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }

        .btn-secondary {
          background-color: #e9ecef;
          color: #333;
        }

        .btn-secondary:hover:not(:disabled) {
          background-color: #dee2e6;
        }

        .btn-secondary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .alert {
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 15px;
          font-size: 14px;
        }

        .alert-error {
          background-color: #f8d7da;
          border: 1px solid #f5c6cb;
          color: #721c24;
        }

        .modal-info {
          background-color: #f0f7ff;
          padding: 15px;
          border-left: 4px solid #007bff;
          border-radius: 4px;
          font-size: 14px;
        }

        .modal-info p {
          margin: 0 0 10px 0;
          font-weight: 600;
          color: #0056b3;
        }

        .modal-info ul {
          margin: 10px 0 0 0;
          padding-left: 20px;
          color: #333;
        }

        .modal-info li {
          margin: 6px 0;
        }
      `}</style>
    </div>
  );
}
