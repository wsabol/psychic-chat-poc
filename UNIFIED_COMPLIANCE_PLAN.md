# 🔐 UNIFIED SECURITY & COMPLIANCE ROADMAP

**Status**: 🟡 PARTIAL (45% COMPLETE)  
**Target Status**: 🟢 COMPLIANT & SECURE (95%)  
**Total Estimated Duration**: 4-5 weeks  
**Last Updated**: November 23, 2025  
**Previous Plans**: CHAT_SECURITY_PLAN.md ❌ DEPRECATED | COMPLIANCE_WORK_PLAN.md ❌ DEPRECATED

---

## 📊 EXECUTIVE SUMMARY

This unified roadmap consolidates both the Chat Security Plan and Compliance Work Plan into a single, coherent security architecture. It eliminates duplication, clarifies priorities, and creates a logical progression from foundational database security through advanced authentication hardening.

### **Key Improvements Over Separate Plans:**
✅ Single timeline (instead of two overlapping plans)  
✅ No duplication of audit logging, encryption strategies  
✅ Clear dependencies between phases  
✅ Email encryption integrated (not left as gap)  
✅ All sensitive data protection standardized  
✅ One database schema (no conflicts)  

### **What's Already Complete (45%)**
- ✅ User ownership validation (JWT + authorization checks)
- ✅ Rate limiting (brute force protection)
- ✅ Chat message encryption (AES-256 at database level)
- ✅ JWT token validation middleware
- ✅ Database encryption infrastructure (pgcrypto)
- ✅ PII encrypted: first_name, last_name, birth_date, birth_city, birth_timezone
- ✅ Privacy policy (comprehensive 20-section document)
- ✅ HTTPS/TLS enforcement (Railway.app configured)

### **What Needs Work (55%)**
- ⏳ Email address encryption (currently plaintext) - **BLOCKING**
- ⏳ Additional field encryption (phone, sex, familiar_name)
- ⏳ Email lookup query migration (for encrypted email)
- ⏳ Terms of service
- ⏳ Consent management (database + UI)
- ⏳ User data rights (export, delete, correct)
- ⏳ Audit logging (comprehensive implementation)
- ⏳ 2FA (TOTP + recovery codes)
- ⏳ Account lockout mechanism
- ⏳ DPIA document
- ⏳ Sub-processor documentation
- ⏳ Incident response procedures

---

## 🎯 PHASE OVERVIEW

| Phase | Name | Duration | Focus | Status |
|-------|------|----------|-------|--------|
| **1** | Database Security | **1 week** | Encrypt all PII + sensitive fields | 🟡 70% |
| **2** | Application Security | **1 week** | HTTPS, headers, tokens, 2FA | 🟡 40% |
| **3** | User Rights & Consent | **1 week** | Export, delete, consent management | ⬜ 0% |
| **4** | Audit & Governance | **1 week** | Logging, DPIA, incident response | ⬜ 0% |
| **5** | Advanced Hardening | **1+ week** | Session management, account lockout | ⬜ 0% |

---

---

## PHASE 1: DATABASE SECURITY (Week 1)
**Priority**: 🔴 CRITICAL  
**Goal**: Ensure all sensitive data is encrypted at rest, no plaintext PII in database  
**Current Status**: 🟡 70% COMPLETE  
**Estimated Time**: 6-8 hours total

### 1.1 Email Address Encryption Migration
**Status**: ⏳ TODO | **Time**: 2 hours | **Risk**: MEDIUM | **Blocking**: Chat login queries

**Why This Matters:**
- Email is currently stored plaintext, violates GDPR data minimization
- All login queries must be updated to use `pgp_sym_decrypt()`
- Prevents email scraping from database breaches
- Aligns with completed PII encryption (Compliance 1.1)

