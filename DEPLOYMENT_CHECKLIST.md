# Deployment Checklist - Onboarding Flow Restoration

## Pre-Deployment

- [ ] Review all changes in ONBOARDING_FIXES_SUMMARY.md
- [ ] Ensure `.env` files have correct API_URL set
- [ ] Backup current database
- [ ] Backup current Firebase config

## Build & Test

### Client Build
```bash
cd client
npm install
npm run build
```

### Worker Build  
```bash
cd worker
npm install
npm start
```

### API Server
```bash
cd api
npm install
npm start
```

## Runtime Verification

### 1. Check Worker Cleanup Job
Look for in server logs:
```
[CLEANUP] Scheduling cleanup job to run every 24 hours
[CLEANUP] Running cleanup job for old temporary accounts...
[CLEANUP] ✓ Cleanup complete
```

### 2. Test Free Trial Flow
1. Go to landing page
2. Click "Try it for free"
3. Verify temp account created (check Firebase console)
4. Ask oracle a question
5. Verify input is grayed out immediately
6. Verify message displays for 4 seconds: "Thank you for trying Starship Psychics. Please create your account."
7. Verify timer counts down for 60 seconds
8. Verify AstrologyPromptModal appears after 60 seconds

### 3. Test "No" Flow (Exit to Landing)
1. On AstrologyPromptModal, click "No"
2. Verify temp account deleted from Firebase (check console logs)
3. Verify routed to landing page
4. Verify can start new trial

### 4. Test Account Creation Flow  
1. Click "Try it for free"
2. Ask oracle question
3. After 60 seconds, click "Yes" on AstrologyPromptModal
4. Enter birth date and save
5. Verify horoscope displays
6. Close horoscope
7. On OnboardingModal, click "Set Up an Account"
8. Create account with email
9. Check backend logs for migration:
   ```
   [AUTH-MIGRATION] User upgrading from temp account
   [AUTH-MIGRATION] ✓ Register-and-migrate successful
   ```
10. Verify migrated to email verification screen
11. Verify new account has chat history from temp account
12. Verify horoscope data preserved

### 5. Test "Exit" Flow (From OnboardingModal)
1. Complete trial and see OnboardingModal
2. Click "Exit"
3. Verify temp account deleted
4. Verify shown ThankYouScreen
5. Verify can click "Create Account Now"

## Monitoring

### Logs to Watch (Development)
```
[CLEANUP] - Cleanup job messages
[ONBOARDING] - User trial flow
[AUTH-MIGRATION] - Account upgrade process
[MIGRATION] - Data migration completion
```

### Logs to Watch (Production)
- Error rates in cleanup job
- Migration success/failure rates
- Orphaned temp account counts (should decrease over time)

## Rollback Plan

If issues occur:

1. **Chat input not disabled:**
   - Check ChatScreen.js line: `disabled={auth.isTemporaryAccount && firstResponseReceived}`

2. **Message not showing:**
   - Check `showInputDisabledMessage` state and timeout

3. **Exit flows broken:**
   - Check useAuthHandlers.js `handleAstrologyPromptNo` function

4. **Migration failing:**
   - Check Login.jsx for migration endpoint
   - Check API backend logs for database errors
   - Verify sessionStorage is preserving onboarding data

5. **Cleanup not running:**
   - Check worker/processor.js setInterval setup
   - Check API cleanup endpoint responds with 200
   - Verify fetch in worker can reach API

## Post-Deployment

- [ ] Monitor user conversion rates
- [ ] Check cleanup job ran successfully (first run within 5 seconds of startup)
- [ ] Verify account migration success rate
- [ ] Monitor error logs for 24 hours
- [ ] Verify temp accounts being cleaned up after 7+ days

## Performance Monitoring

### Metrics to Track
- Number of temp accounts created per day
- Temp → Real account conversion rate
- Account creation success rate
- Cleanup job execution time
- Database cleanup success rate

### Expected Values
- **Cleanup Job:** Runs once on startup, then every 24 hours
- **Deleted Accounts:** Temp accounts older than 7 days
- **Migration Success:** Should be >99% (failures log but don't block signup)

## Support Notes

### User Issues
- **"Input won't let me type"** → Normal, showing 4-second kindness message
- **"Sent too many messages"** → Input disabled after first response (feature)
- **"Lost my trial chat history"** → Preserved during account creation
- **"Horoscope data missing"** → Migrated with account creation

### Admin Notes
- Periodic cleanup is fully automated (no admin action needed)
- Cleanup runs silently in background (no user notifications)
- Old temp accounts don't block new signups
- Migration fully transparent to user

---

## Final Verification Commands

### Check Syntax
```bash
node -c client/src/screens/ChatScreen.js
node -c client/src/hooks/useAuthHandlers.js  
node -c worker/processor.js
```

### Check File Sizes (should be reasonable)
```bash
ls -lh client/src/screens/ChatScreen.js
ls -lh client/src/hooks/useAuthHandlers.js
ls -lh worker/processor.js
```

### Verify Git Changes
```bash
git status
git diff client/src/screens/ChatScreen.js
git diff client/src/hooks/useAuthHandlers.js
git diff worker/processor.js
```

---

**Status: Ready for Deployment** ✅
