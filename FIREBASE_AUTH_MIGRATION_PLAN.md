# Firebase Authentication Migration Plan
## Replace custom auth system with Firebase

**Current Status**: 🔴 NOT STARTED  
**Target Status**: 🟢 COMPLETE  
**Estimated Duration**: 2-3 weeks  
**Last Updated**: November 26, 2025

---

## OVERVIEW

### What We're Replacing
- ❌ Custom JWT authentication (/auth/login, /auth/register, /auth/forgot-password)
- ❌ Password hashing with bcrypt
- ❌ Custom 2FA system (Twilio SMS codes)
- ❌ User password storage in database
- ❌ Custom session management
- ❌ Login page UI component

### What We're Adopting
- ✅ Firebase Authentication (email/password + Google/Apple sign-in)
- ✅ Firebase managed tokens (no JWT complexity)
- ✅ Firebase built-in 2FA and security
- ✅ Firebase security rules
- ✅ Firebase admin SDK for backend validation
- ✅ Zero password storage (Firebase handles it)

### Benefits
- **Security**: Industry standard, managed by Google, automatic security updates
- **Features**: 2FA, email verification, password reset built-in
- **Simplicity**: No password hashing, no token management, no session handling
- **Scalability**: Firebase scales automatically
- **Cost**: Free tier generous for small apps

---

## PHASE 1: FIREBASE PROJECT SETUP (Day 1)

### 1.1 Create Firebase Project
- [ ] Go to: https://console.firebase.google.com/
- [ ] Click "Create Project"
- [ ] Project name: `psychic-chat-poc`
- [ ] Enable Google Analytics (optional but recommended)
- [ ] Create project
- [ ] Wait for setup to complete (~1 minute)

**Time**: 5 minutes  
**Output**: Firebase project created Successfully Completed 26 Nov 2025

---

### 1.2 Enable Authentication Methods
- [ ] In Firebase console, go to **Authentication** (left sidebar)
- [ ] Click **Get Started**
- [ ] Enable providers:
  - [x] **Email/Password** - for email/password login
  - [x] **Google** - for "Sign in with Google" button
  - [x] **Apple** - for "Sign in with Apple" button (iOS requirement)
- [ ] For Email/Password:
  - [ ] Enable "Email/Password"
  - [ ] Enable "Email link sign-in" (optional - for passwordless)