**Database Migration:**
```sql
-- Step 1: Add encrypted column
ALTER TABLE user_personal_info ADD COLUMN email_encrypted BYTEA;

-- Step 2: Encrypt existing emails
UPDATE user_personal_info 
SET email_encrypted = pgp_sym_encrypt(email, current_setting('app.encryption_key'))
WHERE email_encrypted IS NULL AND email IS NOT NULL;

-- Step 3: Verify encryption worked (should return count of encrypted records)
SELECT COUNT(*) as encrypted_count FROM user_personal_info 
WHERE email_encrypted IS NOT NULL;

-- Step 4: Keep plaintext column for 48 hours as backup, then:
-- ALTER TABLE user_personal_info DROP COLUMN email;
```

**Code Changes Required in `api/routes/auth.js`:**

**OLD (plaintext query):**
```javascript
const userResult = await db.query(
  'SELECT user_id, password_hash FROM user_personal_info WHERE email = $1',
  [email]
);
```

**NEW (encrypted query):**
```javascript
const userResult = await db.query(
  `SELECT user_id, password_hash FROM user_personal_info 
   WHERE pgp_sym_decrypt(email_encrypted, $1) = $2`,
  [process.env.ENCRYPTION_KEY, email]
);
```

**Also Update in Firebase Registration:**
```javascript
// In api/routes/auth-firebase.js - register-firebase-user endpoint
await db.query(
  `INSERT INTO user_personal_info (user_id, email_encrypted, email_verified, created_at, updated_at)
   VALUES ($1, pgp_sym_encrypt($2, $3), false, NOW(), NOW())`,
  [userId, email, process.env.ENCRYPTION_KEY]
);
```

**And Update in Password Reset:**
```javascript
// In api/routes/auth.js - forgot-password endpoint
const userResult = await db.query(
  `SELECT user_id FROM user_personal_info 
   WHERE pgp_sym_decrypt(email_encrypted, $1) = $2`,
  [process.env.ENCRYPTION_KEY, email]
);
```

**Testing Checklist:**
- [ ] Register new user, verify email_encrypted is populated in DB
- [ ] Login with encrypted email, verify decryption works
- [ ] Firebase auth user syncing still works
- [ ] Password reset email lookup works
- [ ] Verify no plaintext email in JSON API responses
- [ ] Check audit logs show successful operation
- [ ] Test with special characters in email (tester+tag@example.com)
- [ ] Verify old plaintext email column can be dropped safely

---

### 1.2 Additional Sensitive Fields Encryption
**Status**: ⏳ TODO | **Time**: 3 hours | **Risk**: LOW | **Blocking**: None (non-critical fields)

**Why This Matters:**
- Phone numbers used for 2FA should be encrypted
- Sex/gender is sensitive personal data
- Familiar names (nicknames) are PII
- Reduces impact if database compromised
- GDPR Article 5: Data minimization principle

**Fields to Encrypt:**
1. `phone_number` → `phone_number_encrypted` (used in 2FA settings)
2. `sex` → `sex_encrypted` (personal profile data)
3. `familiar_name` → `familiar_name_encrypted` (personal preference)

