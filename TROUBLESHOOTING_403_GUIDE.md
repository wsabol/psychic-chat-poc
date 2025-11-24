# 403 Forbidden Error - Complete Troubleshooting Guide

## Visual Workflow: What Happens When You Try to Load Chat Messages

```
┌──────────────────────────────────────────────────────────────────┐
│  Client: useChat.js calls loadMessages()                         │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│  Browser makes GET request to:                                  │
│  http://localhost:3000/chat/history/{userId}                    │
│  With Header: Authorization: Bearer {token}                     │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│  API Server (api/routes/chat.js)                                │
│  router.get("/history/:userId",                                 │
│    authenticateToken,    ← MIDDLEWARE 1: Validate JWT           │
│    authorizeUser,        ← MIDDLEWARE 2: Check user ID match    │
│    verify2FA,            ← MIDDLEWARE 3: Check 2FA complete     │
│    async (req, res) => {})                                       │
└────────────────┬─────────────────────────────────────────────────┘
                 │
        ┌────────┴────────┬─────────────┐
        │                 │             │
        ▼                 ▼             ▼
    ✗ Failed at       ✗ Failed at      ✓ Passed
    Middleware 1      Middleware 2      all tests
    (JWT Invalid)     (User ID)         │
        │                 │             │
        ▼                 ▼             ▼
    403: Invalid      403:              Query DB
    or expired        Unauthorized      Return messages
    token             (wrong user)      
```

---

## Step 1: Identify the Exact Error

### A. Check Browser Network Tab
1. Open DevTools: Press `F12`
2. Go to **Network** tab
3. Reload page
4. Find the failed request to `/chat/history/...`
5. Click on it
6. Go to **Response** tab
7. Look for the error message:

```json
// Check which one you see:

// ERROR 1 - JWT Token Problem
{ "error": "Invalid or expired token" }

// ERROR 2 - User ID Problem  
{ "error": "Unauthorized: You can only access your own data" }

// ERROR 3 - 2FA Problem
{ "error": "Two-factor authentication required" }
```

### B. Check Browser Console
1. Open DevTools: Press `F12`
2. Go to **Console** tab
3. Look for the error message

---

## Step 2: Diagnose Each Possible Issue

### 🔴 ISSUE 1: Invalid or Expired JWT Token
**Error Message**: `{ "error": "Invalid or expired token" }`

**Root Cause**: Your JWT token is:
- Missing or malformed
- Expired (>15 minutes old)
- Not being sent with the request
- Corrupted

**Where it's rejected**: `api/middleware/auth.js` lines 37-44
```javascript
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });  // ← 401 No token
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });  // ← 403 Invalid/Expired
    }
    req.userId = decoded.userId;
    next();
  });
}
```

**How to Fix**:

#### Step 1: Verify token exists
Add this to your `App.js` or `useAuth.js`:
```javascript
// Check if token is stored
const token = localStorage.getItem('token');
console.log('Token in localStorage:', token);
console.log('Token present:', !!token);
```

#### Step 2: Check token expiration
The token generated in `api/middleware/auth.js` line 11 expires in **15 minutes**:
```javascript
export function generateToken(userId, requires2FA = false) {
  const expiresIn = requires2FA ? '10m' : '15m';  // ← Expires in 15 minutes
  return jwt.sign(
    { userId, requires2FA },
    JWT_SECRET,
    { expiresIn }
  );
}
```

**How long ago did you log in?**
- ✅ Within 15 minutes → Token should be valid
- ❌ More than 15 minutes ago → Token expired

#### Step 3: Force Token Refresh
```javascript
// Option A: Log out and back in
localStorage.removeItem('token');
localStorage.removeItem('refreshToken');
// Navigate to login page

// Option B: Hard refresh page (clears cache)
// Windows: Ctrl + Shift + R
// Mac: Cmd + Shift + R
```

#### Step 4: Implement Auto-Token Refresh (Permanent Fix)
See **PERMANENT FIX #1** below

---

### 🔴 ISSUE 2: User ID Mismatch
**Error Message**: `{ "error": "Unauthorized: You can only access your own data" }`

**Root Cause**: You're trying to access someone else's chat history

**Where it's rejected**: `api/middleware/auth.js` lines 48-53
```javascript
export function authorizeUser(req, res, next) {
  const requestedUserId = req.params.userId;
  
  if (req.userId !== requestedUserId) {  // ← Token's userID ≠ URL's userID
    return res.status(403).json({ error: 'Unauthorized: You can only access your own data' });
  }
  
  next();
}
```

**Example Scenario**:
```
Your ID in token:        550e8400-e29b-41d4-a716-446655440000
URL requesting:          /chat/history/550e8400-e29b-41d4-a716-446655440001
                         (Different ID!)
Result:                  403 Forbidden ❌
```

**How to Fix**:

Ensure you're requesting your own chat history:

