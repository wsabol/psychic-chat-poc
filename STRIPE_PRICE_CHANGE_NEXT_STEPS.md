# Stripe Price Change Management - Next Steps

## ✅ COMPLETED (Backend Foundation)

### 1. Database Schema
- ✅ Created `api/migrations/add-price-change-notifications.sql`
- ✅ Updated `RESTORE_DATABASE_SCHEMA.sql` 
- ✅ Table: `price_change_notifications` tracks notification history and migration status

**Run this SQL in Heidi before continuing:**
```sql
CREATE TABLE IF NOT EXISTS price_change_notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    old_price_id VARCHAR(100),
    new_price_id VARCHAR(100),
    old_price_amount INTEGER NOT NULL,
    new_price_amount INTEGER NOT NULL,
    price_interval VARCHAR(20) NOT NULL,
    effective_date TIMESTAMP NOT NULL,
    notified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    email_sent BOOLEAN DEFAULT TRUE,
    migration_completed BOOLEAN DEFAULT FALSE,
    migration_completed_at TIMESTAMP NULL,
    CONSTRAINT fk_user_id FOREIGN KEY (user_id) 
        REFERENCES user_personal_info(id) 
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_price_notifications_user_id ON price_change_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_price_notifications_interval ON price_change_notifications(price_interval);
CREATE INDEX IF NOT EXISTS idx_price_notifications_notified_at ON price_change_notifications(notified_at);
CREATE INDEX IF NOT EXISTS idx_price_notifications_effective_date ON price_change_notifications(effective_date);
CREATE INDEX IF NOT EXISTS idx_price_notifications_migration ON price_change_notifications(migration_completed);
```

### 2. Backend Services
- ✅ `api/shared/email/templates/priceChangeEmail.js` - Price change email template
- ✅ `api/services/stripe/priceManagement.js` - Complete price management service
  - createNewPrice()
  - updateSubscriptionPrice() 
  - getSubscribersByInterval()
  - bulkMigrateSubscriptions()
  - getAllActivePrices()
  - getMigrationStatus()
  - getActiveSubscriberCount()
  
- ✅ `api/services/stripe/billingNotifications.js` - Added sendPriceChangeNotifications()
  - **IMPORTANT:** All existing payment failure/cancellation notifications preserved!

### 3. Key Design Decisions
- Uses Stripe's `proration_behavior: 'none'` - no immediate charge
- Changes take effect at next billing cycle
- `billing_cycle_anchor: 'unchanged'` - keeps current billing date
- Properly separates database ID (for FK) from hashed user_id (for logging)
- Email is encrypted, user_id is hashed (one-way)

---

## 🔨 TODO: Complete the Admin Utility

### STEP 1: Create Admin API Route
**File:** `api/routes/admin/price-management.js`

**Endpoints needed:**
1. `GET /admin/price-management/prices` - List active Stripe prices
2. `POST /admin/price-management/prices/create` - Create new price in Stripe
3. `GET /admin/price-management/subscribers/:interval` - Get count of active subscribers by interval
4. `POST /admin/price-management/notify` - Send price change emails
   - Body: `{ interval, oldAmount, newAmount, oldPriceId, newPriceId }`
5. `POST /admin/price-management/migrate` - Migrate subscriptions to new price
   - Body: `{ oldPriceId, newPriceId, interval, newAmount }`
6. `GET /admin/price-management/status/:interval` - Get migration status

**Use these imports:**
```javascript
import { authenticateToken } from '../../middleware/auth.js';
import { isAdmin } from '../../middleware/adminAuth.js';
import {
  createNewPrice,
  getAllActivePrices,
  getActiveSubscriberCount,
  bulkMigrateSubscriptions,
  getMigrationStatus
} from '../../services/stripe/priceManagement.js';
import { sendPriceChangeNotifications } from '../../services/stripe/billingNotifications.js';
```

### STEP 2: Update Admin Route Index
**File:** `api/routes/admin/index.js` (or wherever admin routes are registered)

Add:
```javascript
import priceManagementRoutes from './price-management.js';
router.use('/price-management', priceManagementRoutes);
```

### STEP 3: Create Frontend Component
**File:** `client/src/components/admin/PriceManagementTab.jsx`