**Database Migration:**
```sql
-- Add encrypted columns to user_personal_info
ALTER TABLE user_personal_info 
ADD COLUMN phone_number_encrypted BYTEA,
ADD COLUMN sex_encrypted BYTEA,
ADD COLUMN familiar_name_encrypted BYTEA;

-- Encrypt existing data (if any)
UPDATE user_personal_info 
SET phone_number_encrypted = pgp_sym_encrypt(phone_number::text, current_setting('app.encryption_key'))
WHERE phone_number IS NOT NULL AND phone_number_encrypted IS NULL;

UPDATE user_personal_info 
SET sex_encrypted = pgp_sym_encrypt(sex, current_setting('app.encryption_key'))
WHERE sex IS NOT NULL AND sex_encrypted IS NULL;

UPDATE user_personal_info 
SET familiar_name_encrypted = pgp_sym_encrypt(familiar_name, current_setting('app.encryption_key'))
WHERE familiar_name IS NOT NULL AND familiar_name_encrypted IS NULL;

-- Add encrypted columns to user_2fa_settings for phone numbers
ALTER TABLE user_2fa_settings 
ADD COLUMN phone_number_encrypted BYTEA,
ADD COLUMN backup_phone_number_encrypted BYTEA;

-- Encrypt phone numbers in 2FA settings
UPDATE user_2fa_settings 
SET phone_number_encrypted = pgp_sym_encrypt(phone_number::text, current_setting('app.encryption_key'))
WHERE phone_number IS NOT NULL AND phone_number_encrypted IS NULL;

UPDATE user_2fa_settings 
SET backup_phone_number_encrypted = pgp_sym_encrypt(backup_phone_number::text, current_setting('app.encryption_key'))
WHERE backup_phone_number IS NOT NULL AND backup_phone_number_encrypted IS NULL;

-- After verification, drop plaintext columns:
-- ALTER TABLE user_personal_info DROP COLUMN phone_number, DROP COLUMN sex, DROP COLUMN familiar_name;
-- ALTER TABLE user_2fa_settings DROP COLUMN phone_number, DROP COLUMN backup_phone_number;
```

**Code Changes Needed:**
- `api/routes/user-profile.js` - Update profile read/write queries
- `api/routes/auth.js` - 2FA phone number handling
- Any place that returns user data to client

**Example Update for User Profile:**
```javascript
// OLD - plaintext
const userResult = await db.query(
  'SELECT phone_number, sex, familiar_name FROM user_personal_info WHERE user_id = $1',
  [userId]
);

// NEW - encrypted
const userResult = await db.query(
  `SELECT 
    pgp_sym_decrypt(phone_number_encrypted, $1) as phone_number,
    pgp_sym_decrypt(sex_encrypted, $1) as sex,
    pgp_sym_decrypt(familiar_name_encrypted, $1) as familiar_name
   FROM user_personal_info WHERE user_id = $2`,
  [process.env.ENCRYPTION_KEY, userId]
);
```

**Testing Checklist:**
- [ ] Update profile with all fields, verify encrypted in DB
- [ ] Read profile back, verify decryption works correctly
- [ ] Test 2FA SMS with encrypted phone number
- [ ] Verify no sensitive data in API responses (should be decrypted for display only)
- [ ] Verify no sensitive data in logs
- [ ] Test with null values (some users may not have set these fields)

---

### 1.3 Verify Encryption Completeness
**Status**: ⏳ TODO | **Time**: 1 hour | **Risk**: LOW | **Blocking**: Phase 2 start

**Comprehensive Plaintext Check:**

Run this query after all migrations to verify NO plaintext PII remains:

```sql
-- Find any PII columns that are NOT encrypted
SELECT table_name, column_name, data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND column_name IN (
  'email', 'phone_number', 'sex', 'familiar_name', 
  'first_name', 'last_name', 'birth_date', 'birth_city',
  'birth_country', 'birth_province', 'birth_timezone'
)
AND data_type NOT LIKE '%bytea%' 
AND table_name LIKE 'user%';

-- EXPECTED RESULT: Empty (no rows returned)
-- If rows are returned, those columns still contain plaintext and need encryption
```

**Verification Tasks:**
- [ ] Run plaintext check query - should return EMPTY
- [ ] Check application logs for any plaintext PII leakage
- [ ] Review error messages - ensure they don't contain plaintext data
- [ ] Verify API responses don't include plaintext PII (decrypted on-the-fly only)
- [ ] Audit database backups are encrypted at rest
- [ ] Document encryption status in SECURITY.md

**Security Audit Checklist:**
```bash
# Verify no plaintext email in database
psql -c "SELECT COUNT(*) FROM user_personal_info 
  WHERE email_encrypted IS NOT NULL AND email IS NULL;"
# Should return: (all users converted)

# Verify encryption key is in environment only, not hardcoded
grep -r "ENCRYPTION_KEY.*=" api/ --exclude-dir=node_modules | grep -v ".env"
# Should return: EMPTY (no hardcoded keys)

# Verify ENCRYPTION_KEY is in .env.example (but not actual value)
grep "ENCRYPTION_KEY" .env.example
# Should show: ENCRYPTION_KEY=<set-this-in-production>
```