- [ ] For Google:
  - [ ] Click Google provider
  - [ ] Add your email as test user initially
  - [ ] Copy **Web Client ID** (you'll need this)
- [ ] For Apple:
  - [ ] Requires Apple Developer account
  - [ ] Can configure later when needed

**Time**: 15 minutes  
**Output**: Auth methods enabled Completed 26 Nov 2025
---

### 1.3 Get Firebase SDK Keys
- [ ] In Firebase console, go to **Project Settings** (gear icon, top right)
- [ ] Click **Your apps** section
- [ ] Click **Create app** → **Web**
- [ ] App name: `psychic-chat-web`
- [ ] Firebase will give you config:
  ```javascript
  const firebaseConfig = {
    apiKey: "...",
    authDomain: "...",
    projectId: "...",
    storageBucket: "...",
    messagingSenderId: "...",
    appId: "..."
  };
  ```
- [ ] **COPY this entire config** (you'll need it for client)
- [ ] **SAVE apiKey and projectId** (secure location)

**Time**: 10 minutes  
**Output**: Firebase config ready Copied and saved in a safe place 

---

### 1.4 Create Firebase Admin SDK Key (for Backend)
- [ ] In Firebase console, go to **Project Settings** → **Service Accounts**
- [ ] Click **Generate new private key**
- [ ] A JSON file downloads (keep it SAFE - it's sensitive)
- [ ] Store this file as `firebase-adminsdk-key.json` (DO NOT COMMIT TO GIT)
- [ ] Add to `.gitignore`

**Time**: 5 minutes  
**Output**: Admin SDK key ready

---

### ✅ PHASE 1 COMPLETE
**Checklist**:
- [x] Firebase project created
- [x] Auth methods enabled
- [x] Web SDK config obtained
- [x] Admin SDK key downloaded

**Deliverables**:
- Firebase config object
- Admin SDK JSON key file

---

## PHASE 2: BACKEND SETUP (Days 2-3)

### 2.1 Install Firebase Admin SDK
```bash
cd api
npm install firebase-admin
cd ../worker
npm install firebase-admin
cd ..
```

**Time**: 5 minutes Complete 26 Nov 2025

---

### 2.2 Create Firebase Admin Module (API)
Create `api/shared/firebase-admin.js`:

```javascript
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// Initialize Firebase Admin SDK
const serviceAccountPath = process.env.FIREBASE_KEY_PATH || './firebase-adminsdk-key.json';

if (!fs.existsSync(serviceAccountPath)) {
  console.error('ERROR: firebase-adminsdk-key.json not found at', serviceAccountPath);
  console.error('Please set FIREBASE_KEY_PATH environment variable');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID
});

export const auth = admin.auth();
export const db = admin.firestore(); // Optional - for future use
```

**Time**: 10 minutes Complete 26 Nov 2025

---

### 2.3 Create Auth Middleware (API)
Update `api/middleware/auth.js` to verify Firebase tokens:

```javascript
import { auth } from '../shared/firebase-admin.js';

export async function authenticateToken(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer token
    
    if (!token) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }
    
    // Verify Firebase token
    const decodedToken = await auth.verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified
    };
    
    next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(403).json({ error: 'Invalid token' });
  }
}

export function authorizeUser(req, res, next) {
  // Firebase UID becomes the userId
  // Verify user is accessing their own data
  const { userId } = req.params;
  
  if (userId !== req.user.uid) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  next();
}
```

**Time**: 15 minutes Complete 26 Nov 2025

---

### 2.4 Create New Auth Routes (API)
Replace old `/auth` routes with new Firebase-based routes.

Create `api/routes/auth-firebase.js`:

```javascript
import { Router } from 'express';
import { auth } from '../shared/firebase-admin.js';
import { db } from '../shared/db.js';

const router = Router();

/**
 * POST /auth/register
 * User registration via Firebase
 * Frontend should handle: create user with email/password, then send to backend
 * OR: Backend receives email/password, creates user, returns token
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phoneNumber } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    // Firebase creates the user
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`.trim()
    });
    
    // Create user profile in our database (but NO password)
    await db.query(
      `INSERT INTO user_personal_info (user_id, email, first_name, last_name, phone_number, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [userRecord.uid, email, firstName, lastName, phoneNumber]
    );
    
    // Generate custom token for immediate login
    const customToken = await auth.createCustomToken(userRecord.uid);
    
    return res.status(201).json({
      success: true,
      uid: userRecord.uid,
      email: userRecord.email,
      customToken, // Send to frontend to exchange for ID token
      message: 'User registered successfully'
    });
  } catch (err) {
    console.error('Registration error:', err);
    if (err.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    return res.status(500).json({ error: 'Registration failed', details: err.message });
  }
});

/**
 * POST /auth/login
 * Firebase handles login on client-side
 * Backend just validates token
 * Frontend: user enters email/password → Firebase.auth().signInWithEmailAndPassword()
 *           → Firebase returns idToken → send to backend in Authorization header
 */

/**
 * GET /auth/user
 * Get current user info
 * Requires: Valid Firebase token in Authorization header
 */
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const firebaseUser = await auth.getUser(req.user.uid);
    
    // Get our user profile from database
    const result = await db.query(
      'SELECT * FROM user_personal_info WHERE user_id = $1',
      [req.user.uid]
    );
    
    const userProfile = result.rows[0] || {};
    
    return res.json({
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      emailVerified: firebaseUser.emailVerified,
      profile: userProfile
    });
  } catch (err) {
    console.error('Get user error:', err);
    return res.status(500).json({ error: 'Failed to get user info' });
  }
});

/**
 * POST /auth/send-password-reset
 * Firebase handles password reset emails
 */
router.post('/send-password-reset', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }
    
    const resetLink = await auth.generatePasswordResetLink(email);
    
    // TODO: Send email with resetLink to user
    // For now, return link (frontend can show it)
    
    return res.json({
      success: true,
      message: 'Password reset link sent',
      resetLink // Remove this in production - don't send via API
    });
  } catch (err) {
    console.error('Password reset error:', err);
    if (err.code === 'auth/user-not-found') {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(500).json({ error: 'Failed to send reset link' });
  }
});

/**
 * POST /auth/delete-account
 * Delete user account
 * Requires: Valid Firebase token + password verification
 */
router.post('/delete-account', authenticateToken, authorizeUser, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Delete from Firebase
    await auth.deleteUser(userId);
    
    // Delete/anonymize from database
    await db.query(
      `UPDATE user_personal_info 
       SET first_name = 'DELETED', 
           last_name = 'DELETED',
           email = $1,
           updated_at = NOW()
       WHERE user_id = $2`,
      [`deleted_${userId}@deleted.local`, userId]
    );
    
    // Delete associated data
    await db.query('DELETE FROM messages WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM user_astrology WHERE user_id = $1', [userId]);
    
    return res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (err) {
    console.error('Delete account error:', err);
    return res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
```

**Time**: 30 minutes Complete 26 Nov 2025

---

### 2.5 Update Router Configuration (API)
Update `api/index.js`:

```javascript
// Replace old auth routes
// OLD: import authRoutes from "./routes/auth.js";
// NEW:
import authRoutes from "./routes/auth-firebase.js";

// All other routes stay the same but update middleware:
// Change: middleware/auth.js to use Firebase token verification
app.use("/auth", authRoutes); // Public routes
app.use("/chat", authenticateToken, chatRoutes); // Protected - firebase token required
app.use("/user-profile", authenticateToken, userProfileRoutes);
// ... etc
```

**Time**: 10 minutes Complete 26 Nov 2025

---

### 2.6 Create Firebase Admin Module (Worker)
Same as API - create `worker/modules/shared/firebase-admin.js` with admin initialization.

**Time**: 5 minutes Complete 26 Nov 2025

---

### ✅ PHASE 2 COMPLETE
**Checklist**:
- [x] Firebase Admin SDK installed (API + Worker)
- [x] Auth middleware updated for Firebase tokens
- [x] New auth routes created
- [x] Old auth routes removed/disabled
- [x] Router configuration updated

---

## PHASE 3: FRONTEND SETUP (Days 4-5)

### 3.1 Install Firebase SDK (Frontend)
```bash
cd client
npm install firebase
cd ..
```

**Time**: 5 minutes

---

### 3.2 Create Firebase Config (Frontend)
Create `client/src/firebase.js`:

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

Create `client/.env.local`:
```
REACT_APP_FIREBASE_API_KEY=xxx
REACT_APP_FIREBASE_AUTH_DOMAIN=xxx
REACT_APP_FIREBASE_PROJECT_ID=xxx
REACT_APP_FIREBASE_STORAGE_BUCKET=xxx
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=xxx
REACT_APP_FIREBASE_APP_ID=xxx
```

**Time**: 10 minutes

---

### 3.3 Create Auth Context (Frontend)
Create `client/src/context/AuthContext.jsx`:

```javascript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Get ID token
          const token = await firebaseUser.getIdToken();
          
          // Get user profile from backend
          const response = await fetch(`http://localhost:3000/auth/user`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          const profile = await response.json();
          
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            token,
            profile
          });
        } else {
          setUser(null);
        }
      } catch (err) {
        setError(err.message);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

**Time**: 20 minutes

---

### 3.4 Create Login Component (New)
Create `client/src/components/Login.jsx`:

```javascript
import React, { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const googleProvider = new GoogleAuthProvider();

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Sign In</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleEmailLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
      
      <button onClick={handleGoogleLogin} disabled={loading}>
        Sign In with Google
      </button>
      
      <p>Don't have an account? <a href="/register">Register here</a></p>
      <p><a href="/forgot-password">Forgot password?</a></p>
    </div>
  );
}
```

**Time**: 15 minutes

---

### 3.5 Create Register Component (New)
Create `client/src/components/Register.jsx`:

```javascript
import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

export function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Create user in Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create profile in backend database
      const token = await userCredential.user.getIdToken();
      const response = await fetch('http://localhost:3000/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email, firstName, lastName, phoneNumber })
      });
      
      if (!response.ok) throw new Error('Failed to create profile');
      
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <h2>Create Account</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleRegister}>
        <input
          type="text"
          placeholder="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="tel"
          placeholder="Phone Number"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength="6"
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>
      
      <p>Already have an account? <a href="/login">Sign in here</a></p>
    </div>
  );
}
```

**Time**: 15 minutes

---

### 3.6 Create Password Reset Component (New)
Create `client/src/components/ForgotPassword.jsx`:

```javascript
import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent! Check your inbox.');
      setEmail('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <h2>Forgot Password?</h2>
      
      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}
      
      <form onSubmit={handleReset}>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send Reset Email'}
        </button>
      </form>
      
      <p><a href="/login">Back to login</a></p>
    </div>
  );
}
```

**Time**: 10 minutes

---

### 3.7 Update Route Configuration
Update `client/src/App.jsx`:

```javascript
import { AuthProvider } from './context/AuthContext';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { ForgotPassword } from './components/ForgotPassword';

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/dashboard" element={<Dashboard />} />
        {/* ... other routes */}
      </Routes>
    </AuthProvider>
  );
}
```

**Time**: 10 minutes

---

### ✅ PHASE 3 COMPLETE
**Checklist**:
- [x] Firebase SDK installed
- [x] Firebase config created
- [x] Auth context created
- [x] Login component created
- [x] Register component created
- [x] Password reset component created
- [x] Routes updated

---

## PHASE 4: DATABASE CLEANUP (Day 6)

### 4.1 Remove Old Auth Data
Since Firebase handles passwords, we don't need:

```sql
-- NO LONGER NEEDED (Firebase handles these):
-- - password_hash column
-- - email_verified column (Firebase tracks this)
-- - email_verified_at column
-- - 2FA columns (Firebase has built-in 2FA)
-- - user_2fa_settings table
-- - user_2fa_codes table
-- - password_reset_tokens table (if exists)

-- We DO still need:
-- - user_id (Firebase UID)
-- - email (for reference)
-- - first_name, last_name (profile data)
-- - birth_date, birth_time, birth_location (astrology)
-- - chat history, astrology data
```

But for now: **KEEP all columns** - just don't use password_hash column anymore.

**Time**: 5 minutes

---

### 4.2 Disable Old Auth Routes
Update API router to NOT include old auth routes:

```javascript
// OLD: import authRoutes from "./routes/auth.js";
// NEW: import authRoutes from "./routes/auth-firebase.js";

// Comment out or remove old route if exists
// OLD: app.use("/auth", oldAuthRoutes);
// NEW: app.use("/auth", firebaseAuthRoutes);
```

**Time**: 5 minutes

---

### ✅ PHASE 4 COMPLETE

---

## PHASE 5: TESTING (Day 7)

### 5.1 Test Registration Flow
- [ ] Navigate to /register
- [ ] Fill form with test data
- [ ] Submit
- [ ] User created in Firebase
- [ ] User profile created in database
- [ ] Redirects to dashboard

**Time**: 15 minutes

---

### 5.2 Test Login Flow
- [ ] Navigate to /login
- [ ] Enter test email/password
- [ ] Successfully logged in
- [ ] Redirected to dashboard
- [ ] User data loaded
- [ ] Token working

**Time**: 15 minutes

---

### 5.3 Test Password Reset
- [ ] Click "Forgot password"
- [ ] Enter email
- [ ] Firebase sends reset email
- [ ] Click link in email
- [ ] Reset password works
- [ ] Can login with new password

**Time**: 15 minutes

---

### 5.4 Test Protected Routes
- [ ] Logout
- [ ] Try to access /dashboard directly
- [ ] Should redirect to /login
- [ ] Login again
- [ ] Can access /dashboard

**Time**: 15 minutes

---

### 5.5 Test Google Sign-In
- [ ] Click "Sign in with Google"
- [ ] Google popup appears
- [ ] Select test account
- [ ] Logged in successfully
- [ ] Redirected to dashboard

**Time**: 15 minutes

---

### ✅ PHASE 5 COMPLETE

---

## SUMMARY

### Old System (Being Removed)
```
❌ Custom JWT tokens
❌ Password hashing (bcrypt)
❌ Custom 2FA (Twilio SMS)
❌ /auth/login route
❌ /auth/register route
❌ /auth/forgot-password route
❌ Session management
❌ Password in database
```

### New System (Firebase)
```
✅ Firebase ID tokens
✅ Firebase password management
✅ Firebase built-in 2FA
✅ Google Sign-In
✅ Apple Sign-In
✅ Email verification
✅ Password reset emails
✅ Security rules
✅ Zero password storage
```

### Timeline
- **Day 1**: Firebase setup
- **Days 2-3**: Backend integration
- **Days 4-5**: Frontend components
- **Day 6**: Database cleanup
- **Day 7**: Testing

**Total**: ~1 week

---

## NEXT STEP: Start Phase 1 - Firebase Setup

Ready to begin? I'll guide you through each step.
