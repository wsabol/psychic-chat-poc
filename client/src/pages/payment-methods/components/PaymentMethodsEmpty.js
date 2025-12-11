import React from 'react';

export default function PaymentMethodsEmpty({ paymentMethods }) {
  const hasNoMethods =
    (!paymentMethods?.cards || paymentMethods.cards.length === 0) &&
    (!paymentMethods?.bankAccounts || paymentMethods.bankAccounts.length === 0);

  if (!hasNoMethods) {
    return null;
  }

  return (
    <div className="empty-state">
      <p>💳 No payment methods yet. Add one to get started!</p>
    </div>
  );
}