---

### ✅ PHASE 1 COMPLETION CRITERIA

**Passing Criteria:**
- [ ] Email field fully encrypted and migrated (email_encrypted populated, plaintext dropped)
- [ ] Additional sensitive fields encrypted (phone, sex, familiar_name)
- [ ] Zero plaintext PII in database (plaintext check query returns empty)
- [ ] All queries updated for encrypted data (auth, profile, 2FA)
- [ ] All encryption queries tested and working
- [ ] Plaintext columns dropped after verification period
- [ ] ENCRYPTION_KEY secured in environment variables
- [ ] No encryption key in git repository

**Validation Commands:**
```bash
# Test login workflow with encrypted email
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password"}'

# Verify encrypted in database (should be BYTEA, not readable)
psql -c "SELECT email_encrypted FROM user_personal_info LIMIT 1;"
# Expected: unreadable bytea data like: \x...

# Verify decrypted on read
curl -X GET http://localhost:3001/user-profile/USER_ID \
  -H "Authorization: Bearer TOKEN"
# Expected: email field shows plaintext in response
```

**Time Estimate**: 6 hours total (email 2h + fields 3h + verify 1h)

---

---

## PHASE 2: APPLICATION SECURITY (Week 2)
**Priority**: 🔴 CRITICAL  
**Goal**: Secure all authentication, prevent network attacks, implement 2FA  
**Current Status**: 🟡 40% COMPLETE  
**Estimated Time**: 8-10 hours total

### 2.1 Security Headers Implementation
**Status**: ⏳ TODO | **Time**: 30 min | **Risk**: LOW | **Blocking**: None

**Why This Matters:**
- CSP prevents XSS/injection attacks
- X-Frame-Options prevents clickjacking (DENY = no iframes allowed)
- X-Content-Type-Options prevents MIME sniffing
- Referrer-Policy protects user privacy
- These are the answers to your original CSP vs X-Frame question!

**Header Recommendations (Answers Your Original Question):**

| Header | Setting | Purpose | Cost |
|--------|---------|---------|------|
| **X-Frame-Options** | `DENY` | Prevent clickjacking by blocking all iframes | Free, zero performance impact |
| **Content-Security-Policy** | `default-src 'self'` | Only allow resources from same origin | Free, prevents XSS injection |
| **X-Content-Type-Options** | `nosniff` | Prevent MIME type sniffing attacks | Free |
| **X-XSS-Protection** | `1; mode=block` | Enable browser XSS filter | Free (legacy, but harmless) |
| **Referrer-Policy** | `strict-origin-when-cross-origin` | Limit referrer data shared | Free |
| **Strict-Transport-Security** | `max-age=31536000; includeSubDomains; preload` | Enforce HTTPS only | Free |

**Implementation in `api/index.js`:**

```javascript
import helmet from 'helmet';

// Add helmet middleware first (sets many secure headers automatically)
app.use(helmet());

// Add custom security headers
app.use((req, res, next) => {
  // Prevent clickjacking attacks (most restrictive: deny all iframes)
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME sniffing attacks
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent XSS attacks (browser built-in protection)
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Limit referrer information shared in outgoing requests
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy: only allow resources from same origin
  // Adjust if you need external fonts, CDNs, Google Analytics, etc.
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  
  // Enforce HTTPS only (already set by helmet + Railway.app, but explicit is good)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  next();
});

// ... rest of your routes
```

**If You Need External Resources (adjust CSP):**

```javascript
// Example: If you use Google Fonts or external CDN
res.setHeader('Content-Security-Policy', 
  "default-src 'self'; " +
  "font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; " +
  "script-src 'self' https://cdn.example.com; " +
  "img-src 'self' data: https:;"
);
```

