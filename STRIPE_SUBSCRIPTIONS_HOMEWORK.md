# Stripe Subscriptions Implementation - Homework

**Goal**: Get subscriptions working so you can get PAID  
**Deadline**: Tomorrow  
**Critical Rule**: NEVER add sensitive data to database without encryption

---

## What We Need to Make Work

Your app currently has:
- ✅ Stripe customer creation (encrypted customer ID)
- ✅ Payment methods (cards, bank accounts)
- ✅ Setup intents (for adding payment methods)
- ❌ **Subscriptions (BROKEN - need to fix)**

---

## What Subscriptions Are

**Recurring billing cycle:**
1. Customer signs up for a plan
2. Stripe automatically charges them every month/year
3. They get access to features/content
4. If payment fails, you get notified
5. They can cancel anytime

**Key Stripe Objects:**
- **Product** = Your service (e.g., "Premium Astrology Readings")
- **Price** = Cost + interval (e.g., "$9.99/month" or "$99/year")
- **Subscription** = Customer enrolled in a specific Price
- **Invoice** = Monthly charge (automatically created)

---

## Steps to Make Subscriptions Work

### STEP 1: Create Products and Prices in Stripe Dashboard

Go to https://dashboard.stripe.com/products

**Create Product 1:**
- Name: "Monthly Reading Plan"
- Description: "Monthly astrology readings and consultations"
- Type: Service
- Add Price:
  - Amount: $9.99
  - Interval: Monthly
  - **Copy the PRICE ID** (looks like `price_1Abc...`)

**Create Product 2:**
- Name: "Annual Reading Plan"
- Description: "Full year of astrology readings"
- Type: Service
- Add Price:
  - Amount: $99.99
  - Interval: Yearly
  - **Copy the PRICE ID** (looks like `price_1Xyz...`)

**Save these Price IDs somewhere safe** - you'll need them in your frontend.

---

### STEP 2: Check Current API Code

**File: `api/services/stripeService.js`**

The code for subscriptions is already there:

```javascript
export async function createSubscription(customerId, priceId) {
  // Creates subscription using priceId
}

export async function getSubscriptions(customerId) {
  // Gets active subscriptions
}

export async function cancelSubscription(subscriptionId) {
  // Cancels at end of period
}

export async function getAvailablePrices() {
  // Fetches all active prices from Stripe
}
```

**This code is correct.** It does NOT need changes.

---

### STEP 3: Verify Routes Work

**File: `api/routes/billing/subscriptions.js`**

Routes available:
- `POST /billing/create-subscription` - Create a subscription
- `GET /billing/subscriptions` - Get user's subscriptions
- `POST /billing/cancel-subscription/:subscriptionId` - Cancel subscription
- `GET /billing/available-prices` - Get list of all plans

**These routes are correct.** They do NOT need changes.

---

### STEP 4: Frontend Integration

**File: `client/src/pages/BillingPage.js` or similar**

Need to:
1. Call `GET /billing/available-prices` to show available plans
2. Show UI with plan options (Monthly $9.99, Annual $99.99, etc.)
3. When user clicks "Subscribe":
   - Call `POST /billing/create-subscription` with `priceId`
   - If subscription is `incomplete` → need payment confirmation
   - If subscription is `active` → subscription started!

**You might need to check:**
- Does BillingPage fetch and display available prices?
- Does it have a "Subscribe" button for each plan?
- Does it handle subscription confirmation?

---

### STEP 5: Webhook Integration (IMPORTANT!)

**Problem**: Stripe creates invoices, but your app needs to know when:
- Subscription created
- Payment succeeded
- Payment failed
- Subscription cancelled

**Solution**: Webhooks at `POST /webhooks/stripe`

This endpoint should listen for:
- `customer.subscription.created` - New subscription
- `invoice.payment_succeeded` - Payment went through
- `invoice.payment_failed` - Payment failed
- `customer.subscription.deleted` - Cancelled

**Check if this exists:**
```bash
find api -name "*webhook*" -type f
```

If not, we need to create it.

---

### STEP 6: Database Schema for Subscriptions

**What sensitive info we store:**
- `stripe_subscription_id` → MUST BE ENCRYPTED
- `stripe_customer_id` → ALREADY ENCRYPTED ✅
- `subscription_status` → plaintext (active, cancelled, past_due, etc.)
- `current_period_start` → plaintext (Unix timestamp)
- `current_period_end` → plaintext (Unix timestamp)
- `plan_name` → plaintext (e.g., "Monthly Reading Plan")
- `price_amount` → plaintext (e.g., 999 for $9.99)
- `price_interval` → plaintext (e.g., "month" or "year")

**Migration needed:**
```sql
ALTER TABLE user_personal_info ADD COLUMN stripe_subscription_id_encrypted BYTEA;
ALTER TABLE user_personal_info ADD COLUMN subscription_status VARCHAR(50);
ALTER TABLE user_personal_info ADD COLUMN current_period_start INTEGER;
ALTER TABLE user_personal_info ADD COLUMN current_period_end INTEGER;
ALTER TABLE user_personal_info ADD COLUMN plan_name VARCHAR(255);
ALTER TABLE user_personal_info ADD COLUMN price_amount INTEGER;
ALTER TABLE user_personal_info ADD COLUMN price_interval VARCHAR(50);
```