**UI Requirements:**
1. **Section 1: Active Prices Display**
   - Table showing all active Stripe prices
   - Columns: Product Name, Amount, Interval, Price ID

2. **Section 2: Create New Price**
   - Form with: Product dropdown, Amount input, Interval dropdown (month/year)
   - Button: "Create New Price"

3. **Section 3: Subscriber Count**
   - Display count of active monthly subscribers
   - Display count of active annual subscribers

4. **Section 4: Send Notifications**
   - Interval selector (month/year)
   - Old price input (in cents)
   - New price input (in cents)
   - Old Price ID input
   - New Price ID input
   - Button: "Send Price Change Notifications"
   - Shows result: "Sent to X subscribers, Y failed"

5. **Section 5: Migrate Subscriptions**
   - Interval selector (month/year)
   - Old Price ID input
   - New Price ID input
   - New Amount input (in cents)
   - Button: "Migrate All Subscriptions"
   - Confirmation dialog: "This will update X subscriptions. Continue?"
   - Shows result: "Migrated X subscriptions, Y failed"

6. **Section 6: Migration Status**
   - Shows total notified, completed, pending by interval

### STEP 4: Create React Hook
**File:** `client/src/components/admin/hooks/usePriceManagement.js`

**Functions needed:**
- `useGetPrices()` - Fetch active prices
- `useCreatePrice()` - Create new price
- `useGetSubscriberCount()` - Get subscriber counts
- `useSendNotifications()` - Send price change emails
- `useMigrateSubscriptions()` - Migrate subscriptions
- `useGetMigrationStatus()` - Get migration status

**Pattern to follow:** Look at `client/src/components/admin/hooks/useWhitelist.js` for reference

### STEP 5: Add Tab to Admin Dashboard
**File:** `client/src/components/admin/ComplianceDashboard.jsx` (or main admin component)

Add new tab:
```jsx
<Tab label="Price Management" />
<TabPanel value={tabValue} index={X}>
  <PriceManagementTab />
</TabPanel>
```

### STEP 6: Export Email Template
**File:** `api/shared/email/index.js`

Add:
```javascript
export { generatePriceChangeEmail } from './templates/priceChangeEmail.js';
```

---

## 📋 Testing Checklist

After implementation, test:
1. ✅ Create new price in Stripe via admin UI
2. ✅ View subscriber counts
3. ✅ Send test notification to yourself (filter to test account)
4. ✅ Check email received with correct formatting
5. ✅ Verify notification recorded in `price_change_notifications` table
6. ✅ Migrate test subscription
7. ✅ Verify subscription updated in Stripe (check proration_behavior)
8. ✅ Verify database updated with new price_amount
9. ✅ Verify migration_completed flag set to true
10. ✅ Check migration status endpoint

---

## 🔐 Security Reminders

- All admin routes must use `authenticateToken` AND `isAdmin` middleware
- Never expose encryption keys or raw user data
- user_id in database = hashed (SHA-256)
- email, phone = encrypted with pgcrypto
- Foreign key in price_change_notifications uses database `id`, not hashed user_id

---

## 🎯 Workflow Example

**Admin wants to raise monthly price from $9.99 to $12.99:**

1. Create new price in Stripe: $12.99/month → get new price ID
2. Count monthly subscribers to see how many will be affected
3. Send notifications: 30 days before planned migration
   - Subscribers receive email showing old vs new price
   - Email shows their next billing date as effective date
4. Wait 30 days (give users time to cancel if they want)
5. Migrate subscriptions: All active monthly subscribers move to new price
   - No immediate charge (proration_behavior: 'none')
   - Changes take effect on their next billing date
6. Monitor migration status to confirm all updated

---

## 📝 Next Chat Instructions

**Say:** "Continue implementing the Stripe price change admin utility. Build the admin API route (api/routes/admin/price-management.js), frontend component (PriceManagementTab.jsx), React hook (usePriceManagement.js), integrate into admin dashboard, and export the email template."

**Reference files:**
- Backend services are ready: `api/services/stripe/priceManagement.js` and `billingNotifications.js`
- Email template ready: `api/shared/email/templates/priceChangeEmail.js`
- Database table created (run SQL in Heidi first)
- Follow patterns from existing admin features like whitelist management