**Testing Headers:**
```bash
# Verify all headers are present
curl -I https://yourdomain.com | grep -E 'X-Frame|CSP|X-Content|Referrer|Strict'

# Expected output:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
# Content-Security-Policy: default-src 'self'
# Referrer-Policy: strict-origin-when-cross-origin
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

# Test CSP with curl
curl -I -H "Content-Security-Policy: default-src 'self'" https://yourdomain.com
```

**Tasks:**
- [ ] Install/verify helmet package: `npm install helmet`
- [ ] Add helmet middleware to api/index.js
- [ ] Add custom security headers (above)
- [ ] Test headers are returned correctly
- [ ] Test app still works with CSP (no console errors)
- [ ] Check browser dev tools console for CSP violations
- [ ] Document CSP policy in SECURITY.md

---

### 2.2 HTTPS/TLS 1.3 Verification
**Status**: ✅ ASSUMED COMPLETE | **Time**: 20 min | **Risk**: LOW

**Current State:**
- Railway.app has automatic HTTPS/TLS
- Just need to verify it's working and properly configured

**Verification Tasks:**
```bash
# Test 1: HTTPS is enforced
curl -I https://yourdomain.com
# Expected: 200 OK with headers

# Test 2: HTTP redirects to HTTPS
curl -I http://yourdomain.com
# Expected: 301 redirect to https://yourdomain.com

# Test 3: HSTS header is present
curl -I https://yourdomain.com | grep Strict-Transport
# Expected: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

# Test 4: TLS 1.3 is being used (advanced)
openssl s_client -connect yourdomain.com:443 -tls1_3 2>/dev/null | grep "Protocol"
# Expected: shows TLSv1.3
```

**If Not Complete:**
```javascript
// Add to api/index.js if needed
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.header('host')}${req.url}`);
    }
    next();
  });
}
```

---

### 2.3 JWT Token Security: Reduce Expiration & Add Refresh Tokens
**Status**: ⏳ TODO | **Time**: 2.5 hours | **Risk**: MEDIUM | **Blocking**: 2FA

**Current Problem:**
- Access tokens expire after 24 hours (too long - if token stolen, attacker has 24 hours)
- No refresh token rotation (can't revoke without logout)
- No token blacklisting on logout

**Solution:**
- Access tokens: 15 minutes (short-lived)
- Refresh tokens: 7 days (stored in database, can be revoked)
- Clients refresh token every 15 minutes

**Database Schema:**
```sql
-- Store refresh tokens (so we can revoke them)
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_personal_info(user_id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,  -- Hash of the JWT token
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  UNIQUE(user_id, token_hash)
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
```

**Update `api/middleware/auth.js`:**

```javascript
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_TOKEN_EXPIRY = '15m';      // Short-lived access token
const REFRESH_TOKEN_EXPIRY = '7d';      // Longer-lived refresh token

// Generate access token (short expiry)
export function generateToken(userId, requiresOTP = false) {
  return jwt.sign(
    { userId, requiresOTP },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY, algorithm: 'HS256' }
  );
}

// Generate refresh token (long expiry, will be stored in DB)
export function generateRefreshToken(userId) {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production',
    { expiresIn: REFRESH_TOKEN_EXPIRY, algorithm: 'HS256' }
  );
}

