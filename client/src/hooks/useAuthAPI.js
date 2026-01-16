/**
 * useAuthAPI Hook - FIXED VERSION
 * Handles all API calls for auth, registration, and consent
 */

const API_BASE = 'http://localhost:3000';

export function useAuthAPI() {
  
  /**
   * Create database user record after Firebase account created
   */
  const createDatabaseUser = async (userId, email, token) => {
    try {
      const dbResponse = await fetch(`${API_BASE}/auth/register-firebase-user`, {
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
        logErrorFromCatch('[AUTH-DB] ✗ Database record creation failed:', errorData);
        return false;
      }
    } catch (dbErr) {
      logErrorFromCatch('[AUTH-DB] ✗ Could not create database record:', dbErr.message);
      return false;
    }
  };

  /**
   * Record user consent - MUST SUCCEED or throw error
   * This is critical for legal compliance
   */
  const recordConsent = async (userId, termsAccepted, privacyAccepted, token) => {
    try {
      
      const consentResponse = await fetch(`${API_BASE}/auth/record-consent/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          terms_accepted: termsAccepted,
          privacy_accepted: privacyAccepted
        })
      });

      const responseData = await consentResponse.json();
      
      if (!consentResponse.ok) {
        logErrorFromCatch('[CONSENT] ✗ Failed to record consent:', responseData);
        throw new Error(responseData.error || 'Failed to record consent');
      }

      return true;
    } catch (consentErr) {
      logErrorFromCatch('[CONSENT] ✗ CRITICAL: Could not record consent:', consentErr.message);
      throw consentErr; // THROW - don't silently fail
    }
  };

  /**
   * Check user consent status
   */
  const checkConsent = async (userId, token) => {
    try {
      const response = await fetch(`${API_BASE}/auth/check-consent/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      return data;
    } catch (err) {
      logErrorFromCatch('[CONSENT-CHECK] ✗ Error checking consent:', err.message);
      return {
        hasConsent: false,
        terms_accepted: false,
        privacy_accepted: false,
        error: err.message
      };
    }
  };

  /**
   * Save T&C acceptance - legacy, now uses recordConsent
   */
  const saveTermsAcceptance = async (userId, termsAccepted, privacyAccepted, token) => {
    // Delegate to recordConsent which throws on error
    return await recordConsent(userId, termsAccepted, privacyAccepted, token);
  };

  /**
   * Check if user's email is verified
   */
  const checkEmailVerification = async (user) => {
    try {
      await user.reload();
      return user.emailVerified;
    } catch (err) {
      return false;
    }
  };

  /**
   * Log login success to audit
   */
    const logLoginSuccess = async (userId, email) => {
    fetch(`${API_BASE}/auth/log-login-success`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, email })
    }).catch(() => {});
  };

  return {
    createDatabaseUser,
    recordConsent,
    checkConsent,
    saveTermsAcceptance,
    checkEmailVerification,
    logLoginSuccess
  };
}

export default useAuthAPI;