#### Check what's being sent
In `useChat.js` add debugging:
```javascript
const loadMessages = useCallback(async () => {
    console.log('Requesting chat history for userId:', userId);
    console.log('Authenticated userId:', authUserId);
    console.log('Are they the same?', userId === authUserId);
    
    try {
        const headers = token ? { "Authorization": `Bearer ${token}` } : {};
        const res = await fetch(`${API_URL}/chat/history/${userId}`, { headers });
        // ...
    } catch (err) {
        // ...
    }
}, [userId, token, isAuthenticated, authUserId]);
```

#### Verify the login response
In your login handler:
```javascript
// After login, check what userId you received
const loginResponse = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
});

const data = await loginResponse.json();
console.log('Logged in as userId:', data.userId);  // ← This should match
localStorage.setItem('userId', data.userId);
```

---

### 🔴 ISSUE 3: 2FA Not Complete
**Error Message**: `{ "error": "Two-factor authentication required" }`

**Root Cause**: Token was generated with `requires2FA: true` but you haven't verified the 2FA code yet

**Where it's rejected**: `api/middleware/auth.js` lines 56-61
```javascript
export function verify2FA(req, res, next) {
  if (req.requires2FA === true) {  // ← Token has requires2FA = true
    return res.status(403).json({ error: 'Two-factor authentication required' });
  }
  next();
}
```

**Current Status**: 2FA is **DISABLED FOR TESTING** in your code!

In `api/routes/auth.js` lines 275-308, the entire 2FA section is commented out:
```javascript
// Get 2FA settings (disabled for testing while Twilio setup pending)
// const twoFAResult = await db.query(
//   'SELECT * FROM user_2fa_settings WHERE user_id = $1',
//   [user.user_id]
// );
// ... (entire 2FA block commented)

// 2FA disabled for testing - skip to direct login
// TODO: Re-enable after Twilio account setup
const token = generateToken(user.user_id, false);  // ← requires2FA = false
```

**Your current login flow**:
```
Login → No 2FA required → Token with requires2FA: false → ✅ Should work
```

**So if you're getting "2FA required" error**, it means:
1. You're using an old token from before 2FA was disabled
2. Something modified the token

**How to Fix**:
Just log in again! The new token won't have 2FA requirement.

---

## Step 3: What's Actually Stored on Your Computer?

### Check localStorage
Open DevTools Console and run:
```javascript
// Check all stored values
console.log('localStorage.token:', localStorage.getItem('token'));
console.log('localStorage.userId:', localStorage.getItem('userId'));
console.log('localStorage.refreshToken:', localStorage.getItem('refreshToken'));

// Check if they're expired
const token = localStorage.getItem('token');
if (token) {
  const decoded = jwt_decode(token);  // Requires jwt-decode library
  console.log('Token expires at:', new Date(decoded.exp * 1000));
  console.log('Token expired?', Date.now() > decoded.exp * 1000);
}
```

### Clear and Reset
If something's corrupted:
```javascript
// Clear everything
localStorage.clear();
sessionStorage.clear();

// Hard refresh
window.location.reload(true);

// Log in again
```

---

## PERMANENT FIX #1: Implement Token Auto-Refresh

### Problem
Token expires after 15 minutes. User has to log in again.

### Solution
Implement refresh token rotation (mentioned in your CHAT_SECURITY_PLAN.md Phase 2).

### Implementation

#### Step 1: Create Refresh Token Endpoint
Already exists in `api/routes/auth.js` (add if missing):

```javascript
router.post('/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid refresh token' });
      }

      // Generate new access token
      const newAccessToken = generateToken(decoded.userId, false);
      
      res.json({
        token: newAccessToken,
        expiresIn: '15m'
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Token refresh failed' });
  }
});
```

#### Step 2: Create Token Refresh Hook
Create `client/src/hooks/useTokenRefresh.js`:

```javascript
import { useEffect, useRef } from 'react';

export function useTokenRefresh() {
  const refreshInterval = useRef(null);
  
  useEffect(() => {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) return;
    
    // Refresh token every 10 minutes (before 15-minute expiry)
    refreshInterval.current = setInterval(async () => {
      try {
        const res = await fetch('http://localhost:3000/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });
        
        if (!res.ok) {
          // Refresh failed, user needs to log in again
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          return;
        }
        
        const data = await res.json();
        localStorage.setItem('token', data.token);
        console.log('✅ Token refreshed automatically');
      } catch (err) {
        console.error('Token refresh failed:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }, 10 * 60 * 1000);  // 10 minutes
    
    return () => clearInterval(refreshInterval.current);
  }, []);
}
```

#### Step 3: Use in Your App
In `App.js` or `index.js`:

```javascript
import { useTokenRefresh } from './hooks/useTokenRefresh';

export function App() {
  useTokenRefresh();  // Add this line
  
  return (
    // ... rest of your app
  );
}
```

---

## PERMANENT FIX #2: Better Error Handling in useChat

Update `client/src/hooks/useChat.js` to handle 403 errors gracefully:

