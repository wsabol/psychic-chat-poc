# Automated Price Change Workflow - Complete Guide

## 🎯 Overview

This system provides a **fully automated** price change workflow that handles:
- ✅ Batch notifications to all subscribers (monthly + annual)
- ✅ 30-day advance notice period
- ✅ Automatic subscription migration after notice period
- ✅ No manual intervention required

---

## 🚀 How It Works

### 1. **Admin Schedules Price Change**
- Admin logs into admin panel → Price Management tab
- Selects old and new prices from dropdowns for monthly and/or annual plans
- Clicks "Schedule Price Change (30-day notice)"

### 2. **System Sends Notifications** (Immediate)
- System sends email notifications to ALL affected subscribers
- Each subscriber receives a personalized email with:
  - Current price
  - New price
  - Effective date (30 days from now)
  - Their specific billing interval (monthly/annual)
- Notification records created in `price_change_notifications` table

### 3. **Automated Migration Job** (30 Days Later)
- Daily job runs at 4:00 AM UTC
- Checks for notifications where `effective_date <= NOW()`
- Automatically migrates subscriptions to new prices in Stripe
- Updates database records
- Marks migrations as completed

---

## 📋 Admin Interface

### Section 1: Active Stripe Prices
- Shows all active prices with subscriber counts
- Monthly and annual prices displayed separately
- Collapsible detailed table with all price information

### Section 2: Schedule Price Change (Main Action)
**Monthly Price Change:**
- Dropdown: Select current monthly price
- Dropdown: Select new monthly price
- Preview shows affected subscribers and price change

**Annual Price Change:**
- Dropdown: Select current annual price
- Dropdown: Select new annual price
- Preview shows affected subscribers and price change

**Single Button:** "Schedule Price Change (30-Day Notice)"
- Handles both monthly AND annual in one operation
- Sends all notifications immediately
- Schedules automatic migration

### Section 3: Scheduled Migrations Status
- Shows pending and completed migrations
- Tracks monthly and annual separately
- Displays total notified, completed, and pending counts

---

## 🔧 Technical Implementation

### Backend Components

#### 1. **Scheduled Job** (`api/jobs/priceChangeMigrationJob.js`)
```javascript
// Runs daily at 4:00 AM UTC
- Queries price_change_notifications table
- Finds records where effective_date <= NOW()
- Migrates subscriptions via Stripe API
- Updates database records
- Logs success/failure for each migration
```

#### 2. **Notification Service** (`api/services/stripe/billingNotifications.js`)
```javascript
schedulePriceChange(monthly, annual)
- Sends notifications for both intervals in one batch
- Sets effective_date = NOW() + 30 days
- Creates price_change_notifications records
- Returns combined results
```

#### 3. **API Endpoint** (`api/routes/admin/price-management.js`)
```javascript
POST /admin/price-management/schedule-price-change
Body: {
  monthly: { oldPriceId, newPriceId, oldAmount, newAmount },
  annual: { oldPriceId, newPriceId, oldAmount, newAmount }
}
```

#### 4. **Database Table** (`price_change_notifications`)
```sql
- user_id_hash: Hashed user identifier (SHA-256)
- old_price_id: Stripe price ID before change
- new_price_id: Stripe price ID after change
- old_price_amount: Previous amount in cents
- new_price_amount: New amount in cents
- price_interval: 'month' or 'year'
- effective_date: When migration occurs (NOW + 30 days)
- notified_at: When email was sent
- migration_completed: Boolean flag
- migration_completed_at: Timestamp of migration
```

### Frontend Components

#### 1. **UI Component** (`client/src/components/admin/PriceManagementTab.jsx`)
- Dropdown selectors for old/new prices
- Single-click scheduling for both intervals
- Live preview of changes
- Status tracking display

#### 2. **Data Hook** (`client/src/components/admin/hooks/usePriceManagement.js`)
- Manages component state
- Validates user input
- Calls API methods
- Handles success/error messages

#### 3. **API Hook** (`client/src/components/admin/hooks/usePriceManagementApi.js`)
- Abstracts API calls
- Handles authentication
- Error handling

---

## 📊 Database Schema

### price_change_notifications Table
```sql
CREATE TABLE price_change_notifications (
    id SERIAL PRIMARY KEY,
    user_id_hash VARCHAR(64) NOT NULL,  -- SHA-256 hash
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
    CONSTRAINT fk_user_id_hash FOREIGN KEY (user_id_hash) 
        REFERENCES user_personal_info(user_id) 
        ON DELETE CASCADE
);
```

---

## 🔐 Security & Privacy

### Data Protection
- ✅ User IDs stored as SHA-256 hashes
- ✅ Foreign key constraints maintain data integrity
- ✅ Cascade deletes prevent orphaned records
- ✅ Admin authentication required for all operations

