/**
 * Cookie Manager - Enforces cookie settings
 * Clears, blocks, and manages cookies based on user preferences
 */

/**
 * Clear all non-essential cookies
 * Keeps only: auth tokens, session cookies, Firebase cookies
 */
export function clearNonEssentialCookies() {
  const essentialCookies = [
    '__session',           // Firebase session
    'FIREBASE_',           // Firebase auth tokens
    '__firebase',          // Firebase
    '_ga',                 // Keep analytics if separately enabled (handled by analytics toggle)
  ];

  // Get all cookies
  const allCookies = document.cookie.split('; ');

  allCookies.forEach(cookie => {
    const cookieName = cookie.split('=')[0];

    // Check if this is an essential cookie
    const isEssential = essentialCookies.some(essential => 
      cookieName.includes(essential)
    );

    // Delete if not essential
    if (!isEssential) {
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${window.location.hostname}; path=/;`;
    }
  });

  console.log('[COOKIES] Non-essential cookies cleared');
}

/**
 * Check if cookies are enabled in settings
 */
export function areCookiesEnabled() {
  return localStorage.getItem('cookiesEnabled') !== 'false';
}

/**
 * Set a cookie only if user has enabled cookies
 * Returns false if cookies are disabled - prevents cookie from being set
 */
export function setTrackerCookie(name, value, days = 365) {
  if (!areCookiesEnabled()) {
    console.log(`[COOKIES] Blocked: ${name} (cookies disabled)`);
    return false;
  }

  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
  return true;
}

/**
 * Get a cookie value only if cookies are enabled
 */
export function getTrackerCookie(name) {
  if (!areCookiesEnabled()) {
    return null;
  }

  const nameEQ = name + '=';
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.indexOf(nameEQ) === 0) {
      return cookie.substring(nameEQ.length);
    }
  }
  return null;
}

/**
 * Delete a tracker cookie
 */
export function deleteTrackerCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  console.log(`[COOKIES] Deleted: ${name}`);
}

/**
 * Initialize cookie manager on app load
 * If cookies disabled, clear all non-essential cookies
 */
export function initializeCookieManager() {
  if (!areCookiesEnabled()) {
    clearNonEssentialCookies();
  }
  console.log(`[COOKIES] Manager initialized. Cookies ${areCookiesEnabled() ? 'enabled' : 'disabled'}`);
}
