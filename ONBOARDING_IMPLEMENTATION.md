# Onboarding System Implementation Guide

## Overview
This document describes the new 5-step onboarding system implemented for new users after email verification. The system guides users through required and optional steps using a draggable, minimizable modal.

---

## Architecture

### Database Changes
**Migrations Created:**
- `031_add_onboarding_tracking.sql` - Adds onboarding tracking columns
- `032_encrypt_audit_log_sensitive_data.sql` - Encrypts sensitive data in audit logs

**New Columns in `user_personal_info`:**
```sql
- onboarding_step VARCHAR(50) -- Current step
- onboarding_completed BOOLEAN -- Has onboarding finished
- onboarding_started_at TIMESTAMP -- When started
- onboarding_completed_at TIMESTAMP -- When completed
```

---

### API Endpoints

#### 1. GET `/billing/onboarding-status`
**Purpose:** Fetch user's onboarding progress
**Returns:**
```json
{
  "currentStep": "create_account",
  "isOnboarding": true,
  "completedSteps": {
    "create_account": true,
    "payment_method": false,
    "subscription": false,
    "personal_info": false,
    "security_settings": false
  },
  "subscriptionStatus": null
}
```

#### 2. POST `/billing/onboarding-step/:step`
**Purpose:** Mark a step as complete
**Parameters:**
- `step` (path) - One of: `create_account`, `payment_method`, `subscription`, `personal_info`, `security_settings`

**Returns:**
```json
{
  "success": true,
  "step": "payment_method",
  "completed": false,
  "message": "Step payment_method completed"
}
```

---

## Frontend Components

### OnboardingModal Component
**File:** `client/src/components/OnboardingModal.js`

**Props:**
```javascript
{
  currentStep: string,           // Current step ID
  completedSteps: object,        // { step: boolean }
  onNavigateToStep: function,    // (stepId) => void
  onClose: function,             // () => void
  isMinimized: boolean,          // Whether minimized
  onToggleMinimize: function,    // (bool) => void
  isDragging: boolean,           // Currently dragging
  position: { x, y },            // Modal position
  onStartDrag: function,         // (e) => void
}
```

**Features:**
- ✅ Draggable header
- ✅ Minimize/maximize
- ✅ Close button (only after required steps)
- ✅ Step buttons with disabled state
- ✅ Visual progress indication
- ✅ Responsive design

**CSS File:** `client/src/components/OnboardingModal.css`
- Comprehensive styling
- Dark mode friendly
- Mobile responsive

---

### useOnboarding Hook
**File:** `client/src/hooks/useOnboarding.js`

**Returns:**
```javascript
{
  // State
  onboardingStatus,          // Current status object
  loading,                   // Whether loading
  error,                     // Error message
  position,                  // Modal position { x, y }
  isMinimized,              // Is minimized
  isDragging,               // Is being dragged

  // Methods
  fetchOnboardingStatus,    // () => Promise
  updateOnboardingStep,     // (step) => Promise
  setIsMinimized,           // (bool) => void
  handleStartDrag,          // (e) => void
}
```

**Usage Example:**
```javascript
const onboarding = useOnboarding(token);

// Update a step
await onboarding.updateOnboardingStep('payment_method');

// Check status
if (onboarding.onboardingStatus?.isOnboarding) {
  // User is in onboarding
}
```

---

## 5-Step Flow

### Step 1: Create Account ✅
- **Status:** Always complete
- **Triggered:** When user registers
- **Action:** None - automatic

### Step 2: Payment Method 🎯 (REQUIRED)
- **Status:** Complete when user adds valid payment method
- **Triggered:** After email verification
- **Page:** Billing → Payment Methods tab
- **Navigation:** OnboardingModal button
- **Update:** Automatic when payment method is attached and set as default