### Error Handling
- ✅ Stripe API failures logged and tracked
- ✅ Failed migrations don't block other users
- ✅ Detailed error logs for troubleshooting
- ✅ Migration retry logic (manual intervention if needed)

---

## 📧 Email Notifications

### Template Location
`api/shared/email/templates/priceChangeEmail.js`

### Email Content Includes
- Current subscription price
- New subscription price
- Effective date (30 days from notification)
- Billing interval (monthly/annual)
- FAQ or support contact info

### Delivery
- Sent via SendGrid
- One email per subscriber
- Personalized with their specific details
- Logged in database for tracking

---

## 🔄 Migration Process

### Daily Job Execution
1. **Query Database** - Find notifications ready for migration
2. **Iterate Subscribers** - Process each subscription individually
3. **Update Stripe** - Modify subscription price via API
4. **Update Database** - Mark migration as completed
5. **Log Results** - Track success/failure rates

### Stripe API Call
```javascript
stripe.subscriptions.update(subscriptionId, {
  items: [{
    id: subscription.items.data[0].id,
    price: newPriceId,
  }],
  proration_behavior: 'none'  // No proration - next billing cycle
});
```

---

## 🎯 Usage Example

### Scenario: Raising Monthly Price from $9.99 to $12.99

**Step 1:** Admin accesses Price Management tab

**Step 2:** In "Monthly Subscription" section:
- Selects "Old Price: $9.99 - price_abc123"
- Selects "New Price: $12.99 - price_xyz789"

**Step 3:** Confirms action
- Preview shows: "2 subscribers will be notified..."
- Clicks "Schedule Price Change"

**Step 4:** System processes immediately:
- Sends 2 emails to monthly subscribers
- Creates 2 records in price_change_notifications
- Sets effective_date = 30 days from now

**Step 5:** 30 days later (automatic):
- Daily job runs at 4:00 AM UTC
- Finds 2 ready notifications
- Migrates both subscriptions in Stripe
- Updates database: migration_completed = true

**Result:** ✅ Complete automation, zero manual work after initial scheduling

---

## 📈 Monitoring & Status

### Real-Time Tracking
- **Total Notified**: Count of emails sent
- **Completed**: Migrations that succeeded
- **Pending**: Migrations scheduled but not yet executed
- **Failed**: Migrations that encountered errors (logged)

### Admin Dashboard
- View current status for monthly migrations
- View current status for annual migrations
- Refresh data in real-time
- Clear success/error messages

---

## ⚠️ Important Notes

### Before Using
1. ✅ Ensure Stripe API keys are configured
2. ✅ Verify email service (SendGrid) is operational
3. ✅ Test with a small user group first
4. ✅ Database migration must be run (fix-price-change-notifications-table.sql)

### Best Practices
- 📅 Schedule price changes during low-traffic periods
- 📧 Monitor email delivery rates after scheduling
- 🔍 Check migration status daily during notice period
- 💾 Backup database before major price changes
- 📊 Review subscriber counts before confirming changes

### Limitations
- Cannot cancel scheduled migrations (would need manual intervention)
- 30-day notice period is fixed (not configurable via UI)
- Requires subscribers to have valid email addresses
- Stripe API rate limits apply to migrations

---

## 🛠️ Troubleshooting

### Notifications Not Sending
- Check SendGrid API key in environment variables
- Verify email_encrypted field exists for subscribers
- Check error logs: `api/logs/`

### Migrations Not Running
- Verify scheduler is running: Check `api/jobs/scheduler.js`
- Check cron job schedule: 4:00 AM UTC daily
- Review error logs for Stripe API issues
- Verify STRIPE_SECRET_KEY environment variable

### Database Errors
- Run fix-price-change-notifications-table.sql migration
- Check foreign key constraints
- Verify user_id_hash references user_personal_info(user_id)

---

## 🔮 Future Enhancements

### Potential Improvements
- [ ] Configurable notice period (7, 14, 30 days)
- [ ] Manual migration cancellation feature
- [ ] Email preview before sending
- [ ] Bulk price change history view
- [ ] Export notification/migration reports
- [ ] SMS notifications in addition to email
- [ ] Webhook notifications for external systems

---

## 📞 Support

For issues or questions:
1. Check application logs: `api/logs/`
2. Review error messages in admin panel
3. Consult Stripe dashboard for subscription status
4. Check database records in price_change_notifications table

---

## ✅ Summary

This automated system transforms a complex, multi-step manual process into a **single-click operation** with:
- ✅ Immediate batch notifications
- ✅ Automatic 30-day migration
- ✅ Complete audit trail
- ✅ Zero ongoing maintenance

**One click schedules the entire workflow - the system handles the rest!**
