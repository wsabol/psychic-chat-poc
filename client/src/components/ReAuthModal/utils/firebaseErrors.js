/**
 * Firebase error code mapping utility
 * Centralized error handling for authentication errors
 */

export const getFirebaseErrorMessage = (errorCode, t) => {
  const errorMap = {
    'auth/popup-closed-by-user': t('security.reauth.errorPopupClosed'),
    'auth/popup-blocked': t('security.reauth.errorPopupBlocked'),
    'auth/wrong-password': t('security.reauth.errorWrongPassword'),
    'auth/user-mismatch': t('security.reauth.errorUserMismatch'),
    'auth/user-not-found': t('security.reauth.errorUserNotFound'),
    'auth/invalid-email': t('security.reauth.errorInvalidEmail'),
    'auth/too-many-requests': t('security.reauth.errorTooManyRequests'),
    'auth/network-request-failed': t('security.reauth.errorNetworkFailed'),
  };

  return errorMap[errorCode] || t('security.reauth.errorAuthFailed');
};

export const shouldSkipFailureCallback = (errorCode) => {
  // Don't call onFailure for user-initiated cancellations
  return errorCode === 'auth/popup-closed-by-user';
};