### Step 3: Subscription 🎯 (REQUIRED)
- **Status:** Complete when user purchases subscription
- **Triggered:** After payment method added
- **Page:** Billing → Subscriptions tab
- **Navigation:** OnboardingModal button (enabled after step 2)
- **Update:** Automatic on successful subscription purchase

### Step 4: Get Acquainted 🌟 (OPTIONAL)
- **Status:** Complete when user saves personal information
- **Triggered:** After subscription purchased
- **Page:** Personal Information
- **Navigation:** OnboardingModal button
- **Update:** Called in PersonalInfoPage on form submit

### Step 5: Check Security Settings 🔒 (OPTIONAL)
- **Status:** Complete when user reviews security
- **Triggered:** After subscription purchased
- **Page:** Security Settings
- **Navigation:** OnboardingModal button
- **Close:** Modal closes and user goes to chat

---

## Integration Points

### 1. App.jsx
**Changes Made:**
- Import `OnboardingModal` component
- Import `useOnboarding` hook
- Initialize `const onboarding = useOnboarding(authState.token)`
- Auto-navigate to payment methods after email verification
- Update subscription status when subscription purchased
- Pass onboarding to MainContainer
- Conditionally render OnboardingModal in chat screen
- Render blocking modals with `isOnboarding` prop

**Key Logic:**
```javascript
// Auto-navigate new users to payment methods
useEffect(() => {
  if (authState.emailVerified && !authState.isTemporaryAccount && 
      onboarding.onboardingStatus?.isOnboarding) {
    setStartingPage(7); // Billing page
  }
}, [authState.emailVerified, onboarding.onboardingStatus?.isOnboarding]);

// Update when subscription purchased
useEffect(() => {
  if (authState.hasActiveSubscription && skipSubscriptionCheck) {
    await onboarding.updateOnboardingStep('subscription');
    setStartingPage(0); // Go to chat
  }
}, [authState.hasActiveSubscription]);
```

### 2. PaymentMethodRequiredModal & SubscriptionRequiredModal
**Changes Made:**
- Added `isOnboarding` prop (default: false)
- Return `null` if `isOnboarding === true`
- Prevents showing blocking modals during onboarding

**Updated Signature:**
```javascript
export default function PaymentMethodRequiredModal({ 
  onNavigateToBilling, 
  isOnboarding = false 
}) {
  if (isOnboarding) return null;
  // ... rest of component
}
```

### 3. PaymentMethodPage
**Changes Made:**
- Added `onboarding` prop
- Update onboarding status when payment method successfully added
- Called after `billing.setDefaultPaymentMethod()`

**Code:**
```javascript
if (onboarding?.updateOnboardingStep) {
  try {
    await onboarding.updateOnboardingStep('payment_method');
  } catch (err) {
    console.warn('[ONBOARDING] Failed to update:', err);
  }
}
```

### 4. PersonalInfoPage
**Changes Made:**
- Added `onboarding` prop
- Update onboarding status when personal info saved
- Called after successful form submission

**Code:**
```javascript
if (onboarding?.updateOnboardingStep) {
  try {
    await onboarding.updateOnboardingStep('personal_info');
  } catch (err) {
    console.warn('[ONBOARDING] Failed to update:', err);
  }
}
```

### 5. MainContainer
**Needs Update:**
- Pass `onboarding` prop down to pages
- Example: `<PaymentMethodPage onboarding={onboarding} />`

---

## User Experience Flow

### New User (After Email Verification)
1. **Email Verified** → Auto-navigate to Payment Methods tab
2. **Billing Page Opens** → OnboardingModal appears (draggable, minimizable)
3. **Modal Shows Progress:**
   - Step 1: ✅ Create Account (done)
   - Step 2: 💳 Payment Method (NEXT - button active)
   - Step 3: 🎯 Subscription (button disabled - "Complete Payment Method first")
   - Step 4: 🌟 Get Acquainted (button disabled - "Complete subscription first")
   - Step 5: 🔒 Security Settings (button disabled - "Complete subscription first")

