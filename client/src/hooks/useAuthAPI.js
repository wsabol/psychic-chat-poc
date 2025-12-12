/**
 * useAuthAPI Hook
 * Handles all API calls for auth, registration, and consent
 */

export function useAuthAPI() {
  
  /**
   * Create database user record after Firebase account created
   */
  const createDatabaseUser = async (userId, email, token) => {
    try {
      const dbResponse = await fetch('http://localhost:3000/auth/register-firebase-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          email
        })
      });

      if (dbResponse.ok) {
        return true;
      } else {
        const errorData = await dbResponse.json();
        console.warn('[AUTH-DB] ⚠️ Database record creation failed:', errorData);
        return false;
      }
    } catch (dbErr) {
      console.warn('[AUTH-DB] ⚠️ Could not create database record:', dbErr.message);
      return false;
    }
  };

  /**
   * Save T&C acceptance with encrypted IP
   */
  const saveTermsAcceptance = async (userId, termsAccepted, privacyAccepted, token) => {
    try {
      const consentResponse = await fetch('http://localhost:3000/auth/consent/terms-acceptance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          terms_accepted: termsAccepted,
          privacy_accepted: privacyAccepted,
          ip_address: 'auto-detected'
        })
      });

      if (consentResponse.ok) {
        return true;
      } else {
        console.warn('[CONSENT] ⚠️ Failed to record T&C acceptance:', await consentResponse.json());
        return false;
      }
    } catch (consentErr) {
      console.warn('[CONSENT] ⚠️ Could not record T&C acceptance:', consentErr.message);
      return false;
    }
  };

  /**
   * Check if user's email is verified
   */
  const checkEmailVerification = async (user) => {
    try {
      await user.reload();
      return user.emailVerified;
    } catch (err) {
      console.warn('[EMAIL-VERIFY] Error checking status:', err);
      return false;
    }
  };

  /**
   * Log login success to audit
   */
  const logLoginSuccess = async (userId, email) => {
    fetch('http://localhost:3000/auth/log-login-success', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, email })
    }).catch(err => console.warn('[AUDIT] Login log skipped'));
  };

  return {
    createDatabaseUser,
    saveTermsAcceptance,
    checkEmailVerification,
    logLoginSuccess
  };
}

export default useAuthAPI;
