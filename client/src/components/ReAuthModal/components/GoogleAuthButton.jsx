import React from 'react';
import styles from '../ReAuthModal.module.css';

/**
 * GoogleAuthButton - Google Sign-in button
 * Extracted component for better organization
 */
export function GoogleAuthButton({ loading, onGoogleReAuth, t }) {
  return (
    <button
      onClick={onGoogleReAuth}
      disabled={loading}
      className={styles.googleButton}
    >
      <img
        src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48cGF0aCBkPSJNMTcuNiA5LjJsLS4xLTEuOEg5djMuNGg0LjhDMTMuNiAxIDMuMzIgMTMgMTIgMTMuNnYyLjJIOXYuMkM1LjMgMTUuNSAyIDEyLjkgMiA5YzAtMy41IDIuNi02LjcgNi41LTYuN2gyLjdWMnoiIGZpbGw9IiM0Mjg1RjQiIGZpbGwtcnVsZT0ibm9uemVybyIvPjwvZz48L3N2Zz4="
        alt="Google"
        className={styles.googleIcon}
      />
      {loading ? t('security.reauth.googleSigningIn') : t('security.reauth.googleSignIn')}
    </button>
  );
}
