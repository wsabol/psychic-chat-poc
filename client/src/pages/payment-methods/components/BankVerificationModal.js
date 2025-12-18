import React, { useState } from 'react';

/**
 * BankVerificationModal - Micro-deposit verification with amounts input
 * Shows user the verification instructions AND lets them enter the amounts immediately
 */
export default function BankVerificationModal({
  setupIntent,
  onSuccess,
  onCancel,
  loading,
  onVerify,
}) {
  const [showAmountForm, setShowAmountForm] = useState(false);
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

      if (onVerify) {
        await onVerify([amt1, amt2]);
      }
      onSuccess();
    } catch (err) {
      console.error('[BANK-VERIFY] Error:', err);
      setError(err.message || 'Verification failed');
      setVerifying(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>🏦 {showAmountForm ? 'Verify Bank Account' : 'Bank Account Added'}</h3>
        
        {!showAmountForm ? (
          <>
            <p className="modal-description">
              Your bank account has been successfully added!
            </p>

            <div className="verification-info">
              <h4>📝 How It Works:</h4>
              <ol>
                <li>In 1-2 business days, two small deposits will appear in your bank account</li>
                <li>The deposits will have verification amounts (e.g., 32¢ and 45¢)</li>
                <li>Return to this app and enter those amounts below</li>
                <li>Once verified, you can use this account for payments</li>
              </ol>
            </div>

            <div className="alert alert-info">
              <strong>ℹ️ Test Mode:</strong> In Stripe test mode, use amounts 32 and 45. In production, verification takes 1-2 business days.
            </div>

            <div className="form-actions">
              <button 
                type="button"
                className="btn-primary" 
                onClick={() => setShowAmountForm(true)}
              >
                ✓ I Have the Amounts
              </button>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={onCancel}
              >
                Later
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="modal-description">
              Enter the two deposit amounts from your bank account
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
                  onClick={() => setShowAmountForm(false)}
                  disabled={verifying}
                >
                  Back
                </button>
              </div>
            </form>
          </>
        )}
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

        .verification-info {
          background: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }

        .verification-info h4 {
          margin-top: 0;
          color: #333;
        }

        .verification-info ol {
          margin-bottom: 0;
          color: #555;
        }

        .verification-info li {
          margin: 8px 0;
        }

        .alert {
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 15px;
          font-size: 14px;
        }

        .alert-info {
          background: #e3f2fd;
          border-left: 4px solid #2196f3;
          color: #1565c0;
        }

        .alert-error {
          background: #f8d7da;
          border: 1px solid #f5c6cb;
          color: #721c24;
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
      `}</style>
    </div>
  );
}
