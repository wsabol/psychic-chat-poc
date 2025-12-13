# Standard Stripe US Bank Account Flow (Simplified)

## What the application should do:

### Step 1: Create SetupIntent (Server)
POST /billing/setup-intent
- Returns: { clientSecret, customerId }

### Step 2: Create PaymentMethod & Confirm (Frontend)
```javascript
stripe.createPaymentMethod({
  type: 'us_bank_account',
  us_bank_account: {
    account_holder_type: 'individual',
    account_number: '000123456789',
    routing_number: '110000000',
    account_type: 'checking',
  },
  billing_details: { name, email }
})

stripe.confirmUsBankAccountSetup(clientSecret, {
  payment_method: paymentMethodId,
  mandate_data: { ... }
})
```

### Step 3: Handle Response
- Status: "requires_action" with next_action.type = "verify_with_microdeposits"
  → Show message: "Verification in progress. Check back in 1-2 business days."
- Status: "succeeded"  
  → Show success message

### Step 4: List Payment Methods
GET /billing/payment-methods
- Returns: All attached payment methods (cards + bank accounts)
- Bank accounts show with verification_status: "pending_verification", "verified", or "verification_failed"

### Step 5: User sees account in list
- If pending_verification: Show "⏳ Verification in progress"
- If verified: Show "✓ Verified"
- Allow Set as Default
- Allow Delete

## NO custom microdeposit verification UI needed
- Stripe handles verification automatically
- User doesn't enter amounts
- Account appears in list immediately (even if pending)
- Verification status updates automatically

## For Testing:
In Stripe test mode, use test bank accounts that verify instantly or show as verified.
