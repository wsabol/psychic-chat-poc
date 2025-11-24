# 🚨 Quick Fix: HTTP 403 Error

## TL;DR - Do This RIGHT NOW

### Option 1: Fastest Fix (30 seconds)
```
1. Press Ctrl + Shift + R (hard refresh)
2. Log out if needed
3. Log in again
Done!
```

### Option 2: If Above Didn't Work
```javascript
// Open DevTools Console (F12) and paste:
localStorage.clear();
location.reload();
// Then log in again
```

### Option 3: Restart Everything
1. Stop the API: Press `Ctrl+C` in the terminal
2. Stop the Client: Press `Ctrl+C` in another terminal
3. Close the browser
4. Start API: `npm run dev` (in /api folder)
5. Start Client: `npm run dev` (in /client folder)
6. Open browser to http://localhost:3001
7. Log in again

---

## What's Actually Happening?

### The Technical Explanation (1 minute read)

Your app has **security middleware** that checks three things before showing your chat:

```
Request comes in
     ↓
Check 1: "Do you have a valid token?" 
     ↓ (if NO or expired)
   403 ❌ 

Check 2: "Is this YOUR chat (not someone else's)?"
     ↓ (if NO)
   403 ❌

Check 3: "Did you complete 2FA?"
     ↓ (if NO)
   403 ❌

All checks pass ✅
     ↓
Load your chat messages ✅
```

---

## Why It's Happening

### Most Likely Cause: Token Expired

Your JWT token **lasts only 15 minutes**.

```
15:00 - You log in → token created
15:14 - Still works
15:15 - Token expires ⏰
15:16 - You try to load chat → 403 ❌
```

**Solution**: Log in again. New token = fresh 15 minutes.

---

## Identify Your Specific Error

### Step 1: Open DevTools
Press `F12`

### Step 2: Go to Network Tab
Click **Network** tab

### Step 3: Reload Page
Press `Ctrl+R`

### Step 4: Find the Error
Look for red request to `/chat/history/...`

### Step 5: Check the Response
Click on it → **Response** tab

### Step 6: You'll See One Of These:

```json
// If you see THIS:
{ "error": "Invalid or expired token" }
→ Your token expired or is missing
→ Solution: Log in again

// If you see THIS:
{ "error": "Unauthorized: You can only access your own data" }
→ You're trying to access someone else's chat
→ Solution: Check the URL and userId

// If you see THIS:
{ "error": "Two-factor authentication required" }
→ 2FA code needed (but it's disabled for testing)
→ Solution: Log in again
```

---

## Why This Is Good Actually

This 403 error proves **your security is working**! ✅

The middleware is correctly:
- ✅ Validating tokens
- ✅ Preventing unauthorized access
- ✅ Enforcing authentication

This is exactly what should happen if:
1. You don't have a token
2. Your token expired
3. You try to access someone else's data

---

## Permanent Solution (Do This Once)

### Add Auto-Token-Refresh

Your app will automatically refresh the token every 10 minutes, so you never get kicked out.

**Create this file**: `client/src/hooks/useTokenRefresh.js`

```javascript
import { useEffect, useRef } from 'react';

export function useTokenRefresh() {
  const refreshInterval = useRef(null);
  
  useEffect(() => {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) return;
    
    // Refresh token every 10 minutes
    refreshInterval.current = setInterval(async () => {
      try {
        const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";
        
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });
        
        if (!res.ok) {
          // If refresh fails, user needs to log in again
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          console.error('⚠️ Session expired, please log in again');
          return;
        }
        
        const data = await res.json();
        localStorage.setItem('token', data.token);
        console.log('✅ Token refreshed (valid for another 15 min)');
      } catch (err) {
        console.error('Token refresh error:', err);
      }
    }, 10 * 60 * 1000);  // Every 10 minutes
    
    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, []);
}
```

**Add to your App.js**:

```javascript
import { useTokenRefresh } from './hooks/useTokenRefresh';

function App() {
  useTokenRefresh();  // ← Add this line
  
  // ... rest of your app
  return (
    // ...
  );
}
```

**That's it!** Your token will now auto-refresh, and you won't get random 403 errors.

---

## When to Apply This Fix

| Situation | Fix | Time |
|-----------|-----|------|
| First time seeing error | Hard refresh + log in | 30s |
| Still getting error | Clear localStorage | 1min |
| Getting 403 intermittently | Add auto-refresh hook | 5min |
| After every restart | Restart everything | 2min |

---

## Why You Might See This Again

This error can happen if:
- ❌ Browser tab idle > 15 minutes
- ❌ Closed app and reopened it
- ❌ Network connection dropped
- ❌ Server crashed
- ❌ Token stored incorrectly

The permanent fix (auto-refresh) prevents most of these!

---

## Server Status Check

Is the API even running?

```bash
# On Windows - Open Command Prompt and check:
netstat -ano | findstr :3000

# On Mac - Open Terminal and check:
lsof -i :3000

# If nothing appears, the API isn't running
# Solution: Start the API server
cd api
npm run dev
```

---

## Get Better Error Messages

### Add Console Logging

Edit `client/src/hooks/useChat.js` and replace:

```javascript
// OLD:
} catch (err) {
    console.error('Error loading messages:', err);
```

**WITH THIS**:

```javascript
// NEW - Much more helpful!
} catch (err) {
    console.error('Error loading messages:', {
        error: err.message,
        status: err.status,
        token: token ? `${token.substring(0, 20)}...` : 'NO TOKEN',
        userId: userId,
        authUserId: authUserId
    });
```

Now when you refresh, you'll see:
```
Error loading messages: {
  error: 'Invalid or expired token',
  status: 403,
  token: 'eyJhbGciOiJIUzI1NiIs...',
  userId: '550e8400-...',
  authUserId: '550e8400-...'
}
```

Much easier to debug! ✅

---

## Summary

| Problem | Why | How to Fix |
|---------|-----|----------|
| 403 Error | Token expired/missing | Log in again |
| Keeps happening | Token only lasts 15 min | Add auto-refresh |
| Still not working | Token stored wrong | Clear localStorage |
| App crashes | API not running | Start npm run dev |

---

## Need Help?

1. **What's the exact error in Network tab response?** → Shows which of 3 issues it is
2. **How long since you logged in?** → If >15min, token expired
3. **Did you restart the API?** → If yes, old tokens are invalid
4. **Have you cleared localStorage?** → localStorage.clear() in console

Once you answer these, you'll fix it! 💪