4. **User Clicks "Payment Method"** → Stays on Payment Methods page
5. **User Adds Card** → 
   - API automatically updates: `onboarding_step = 'payment_method'`
   - Modal refreshes - Step 2 now shows ✅ complete
   - Step 3 button becomes active
6. **User Clicks "Subscription"** → Navigate to Subscriptions tab
7. **User Purchases Plan** → 
   - API automatically updates: `onboarding_step = 'subscription'`
   - Modal shows required steps complete ✅
   - Step 4 & 5 buttons now active
   - Close button appears on modal
8. **Optional:** User can now click "Get Acquainted" or "Security Settings"
9. **Final Step:** User clicks close → `onboarding_completed = true` → Go to Chat page

### Established User (Returning, No Onboarding)
- `onboarding_completed = true` in database (set by migration)
- OnboardingModal never appears
- Blocking modals show normally if missing payment method/subscription

---

## Database Data

### For New Users (After Registration)
```sql
INSERT INTO user_personal_info (
  user_id, email_encrypted, ...,
  onboarding_step = 'create_account',
  onboarding_completed = FALSE,
  onboarding_started_at = NOW()
) VALUES (...)
```

### Progress Updates
```sql
UPDATE user_personal_info SET 
  onboarding_step = 'payment_method'
  -- onboarding_completed stays FALSE until security_settings
WHERE user_id = $1;

-- Final Update (when security_settings is marked complete)
UPDATE user_personal_info SET 
  onboarding_step = 'security_settings',
  onboarding_completed = TRUE,
  onboarding_completed_at = NOW()
WHERE user_id = $1;
```

---

## API Call Flow

### Initial Status Check
```
Client → GET /billing/onboarding-status
API → Returns current progress
Client → Renders OnboardingModal with status
```

### Payment Method Added
```
User adds card on PaymentMethodPage
→ billing.attachPaymentMethod()
→ billing.setDefaultPaymentMethod()
→ onboarding.updateOnboardingStep('payment_method')
  → POST /billing/onboarding-step/payment_method
  → API updates database
  → Returns { success: true }
→ onboarding.fetchOnboardingStatus()
  → GET /billing/onboarding-status
  → Client state refreshes
  → Modal updates with new status
```

### Subscription Purchased
```
User buys plan
→ Stripe webhook fires (invoice.payment_succeeded)
→ Database subscription_status updated to 'active'
→ Client detects authState.hasActiveSubscription changed
→ onboarding.updateOnboardingStep('subscription') called
  → POST /billing/onboarding-step/subscription
  → Database updated
→ App.jsx useEffect triggers
→ User auto-navigated to Chat page
→ onboarding modal can now be closed
```

---

## Security Considerations

### Sensitive Data Encryption
- Email addresses encrypted in `audit_log` table
- Sensitive context data encrypted before storage
- Decryption only happens on-demand with proper authorization

### Authentication
- All endpoints require `authenticateToken` middleware
- User can only update their own onboarding status
- No data leakage between users

### Error Handling
- Failed onboarding updates don't block user actions
- Errors logged but don't break flow
- User continues with experience even if onboarding update fails

---

## Testing Checklist

### Backend
- [ ] Migrations run successfully
- [ ] New columns exist in database
- [ ] GET `/billing/onboarding-status` returns correct data
- [ ] POST `/billing/onboarding-step/:step` updates database
- [ ] Existing users have `onboarding_completed = TRUE`
- [ ] New users have `onboarding_step = 'create_account'`

### Frontend Component
- [ ] OnboardingModal renders with correct steps
- [ ] Buttons disabled/enabled correctly
- [ ] Modal is draggable
- [ ] Modal minimizes and expands
- [ ] Close button only appears when required steps complete
- [ ] Modal responsive on mobile

### Hook
- [ ] useOnboarding fetches status on mount
- [ ] updateOnboardingStep calls API and refreshes
- [ ] Position state updates on drag
- [ ] isDragging state toggles correctly

