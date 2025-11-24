# Visual Diagnosis: Where is Your 403 Error Coming From?

## 🎯 Follow This Decision Tree

```
START: You got a 403 error
  │
  ├─► STEP 1: Check Network Tab Response
  │     F12 → Network → Find /chat/history request → Response tab
  │
  ├─────────────────────────────────────────────────────┐
  │                                                     │
  ▼                                                     ▼
ERROR A:                                    ERROR B:
"Invalid or expired token"                  "Unauthorized: You can 
                                            only access your own data"
  │                                             │
  ├─► How long since login?                   ├─► Check User ID Mismatch
  │   ✅ < 15 min → Token should be valid        │
  │       → Try hard refresh (Ctrl+Shift+R)     │
  │                                             │
  │   ❌ > 15 min → Token EXPIRED              │
  │       → Log in again                        │
  │                                             │
  │   ❌ Don't know → Check:                    │
  │       console.log(localStorage.token)      │
  │       Should show a long string            │
  │                                             │
  ├─► Still getting error?                     │
      → Clear storage:                         │
        localStorage.clear()                  │
      → Reload & log in                       │
      → See "Permanent Fix #1" in              │
        TROUBLESHOOTING_403_GUIDE.md           │
      
  └─► Need auto-refresh?                      
      → See "Permanent Fix #1" in 
        TROUBLESHOOTING_403_GUIDE.md
      → 5-minute implementation


        │
        ├─► Token has: userId1
        │   URL requests: /chat/history/userId2
        │   Problem: They don't match!
        │
        └─► Solution:
            1. Check localStorage.userId
            2. Check URL being requested
            3. Make sure they're the same
            4. This usually means a bug
```

---

## 📊 Error Type Matrix

```
                    TOKEN ISSUE    USER ID ISSUE    2FA ISSUE
Error Code          403            403              403
Error Message       "Invalid or    "Unauthorized"   "2FA required"
                    expired token"

Most Common         ✅✅✅          ❌               ❌
When?               After 15 min    Wrong URL        Never (disabled)

How to Fix          Log in         Check URL        Log in
                    again          and token        again

Prevention          Auto-refresh   Fix bug in       Re-enable
                    token          app code         2FA properly

Related Files       auth.js:43     auth.js:51       auth.js:59
```

---

## 🔍 Detailed Diagnosis Flowchart

```
┌─────────────────────────────────────────────────────────┐
│ You see: Error loading messages (HTTP 403)             │
└────────────────┬──────────────────────────────────────┘
                 │
                 ▼
        ┌───────────────────┐
        │ Step 1: Check if  │
        │ API is running    │
        │ (localhost:3000)  │
        └────────┬──────────┘
                 │
         ┌───────┴────────┐
         │                │
         ▼                ▼
      ✅ YES            ❌ NO
         │                │
         │                ▼
         │           Start API first:
         │           npm run dev (in /api)
         │           Then reload browser
         │
         ▼
    ┌──────────────────┐
    │ Step 2: Are you  │
    │ logged in?       │
    └────────┬─────────┘
             │
      ┌──────┴──────┐
      │             │
      ▼             ▼
    ✅ YES        ❌ NO
      │             │
      │             ▼
      │         Go log in first
      │         Then check if 403
      │         still happens
      │
      ▼
   ┌──────────────────────┐
   │ Step 3: Check error  │
   │ in Network response  │
   │ (F12 → Network)      │
   └────────┬─────────────┘
            │
     ┌──────┴──────────────┬────────────────┐
     │                     │                │
     ▼                     ▼                ▼
  Error A:             Error B:            Error C:
  "Invalid or          "Unauthorized"      "2FA required"
  expired token"       (wrong user)        
     │                     │                │
     ▼                     ▼                ▼
  FIX #1:              FIX #2:             FIX #3:
  • Log in             • Check URL         • 2FA disabled
    again                userId            • Log in again
  • Get new            • Check token
    token (15          userId
    min fresh)         • Make sure
  • Hard               same
    refresh            • Fix bug
```

---

## 🧪 Test Each Scenario

### Scenario 1: Token Expired
```
Timeline:
15:00 - Log in                                     ✅
15:07 - Load chat                                  ✅
15:14 - Load chat                                  ✅
15:16 - Load chat                            ❌ 403 (15 min elapsed)

How to verify:
□ Check login time
□ Calculate elapsed time
□ If > 15 minutes, that's the problem!

Fix:
□ Log in again
□ Get fresh token
□ Chat loads                                       ✅
```

### Scenario 2: Token Missing
```
Check:
□ localStorage.getItem('token') returns null
□ OR token is empty string

Why:
- Login didn't complete
- Browser cache cleared
- Token never stored

Fix:
□ Log in again
□ Make sure login completes
□ Token should now exist

Verify:
□ localStorage.getItem('token') ✅ returns long string
□ Chat loads ✅
```

### Scenario 3: User ID Mismatch
```
Example:
Token contains userId:    550e8400-e29b-41d4-a716-446655440000
URL requests:             /chat/history/550e8400-e29b-41d4-a716-446655440001
                                         (Different!)
Result: 403 ❌

This indicates a BUG in your code!

Check:
□ In useChat.js, what userId is being passed?
□ Is it the same as logged-in userId?
□ Where is the mismatch?

Fix:
□ Find source of wrong userId
□ Ensure same userId used everywhere
□ Chat loads ✅
```

---

## 🔬 Deep Dive: Middleware Execution Order