// Hash refresh token for storage
export function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Middleware to verify access token
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}
```

**Update Login in `api/routes/auth.js`:**

```javascript
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return validationError(res, 'Email and password required' );
    }

    // Find user by encrypted email
    const userResult = await db.query(
      `SELECT user_id, password_hash FROM user_personal_info 
       WHERE pgp_sym_decrypt(email_encrypted, $1) = $2`,
      [process.env.ENCRYPTION_KEY, email]
    );

    if (userResult.rows.length === 0) {
      await logAudit(db, {
        action: 'LOGIN_FAILED',
        resourceType: 'authentication',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        status: 'FAILURE',
        details: { reason: 'USER_NOT_FOUND' }
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    // Verify password
    const passwordMatch = await comparePassword(password, user.password_hash);
    if (!passwordMatch) {
      await logAudit(db, {
        userId: user.user_id,
        action: 'LOGIN_FAILED',
        resourceType: 'authentication',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        status: 'FAILURE',
        details: { reason: 'INVALID_PASSWORD' }
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = generateToken(user.user_id);
    const refreshToken = generateRefreshToken(user.user_id);
    const tokenHash = hashRefreshToken(refreshToken);

    // Store refresh token in database
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.user_id, tokenHash, expiresAt]
    );

    // Log successful login
    await logAudit(db, {
      userId: user.user_id,
      action: 'LOGIN_SUCCESS',
      resourceType: 'authentication',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS'
    });

    return res.json({
      success: true,
      userId: user.user_id,
      accessToken,
      refreshToken,
      expiresIn: '15m'
    });
  } catch (error) {
    console.error('Login error:', error);
    return serverError(res, 'Login failed' });
  }
});
```

**Add Token Refresh Endpoint in `api/routes/auth.js`:**

```javascript
router.post('/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    // Verify refresh token JWT
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Check if token exists in database and is not revoked
    const tokenHash = hashRefreshToken(refreshToken);
    const tokenRecord = await db.query(
      `SELECT * FROM refresh_tokens 
       WHERE user_id = $1 AND token_hash = $2 AND revoked = false AND expires_at > NOW()`,
      [decoded.userId, tokenHash]
    );

    if (tokenRecord.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or revoked refresh token' });
    }

    // Generate new access token
    const newAccessToken = generateToken(decoded.userId);

    // Log audit
    await logAudit(db, {
      userId: decoded.userId,
      action: 'TOKEN_REFRESHED',
      resourceType: 'authentication',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS'
    });

    return res.json({
      success: true,
      accessToken: newAccessToken,
      expiresIn: '15m'
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return serverError(res, 'Token refresh failed' });
  }
});
```

**Add Logout (Revoke Token) in `api/routes/auth.js`:**

```javascript
router.post('/auth/logout', authenticateToken, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      const tokenHash = hashRefreshToken(refreshToken);
      // Mark refresh token as revoked
      await db.query(
        `UPDATE refresh_tokens SET revoked = true 
         WHERE user_id = $1 AND token_hash = $2`,
        [req.user.userId, tokenHash]
      );
    }

    // Log audit
    await logAudit(db, {
      userId: req.user.userId,
      action: 'LOGOUT',
      resourceType: 'authentication',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS'
    });

    return res.json({ 
      success: true,
      message: 'Logged out successfully' 
    });
  } catch (error) {
    console.error('Logout error:', error);
    return serverError(res, 'Logout failed' );
  }
});
```

**Client-Side Token Management in `client/src/services/api.js`:**

```javascript
// Store tokens securely
export function setTokens(accessToken, refreshToken) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

export function getAccessToken() {
  return localStorage.getItem('accessToken');
}

export function getRefreshToken() {
  return localStorage.getItem('refreshToken');
}

export function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

// Intercept 401 errors and refresh token
export async function makeAuthenticatedRequest(url, options = {}) {
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${getAccessToken()}`
    }
  });

  if (response.status === 401) {
    const errorData = await response.json();
    
    // Only refresh if token expired, not other auth errors
    if (errorData.code === 'TOKEN_EXPIRED') {
      const refreshResponse = await fetch('/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: getRefreshToken() })
      });

      if (refreshResponse.ok) {
        const { accessToken } = await refreshResponse.json();
        localStorage.setItem('accessToken', accessToken);

        // Retry original request with new token
        response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${accessToken}`
          }
        });
      } else {
        // Refresh failed, user must login again
        clearTokens();
        window.location.href = '/login';
        return null;
      }
    }
  }

  return response;
}