### Integration
- [ ] New user navigated to payment methods after email verification
- [ ] OnboardingModal appears in chat screen for new users
- [ ] OnboardingModal hidden for established users
- [ ] Blocking modals hidden during onboarding
- [ ] Payment method update triggers onboarding step update
- [ ] Subscription purchase triggers navigation to chat
- [ ] Personal info save updates onboarding
- [ ] Modal closes and user goes to chat after final step

### User Flow
- [ ] New user sees onboarding guide (not blocking modals)
- [ ] Modal buttons navigate to correct pages
- [ ] Steps complete as expected
- [ ] User can minimize/drag modal during process
- [ ] Final close takes user to chat
- [ ] Returning user on new login requires subscription (normal behavior)

---

## Files Modified/Created

### Created
- `api/migrations/031_add_onboarding_tracking.sql`
- `api/migrations/032_encrypt_audit_log_sensitive_data.sql`
- `api/routes/billing/onboarding.js`
- `client/src/components/OnboardingModal.js`
- `client/src/components/OnboardingModal.css`
- `client/src/hooks/useOnboarding.js`

### Modified
- `api/routes/auth-endpoints/helpers/userCreation.js` - Add onboarding fields on user creation
- `api/routes/billing/index.js` - Register onboarding router
- `client/src/App.jsx` - Integrate onboarding flow
- `client/src/components/PaymentMethodRequiredModal.js` - Hide during onboarding
- `client/src/components/SubscriptionRequiredModal.js` - Hide during onboarding
- `client/src/pages/payment-methods/PaymentMethodPage.js` - Update on payment method add
- `client/src/pages/PersonalInfoPage.js` - Update on form submit

### Needs Update
- `client/src/layouts/MainContainer.js` - Pass onboarding prop to pages
- Any other pages that need to be aware of onboarding state

---

## Deployment Notes

### Database Migrations
Run migrations in order:
```bash
# Apply migration 031
psql -U postgres -d psychic_chat < api/migrations/031_add_onboarding_tracking.sql

# Apply migration 032
psql -U postgres -d psychic_chat < api/migrations/032_encrypt_audit_log_sensitive_data.sql
```

### Docker Rebuild
If using Docker, rebuild to include new code:
```bash
docker-compose down  # WITHOUT -v flag
docker image rm -f psychic-chat-api
docker-compose build --no-cache
docker-compose up -d
```

### Verification
1. Check database columns exist
2. Test new user registration flow
3. Test returning user login (should require subscription)
4. Test onboarding modal appearance and functionality

---

## Troubleshooting

### OnboardingModal Not Appearing
- Check `onboarding.onboardingStatus?.isOnboarding` in browser console
- Verify migrations ran successfully
- Check that new user has `onboarding_step = 'create_account'` in database

### Payment Method Update Not Working
- Check PaymentMethodPage receives `onboarding` prop from MainContainer
- Verify API endpoint POST `/billing/onboarding-step/payment_method` is accessible
- Check browser console for fetch errors

### Modal Not Dragging
- Verify `onStartDrag` callback is connected
- Check CSS cursor is set correctly
- Ensure no parent element prevents mouse events

### Auto-Navigation Not Happening
- Check `authState.emailVerified` is true
- Verify `onboarding.onboardingStatus?.isOnboarding` is true
- Ensure useEffect dependencies are correct

---

## Future Enhancements

1. **Progress Bar** - Show overall onboarding progress percentage
2. **Skip Option** - Allow users to skip optional steps (with warning)
3. **Help Tooltips** - Show contextual help for each step
4. **Analytics** - Track which steps users complete/skip
5. **Reminders** - Email reminders if onboarding incomplete after X days
6. **Mobile Optimization** - Full-screen modal option on mobile
7. **Undo** - Allow going back to previous steps
8. **Custom Branding** - Theme modal with brand colors

---

## Questions?

Refer back to this document or check the individual component files for detailed comments.
