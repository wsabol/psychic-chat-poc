import React from 'react';

export default function PaymentMethodsList({
  paymentMethods,
  onSetDefault,
  onDelete,
  onVerify,
}) {
  return (
    <>
      {paymentMethods?.cards && paymentMethods.cards.length > 0 && (
        <div className="payment-methods-list">
          <h3>💳 Saved Cards</h3>
          <div className="methods-grid">
            {paymentMethods.cards.map((card) => (
              <div key={card.id} className="payment-method-card">
                <div className="card-header">
                  <span className="card-brand">{card.card?.brand?.toUpperCase()}</span>
                  <span className="card-last4">●●●● {card.card?.last4}</span>
                </div>
                <div className="card-expiry">
                  Expires {card.card?.exp_month}/{card.card?.exp_year}
                </div>
                <div className="card-actions">
                  <button className="btn-link" onClick={() => onSetDefault(card.id)}>
                    Set as Default
                  </button>
                  <button className="btn-danger" onClick={() => onDelete(card.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {paymentMethods?.bankAccounts && paymentMethods.bankAccounts.length > 0 && (
        <div className="payment-methods-list">
          <h3>🏦 Saved Bank Accounts</h3>
          <div className="methods-grid">
            {paymentMethods.bankAccounts.map((bank) => {
              // Get verification status
              const status = bank.us_bank_account?.verification_status;
              const isPending = status === 'pending_verification';
              
              // Display status badge
              let statusDisplay = '✓ Verified';
              let statusColor = '#4caf50';
              
              if (isPending) {
                statusDisplay = '⏳ Pending Verification';
                statusColor = '#ff9800';
              }
              
              return (
                <div key={bank.id} className="payment-method-card">
                  <div className="card-header">
                    <span className="card-brand">Bank Account</span>
                    <span className="card-last4">●●●● {bank.us_bank_account?.last4}</span>
                  </div>
                  <div className="card-expiry">
                    {bank.us_bank_account?.bank_name}
                  </div>
                  <div className="card-status" style={{ 
                    color: statusColor,
                    marginBottom: '10px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {statusDisplay}
                  </div>
                  <div className="card-actions">
                    {isPending && onVerify && (
                      <button 
                        className="btn-warning"
                        onClick={() => onVerify(bank)}
                        title="Enter the microdeposit amounts to verify"
                      >
                        🔐 Verify
                      </button>
                    )}
                    <button className="btn-link" onClick={() => onSetDefault(bank.id)}>
                      Set as Default
                    </button>
                    <button 
                      className="btn-danger" 
                      onClick={() => {
                        if (window.confirm('Delete this bank account?')) {
                          onDelete(bank.id);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        .btn-warning {
          background-color: #ff9800;
          color: white;
          padding: 8px 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          margin-right: 8px;
          transition: all 0.2s;
        }

        .btn-warning:hover {
          background-color: #f57c00;
        }
      `}</style>
    </>
  );
}
