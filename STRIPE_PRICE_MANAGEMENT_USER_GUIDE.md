# Stripe Price Management - User Guide

## Overview
The Price Management feature allows you to manage subscription price changes with proper customer notification and migration workflows.

## How to Access
1. Log in as an admin
2. Navigate to the **Admin Dashboard**
3. Click the **💰 Price Management** tab

---

## Understanding the Three Sections

### 📋 Section 1: Current Prices & Subscriber Counts

**What it shows:**
- All active Stripe prices for your products
- How many active subscribers are on each price (monthly/yearly)

**What you'll see:**
- **Price ID**: Stripe's unique identifier (e.g., `price_1234abcd`)
- **Product Name**: Name of your product
- **Amount**: Price in USD
- **Interval**: Billing frequency (month or year)
- **Subscriber Count**: Number of active subscriptions on this price

**If empty:**
- No prices configured yet in Stripe, OR
- Your Stripe API key is not set (check `STRIPE_SECRET_KEY` environment variable)

---

### ➕ Section 2: Create New Price

**Purpose:** Create a new price in Stripe without changing existing subscriptions.

**Where to get Product ID:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Products** → **Product catalog**
3. Click on your product (e.g., "Psychic Chat Subscription")
4. Copy the **Product ID** from the URL or product details
   - Example: `prod_PQRSabcd1234`

**Fields:**
- **Product ID**: The Stripe product ID (required)
- **Amount (cents)**: Price in cents (e.g., 2999 = $29.99)
- **Interval**: Choose `month` or `year`

**Example:**
- Product ID: `prod_PQRSabcd1234`
- Amount: `2999` (for $29.99)
- Interval: `month`

**Result:** Creates a new price in Stripe that you can use for new subscriptions or migrations.

---

### 📧 Section 3: Price Change Workflow

This is the complete process for changing prices for existing subscribers.

#### Step 1: Send Notifications (30-Day Notice)

**Purpose:** Legally required to notify customers 30 days before price change.

**What happens:**
- System sends email to all active subscribers on the old price
- Email includes:
  - Current price
  - New price
  - Effective date (30 days from now)
  - Explanation of the change
- Record is created in `price_change_notifications` table

**Fields:**
- **Interval**: `month` or `year` (which subscribers to notify)
- **Old Price ID**: Current Stripe price ID
- **New Price ID**: New Stripe price ID (created in Section 2)
- **Old Amount**: Current price in cents
- **New Amount**: New price in cents

**Example:**
```
Interval: month
Old Price ID: price_abc123 (currently $9.99/month)
New Price ID: price_def456 (new $14.99/month)
Old Amount: 999
New Amount: 1499
```

**Result:**
- Emails sent to all active monthly subscribers
- They have 30 days before the change takes effect
- Migration status shows "X notified, 0 completed"

---

#### Step 2: Wait 30 Days

**Why:** 
- Legal requirement
- Gives customers time to cancel if they don't accept the new price
- Maintains trust and transparency

**During this time:**
- Customers can continue using the service at old price
- They can cancel subscription if they don't agree
- Migration status shows pending count

---

#### Step 3: Migrate Subscriptions

**Purpose:** Actually change the price for all notified subscribers.

**What happens:**
- System updates each subscription in Stripe to the new price
- Database is updated with new price amount
- Change takes effect at next billing cycle (no immediate charge)
- Current billing date remains unchanged

**Fields:**
- **Old Price ID**: Price to migrate FROM
- **New Price ID**: Price to migrate TO
- **Interval**: `month` or `year`
- **New Amount**: New price in cents

**Confirmation:**
- System will show how many subscriptions will be migrated
- You must confirm before proceeding

**Result:**
- All subscriptions updated to new price
- Customers will be charged new price on their next billing date
- Migration status shows "X completed"

---

## Complete Example Workflow

### Scenario: Increase monthly price from $9.99 to $14.99

1. **Create New Price** (Section 2):
   ```
   Product ID: prod_MyProduct123
   Amount: 1499 (for $14.99)
   Interval: month
   ```
   ✅ Result: New price created with ID `price_new456`

2. **Send Notifications** (Section 3, Step 1):
   ```
   Interval: month
   Old Price ID: price_old123
   New Price ID: price_new456
   Old Amount: 999
   New Amount: 1499
   ```
   ✅ Result: All 50 monthly subscribers notified via email

3. **Wait 30 Days**
   - Monitor for cancellations
   - Customers have time to decide

4. **Migrate Subscriptions** (Section 3, Step 3):
   ```
   Old Price ID: price_old123
   New Price ID: price_new456
   Interval: month
   New Amount: 1499
   ```
   ✅ Confirmation: "Migrate 48 subscriptions?" (2 cancelled)
   ✅ Result: 48 subscriptions now on $14.99/month

---

## Important Notes

### About Stripe Product IDs
- **Product** = What you're selling (e.g., "Psychic Chat Subscription")
- **Price** = How much it costs (e.g., "$9.99/month" or "$99/year")
- One product can have multiple prices
- You need the Product ID to create new prices

### Finding Your Product ID
```
Stripe Dashboard → Products → Click your product → 
URL shows: dashboard.stripe.com/products/prod_ABC123
                                          ↑ This is your Product ID
```

### Best Practices
1. **Always test first** with a test product in Stripe test mode
2. **Create the new price** before sending notifications
3. **Wait the full 30 days** before migrating
4. **Communicate clearly** with customers about why prices are changing
5. **Monitor cancellations** during the 30-day grace period

### Troubleshooting

**"Error fetching prices: undefined"**
- Check that `STRIPE_SECRET_KEY` environment variable is set
- Verify Stripe API key is valid
- Check that you have products/prices created in Stripe

**No subscribers showing**
- Verify users have active subscriptions in database
- Check `subscription_status = 'active'` in `user_personal_info` table
- Ensure `price_interval` is set correctly

**Prices list is empty**
- Create prices in Stripe first, OR
- Use Section 2 to create new prices via the admin UI

---

## Security Notes

- All operations require admin authentication
- User IDs are hashed (SHA-256) in notifications table
- Emails and personal data are encrypted in database
- API calls are logged for audit trail

---

## Support

For technical issues or questions:
1. Check error logs in the API console
2. Verify Stripe webhook configuration
3. Review database for subscription data integrity
4. Contact Stripe support for billing issues