```javascript
import { useState, useEffect, useCallback } from "react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

export function useChat(userId, token, isAuthenticated, authUserId) {
    const [chat, setChat] = useState([]);
    const [message, setMessage] = useState("");
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(null);
    
    const loadMessages = useCallback(async () => {
        try {
            if (!token) {
                console.error('❌ No token available');
                setError('Authentication required. Please log in.');
                return [];
            }
            
            console.log('📤 Fetching chat history...');
            console.log('Token:', token.substring(0, 20) + '...');
            
            const headers = { "Authorization": `Bearer ${token}` };
            const res = await fetch(`${API_URL}/chat/history/${userId}`, { headers });
            
            console.log('📥 Response status:', res.status);
            
            if (!res.ok) {
                const errorData = await res.json();
                console.error('❌ Server error:', errorData);
                
                // Handle specific errors
                if (res.status === 403) {
                    // Token likely expired
                    if (errorData.error.includes('Invalid or expired token')) {
                        console.error('🔑 Token expired or invalid');
                        localStorage.removeItem('token');
                        setError('Session expired. Please log in again.');
                    } else if (errorData.error.includes('Unauthorized')) {
                        console.error('⛔ User ID mismatch');
                        setError('Unauthorized access to this chat history.');
                    } else if (errorData.error.includes('2FA')) {
                        console.error('🔐 2FA required');
                        setError('Two-factor authentication required.');
                    }
                }
                
                throw new Error(`HTTP error! Status: ${res.status}`);
            }
            
            const data = await res.json();
            console.log('✅ Messages loaded:', data.length);
            setChat(data);
            setLoaded(true);
            setError(null);
            return data;
        } catch (err) {
            console.error('Error loading messages:', err);
            if (isAuthenticated && authUserId) {
                setError(err.message);
            }
            return [];
        }
    }, [userId, token, isAuthenticated, authUserId]);
    
    // ... rest of your code ...
}
```

---

## PERMANENT FIX #3: Add Logging Middleware on Server

Create `api/middleware/logging.js`:

```javascript
export function requestLogger(req, res, next) {
  const start = Date.now();
  
  // Log request
  console.log(`\n📥 ${req.method} ${req.path}`);
  console.log(`   Headers:`, {
    authorization: req.headers.authorization ? req.headers.authorization.substring(0, 50) + '...' : 'none',
    userAgent: req.get('user-agent')
  });
  
  // Log response
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - start;
    const status = res.statusCode;
    
    console.log(`📤 ${status} (${duration}ms)`);
    if (status >= 400) {
      console.log(`   Error:`, data);
    }
    
    return originalJson.call(this, data);
  };
  
  next();
}
```

Add to `api/index.js`:

```javascript
import { requestLogger } from "./middleware/logging.js";

app.use(requestLogger);
```

---

## Debugging Checklist

```markdown
## Before Debugging
- [ ] Browser console is open (F12)
- [ ] Network tab is recording
- [ ] You've recently logged in (within 15 minutes)
- [ ] You're on the chat page

## Debug Steps
1. [ ] Open DevTools Console
2. [ ] Reload the page (Ctrl+R)
3. [ ] Look at console errors
4. [ ] Go to Network tab
5. [ ] Find `/chat/history/...` request
6. [ ] Check Response body for error message
7. [ ] Categorize which of the 3 errors it is

## Specific Checks
- [ ] localStorage has 'token' key: 
   `console.log(localStorage.getItem('token'))`
- [ ] Token is not empty
- [ ] You logged in less than 15 minutes ago
- [ ] userId in token matches userId in request
- [ ] No console errors before the 403

## Quick Fixes to Try
- [ ] Hard refresh (Ctrl+Shift+R)
- [ ] Log out and log back in
- [ ] Clear localStorage: `localStorage.clear()`
- [ ] Restart dev server (localhost)
- [ ] Check if backend is still running
```

---

## Quick Reference: All 403 Error Scenarios

| Scenario | Error Message | Check | Fix |
|----------|---------------|-------|-----|
| Token missing | ❌ No token in header | Is user logged in? | Log in |
| Token expired | Invalid or expired token | > 15 min since login? | Log in again |
| Token malformed | Invalid or expired token | Token corrupted? | Clear localStorage |
| Wrong user ID | Unauthorized: You can only access your own data | URL userId ≠ token userId | Check URL & token |
| 2FA required | 2FA required | 2FA pending? | Verify code (if enabled) |
| Server offline | Network error (not 403) | Is API running? | npm run dev (api) |

---

## Need More Help?

**Check the following files**:
- ✅ `api/middleware/auth.js` - Where 403 is returned
- ✅ `api/routes/chat.js` - Where endpoint is defined
- ✅ `api/routes/auth.js` - Where token is generated
- ✅ `client/src/hooks/useChat.js` - Where request is made
- ✅ `CHAT_SECURITY_PLAN.md` - Architecture documentation

**Next steps**:
1. Identify which of the 3 errors you're seeing
2. Apply the appropriate fix
3. Test by logging out and back in
4. Implement the permanent fix to prevent future issues
