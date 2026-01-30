/**
 * Main useAuth hook - Composes all auth sub-hooks
 * Maintains 100% backward compatibility with all existing code
 */
import { useAuthState } from './auth/useAuthState';
import { useAuthBilling } from './auth/useAuthBilling';
import { useAuthTwoFactor } from './auth/useAuthTwoFactor';
import { useAuthSession } from './auth/useAuthSession';

export function useAuth() {
  // Billing sub-hook (needed first for checkBillingStatus dependency)
  const billingHook = useAuthBilling();

  // Auth state sub-hook (depends on checkBillingStatus)
  const stateHook = useAuthState(billingHook.checkBillingStatus);

  // 2FA sub-hook
  const twoFAHook = useAuthTwoFactor();

  // Session sub-hook
  const sessionHook = useAuthSession();

  // Enhance verify2FA with additional dependencies
  const verify2FA = async (code, trustDevice = false) => {
    // CRITICAL: Pass the method parameter so backend knows SMS vs Email  
    return await twoFAHook.verify2FA(
      code,
      stateHook.tempToken,  // ✅ FIXED: Should use stateHook.tempToken
      stateHook.tempUserId,  // ✅ FIXED: Should use stateHook.tempUserId
      stateHook.complete2FA,
      stateHook.token,
      stateHook.authUserId,
      trustDevice,  // ✅ NEW: Pass trustDevice flag through
      stateHook.twoFactorMethod  // ✅ CRITICAL: Pass method parameter
    );
  };

  // Enhance handleLogout to reset all state
  const handleLogout = async () => {
    await sessionHook.handleLogout();
    stateHook.resetAuthState();
    twoFAHook.reset2FAState();
    billingHook.resetBillingState();
    sessionHook.setHasLoggedOut(true);
  };

  // Merge all hooks into single object for backward compatibility
  return {
    // Auth state
    isAuthenticated: stateHook.isAuthenticated,
    isTemporaryAccount: stateHook.isTemporaryAccount,
    token: stateHook.token,
    authUserId: stateHook.authUserId,
    authEmail: stateHook.authEmail,
    loading: stateHook.loading,
    isFirstTime: stateHook.isFirstTime,
    emailVerified: stateHook.emailVerified,
    setEmailVerified: stateHook.setEmailVerified,  // ✅ NEW: Expose for email verification polling
    isEmailUser: stateHook.isEmailUser,

    // 2FA
    showTwoFactor: stateHook.showTwoFactor,
    setShowTwoFactor: stateHook.setShowTwoFactor,
    tempToken: stateHook.tempToken,  // ✅ FIXED: Should come from stateHook, not twoFAHook
    tempUserId: stateHook.tempUserId,  // ✅ FIXED: Should come from stateHook, not twoFAHook
    twoFactorMethod: stateHook.twoFactorMethod,
    error: twoFAHook.error,
    setError: twoFAHook.setError,
    verify2FA,

    // Session & Logout
    hasLoggedOut: sessionHook.hasLoggedOut,
    setHasLoggedOut: sessionHook.setHasLoggedOut,
    isDevUserLogout: sessionHook.isDevUserLogout,
    setIsDevUserLogout: sessionHook.setIsDevUserLogout,
    handleLogout,
    resetAuthState: stateHook.resetAuthState,
    refreshEmailVerificationStatus: sessionHook.refreshEmailVerificationStatus,
    createTemporaryAccount: () => sessionHook.createTemporaryAccount(stateHook.setLoading),
    deleteTemporaryAccount: () => sessionHook.deleteTemporaryAccount(stateHook.isTemporaryAccount),
    exitApp: () => sessionHook.exitApp(stateHook.isTemporaryAccount),

    // Billing
    hasActiveSubscription: billingHook.hasActiveSubscription,
    subscriptionChecking: billingHook.subscriptionChecking,
    hasValidPaymentMethod: billingHook.hasValidPaymentMethod,
    paymentMethodChecking: billingHook.paymentMethodChecking,
    recheckSubscriptionOnly: billingHook.recheckSubscriptionOnly,

    // Legacy (kept for compatibility but not used)
    showLoginRegister: false,
    setShowLoginRegister: () => {},
    showForgotPassword: false,
    setShowForgotPassword: () => {},
    showEmailVerification: false,
    setShowEmailVerification: () => {},
  };
}