**CRITICAL**: When you query subscription data, ALWAYS encrypt sensitive fields before storing!

---

## Summary - What You Need to Do Tonight

### Research & Plan
1. ✅ Review Stripe subscription overview (done - see above)
2. ✅ Understand the lifecycle (done - see above)
3. ⏳ **Log into your Stripe Dashboard**
4. ⏳ **Create 2-3 subscription products with prices**
5. ⏳ **Copy the PRICE IDs**

### Code Review (Tomorrow morning)
6. ⏳ Check if `client/src/pages/BillingPage.js` exists and has subscription UI
7. ⏳ Verify `api/routes/billing/subscriptions.js` is wired correctly
8. ⏳ Check if webhooks endpoint exists
9. ⏳ Plan database schema for subscription tracking

### Database (Tomorrow)
10. ⏳ Create migration to add subscription columns
11. ⏳ **ENCRYPT subscription_id** (use same pattern as stripe_customer_id)
12. ⏳ Update stripeService to store/retrieve encrypted subscription_id

### API (Tomorrow)
13. ⏳ Create webhook endpoint to handle Stripe events
14. ⏳ Listen for subscription events
15. ⏳ Update database when subscription changes

### Frontend (Tomorrow)
16. ⏳ Display available prices/plans
17. ⏳ Add "Subscribe" buttons
18. ⏳ Handle subscription confirmation
19. ⏳ Show subscription status on BillingPage

---

## CRITICAL RULES TO FOLLOW

### Rule 1: ENCRYPT ALL SENSITIVE DATA
```javascript
// ✅ CORRECT - stripe_subscription_id is encrypted
const updateQuery = `UPDATE user_personal_info 
                     SET stripe_subscription_id_encrypted = pgp_sym_encrypt($1, $2)
                     WHERE user_id = $3`;

// ❌ WRONG - storing unencrypted!
const updateQuery = `UPDATE user_personal_info 
                     SET stripe_subscription_id = $1
                     WHERE user_id = $2`;
```

### Rule 2: DECRYPT WITH CORRECT KEY
```javascript
// ✅ CORRECT - using process.env.ENCRYPTION_KEY
const query = `SELECT pgp_sym_decrypt(stripe_subscription_id_encrypted, $1) 
               as stripe_subscription_id FROM user_personal_info WHERE user_id = $2`;
const result = await db.query(query, [process.env.ENCRYPTION_KEY, userId]);

// ❌ WRONG - hardcoded default key
const result = await db.query(query, ['default-encryption-key', userId]);
```

### Rule 3: VALIDATE KEY EXISTS
```javascript
// ✅ CORRECT - before encrypting
const encryptionKey = process.env.ENCRYPTION_KEY;
if (!encryptionKey) {
  throw new Error('ENCRYPTION_KEY not set!');
}

// ❌ WRONG - silent failure
const encryptionKey = process.env.ENCRYPTION_KEY || 'fallback-key';
```

---

## What's Already Working

✅ `getOrCreateStripeCustomer()` - Creates customer, encrypts ID correctly  
✅ `createSubscription()` - Creates subscription (but doesn't store it encrypted)  
✅ `getSubscriptions()` - Gets subscriptions from Stripe API  
✅ `cancelSubscription()` - Cancels at end of period  
✅ Routes are all wired  
✅ Encryption is working correctly  

---

## What Needs Work Tomorrow

❌ Database schema for storing subscription metadata  
❌ Encrypt subscription_id before storing  
❌ Decrypt subscription_id when reading  
❌ Webhook endpoint for subscription events  
❌ BillingPage UI to show and manage subscriptions  
❌ Test end-to-end: create subscription → get charged → see in app  

---

## Stripe API Docs for Tomorrow

- Subscriptions: https://stripe.com/docs/billing/subscriptions/overview
- Create Subscription: https://stripe.com/docs/api/subscriptions/create
- Webhook Events: https://stripe.com/docs/api/events/types
- Setup: https://stripe.com/docs/billing/subscriptions/fixed-price

---

## Success Criteria

Tomorrow at end of day:
1. ✅ Can create subscription for a user
2. ✅ Subscription ID is encrypted in database
3. ✅ Can retrieve subscription status
4. ✅ Can cancel subscription
5. ✅ Webhooks update subscription status
6. ✅ UI shows "You are subscribed to Premium Plan"
7. ✅ Test real charge goes through

---

## Remember

**"I need to get paid"** = Subscriptions must work perfectly.

**NEVER, NEVER, NEVER add sensitive data unencrypted** = Every subscription_id, price, customer data must use `pgp_sym_encrypt()` with your real `ENCRYPTION_KEY`.

**Do your homework** = Stripe Dashboard setup tonight, so we're ready to code tomorrow.

---

**You got this. Get some rest and crush it tomorrow.**