```
CLIENT REQUEST ARRIVES at /chat/history/:userId
        │
        ├─ Includes Authorization header?
        │  ├─► NO  → 401 "Access token required"
        │  └─► YES → Continue
        │
        ▼
    [Middleware 1: authenticateToken]
    └─► Verify JWT signature
        ├─► INVALID    → 403 "Invalid or expired token"
        ├─► EXPIRED    → 403 "Invalid or expired token"  
        └─► VALID      → Extract userId, Continue
        
        ▼
    [Middleware 2: authorizeUser]
    └─► Compare req.userId with req.params.userId
        ├─► MISMATCH → 403 "Unauthorized: You can only access your own data"
        └─► MATCH    → Continue
        
        ▼
    [Middleware 3: verify2FA]
    └─► Check if requires2FA = true
        ├─► YES  → 403 "Two-factor authentication required"
        └─► NO   → Continue to route handler
        
        ▼
    [Route Handler]
    └─► Query database for messages
        └─► Return 200 OK with messages
            
            
KEY INSIGHT: The first middleware to fail stops execution!
             The others never run.
```

---

## 📝 Quick Checklist: Diagnose Your Error

### Before anything, gather information:

```
□ What's the exact error message in Network Response?
  Write it here: ________________________

□ How long ago did you log in?
  Write it here: ________________________

□ Is the API running on localhost:3000?
  □ YES (can visit in browser)
  □ NO (need to start it)

□ Are you definitely logged in?
  □ YES (see username/profile)
  □ NO (at login page)

□ Does localStorage have a token?
  □ YES (console shows it exists)
  □ NO (or empty)
```

### Based on your answers:

| Error Message | When | What to Check | Fix |
|---|---|---|---|
| "Invalid or expired token" | After activity idle | How long since login? | Log in if > 15 min |
| "Invalid or expired token" | Right after login | Is token stored? | Check localStorage |
| "Invalid or expired token" | After restart | Is API running? | Start npm run dev |
| "Unauthorized: You can only..." | Accessing chat | Are userIds same? | Check URL & token |
| "2FA required" | After login | Is 2FA enabled? | Re-login (it's disabled) |

---

## 🎯 The Exact Request Lifecycle

```
YOUR CODE                          SERVER CODE
─────────────────────────────────────────────────────────

useChat.js:
  token = "eyJhbGc..."
  userId = "550e8400..."
  
  ▼ (sends)
  
  fetch(/chat/history/550e8400, {
    headers: {
      Authorization: "Bearer eyJhbGc..."
    }
  })
                              ▼ (receives)
                              
                              api/routes/chat.js:
                              router.get("/history/:userId",
                                authenticateToken,  ← Check 1
                                authorizeUser,      ← Check 2
                                verify2FA,          ← Check 3
                                handler)
                              
                              ▼ Check token signature/expiry
                              api/middleware/auth.js:43
                              jwt.verify(token, SECRET, ...)
                              ├─ FAILS: send 403
                              └─ PASSES: extract userId
                              
                              ▼ Check user ownership
                              api/middleware/auth.js:51
                              if (req.userId !== :userId)
                              ├─ TRUE: send 403
                              └─ FALSE: continue
                              
                              ▼ Check 2FA status
                              api/middleware/auth.js:59
                              if (requires2FA === true)
                              ├─ TRUE: send 403
                              └─ FALSE: continue
                              
                              ▼ Query database
                              db.query("SELECT FROM messages...")
                              
                              ▼ (return results)
                              
  ▼ (receives)
  
  response.json()
  ├─ 403 with error
  └─ 200 with messages
  
  setChat(data)
  or setError(message)
```

---

## 💡 Pro Debugging Tips

### Tip 1: Console Logging
```javascript
// Add to useChat.js loadMessages:
console.group('🔍 Chat Load Debug');
console.log('1. Token:', token?.substring(0, 30) + '...');
console.log('2. User ID:', userId);
console.log('3. Auth User ID:', authUserId);
console.log('4. IDs Match?', userId === authUserId);
console.groupEnd();
```

### Tip 2: Network Inspection
```
F12 → Network tab
✓ Filter to show only /chat/* requests
✓ Reload page
✓ Click on 403 request
✓ Copy full request URL
✓ Copy full response body
✓ Note the timestamp
```

### Tip 3: Token Inspection
```javascript
// In console:
const token = localStorage.getItem('token');

// Install jwt-decode library first:
// npm install jwt-decode

// Then decode:
import jwt_decode from 'jwt-decode';
const decoded = jwt_decode(token);
console.log('Token decoded:', decoded);
console.log('Expires:', new Date(decoded.exp * 1000));
console.log('Expired now?', Date.now() > decoded.exp * 1000);
```

### Tip 4: Server-Side Check
```bash
# Check API logs while browser makes request
# Terminal where you ran "npm run dev"
# Should show:
# GET /chat/history/550e8400... 403
# GET /chat/history/550e8400... 200
```

---

## 🚀 Decision: What Should I Do NOW?

```
Is the 403 happening RIGHT NOW?
│
├─ YES → Do this:
│   1. Hard refresh (Ctrl+Shift+R)
│   2. Log out
│   3. Log in
│   4. Try again
│   5. See QUICK_FIX_403.md if still broken
│
└─ NO → Do this:
    1. Read ERROR_SUMMARY.md (overview)
    2. Implement "Permanent Fix #1" from
       TROUBLESHOOTING_403_GUIDE.md
    3. Never see this error again!
```

---

## 📞 If You're Stuck

1. **Screenshot the exact error from Network tab Response**
2. **Note the exact timestamp**
3. **Document when you logged in**
4. **Check if API is running**
5. **Run**: `localStorage.getItem('token')` in console
6. **Check**: The three files created for you:
   - `QUICK_FIX_403.md`
   - `TROUBLESHOOTING_403_GUIDE.md`
   - `ERROR_403_EXPLANATION.md`

You've got all the info you need! 💪
