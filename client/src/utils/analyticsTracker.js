/**
 * Anonymous Analytics Tracker
 * Tracks app usage WITHOUT storing user IDs
 * User can disable via Settings toggle
 */

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
let sessionStartTime = Date.now();

/**
 * Check if analytics is enabled in Settings
 */
function isAnalyticsEnabled() {
  return localStorage.getItem('analyticsEnabled') !== 'false';
}

/**
 * Parse user agent to extract browser and OS info
 */
function parseUserAgent(userAgent) {
  let browserName = 'Unknown';
  let browserVersion = 'Unknown';
  let osName = 'Unknown';
  let osVersion = 'Unknown';
  let deviceType = 'desktop';

  // Detect Device Type
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
    deviceType = 'mobile';
  } else if (/ipad|android/i.test(userAgent)) {
    deviceType = 'tablet';
  }

  // Detect Browser
  if (/Chrome/.test(userAgent) && !/Chromium/.test(userAgent)) {
    browserName = 'Chrome';
    browserVersion = userAgent.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
  } else if (/Safari/.test(userAgent)) {
    browserName = 'Safari';
    browserVersion = userAgent.match(/Version\/(\d+)/)?.[1] || 'Unknown';
  } else if (/Firefox/.test(userAgent)) {
    browserName = 'Firefox';
    browserVersion = userAgent.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
  } else if (/Edge/.test(userAgent) || /Edg/.test(userAgent)) {
    browserName = 'Edge';
    browserVersion = userAgent.match(/Edg[e]?\/(\d+)/)?.[1] || 'Unknown';
  } else if (/MSIE|Trident/.test(userAgent)) {
    browserName = 'Internet Explorer';
    browserVersion = userAgent.match(/MSIE (\d+)|rv:(\d+)/)?.[1] || 'Unknown';
  }

  // Detect OS
  if (/Windows NT/.test(userAgent)) {
    osName = 'Windows';
    osVersion = userAgent.match(/Windows NT ([\d.]+)/)?.[1] || 'Unknown';
  } else if (/Macintosh/.test(userAgent)) {
    osName = 'macOS';
    osVersion = userAgent.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, '.') || 'Unknown';
  } else if (/Linux/.test(userAgent)) {
    osName = 'Linux';
    osVersion = 'Unknown';
  } else if (/iPhone|iPad|iPod/.test(userAgent)) {
    osName = 'iOS';
    osVersion = userAgent.match(/OS (\d+_\d+)/)?.[1]?.replace(/_/g, '.') || 'Unknown';
  } else if (/Android/.test(userAgent)) {
    osName = 'Android';
    osVersion = userAgent.match(/Android ([\d.]+)/)?.[1] || 'Unknown';
  }

  return {
    browserName,
    browserVersion,
    osName,
    osVersion,
    deviceType,
  };
}

/**
 * Calculate user age from birthdate
 */
function calculateAge(birthDateString) {
  if (!birthDateString) return null;
  
  try {
    const birthDate = new Date(birthDateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age >= 0 ? age : null;
  } catch (e) {
    return null;
  }
}

/**
 * Log an analytics event
 */
export async function trackEvent(eventType, pageName, eventAction = null, sessionDurationMs = null, errorData = null) {
  if (!isAnalyticsEnabled()) {
    return; // User disabled analytics
  }

  try {
    const userAgent = navigator.userAgent;
    const { browserName, browserVersion, osName, osVersion, deviceType } = parseUserAgent(userAgent);

    // Calculate session duration if not provided
    const duration = sessionDurationMs || (Date.now() - sessionStartTime);

    const payload = {
      event_type: eventType,
      page_name: pageName,
      event_action: eventAction,
      user_agent: userAgent,
      browser_name: browserName,
      browser_version: browserVersion,
      os_name: osName,
      os_version: osVersion,
      device_type: deviceType,
      session_duration_ms: duration,
      error_message: errorData?.message || null,
      error_stack: errorData?.stack || null,
    };

    // Send to backend
    await fetch(`${API_URL}/analytics/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      // Don't include auth token - truly anonymous
    });
  } catch (error) {
    console.error('[ANALYTICS] Error tracking event:', error);
    // Fail silently - don't break app functionality
  }
}

/**
 * Track page view
 */
export function trackPageView(pageName) {
  trackEvent('page_view', pageName);
}

/**
 * Track user action/click
 */
export function trackAction(pageName, actionName) {
  trackEvent('click', pageName, actionName);
}

/**
 * Track error
 */
export function trackError(pageName, error) {
  trackEvent('error', pageName, 'error_occurred', null, {
    message: error.message || 'Unknown error',
    stack: error.stack || null,
  });
}

/**
 * Track session end
 */
export function trackSessionEnd(pageName) {
  const sessionDuration = Date.now() - sessionStartTime;
  trackEvent('session_end', pageName, null, sessionDuration);
}

/**
 * Initialize analytics on app load
 */
export function initializeAnalytics() {
  sessionStartTime = Date.now();
  
  // Default to enabled if not set
  if (localStorage.getItem('analyticsEnabled') === null) {
    localStorage.setItem('analyticsEnabled', 'true');
  }
  
  if (isAnalyticsEnabled()) {
  } else {
  }

  // Track page unload
  window.addEventListener('beforeunload', () => {
    // Get current page
    const currentPage = window.location.pathname;
    trackSessionEnd(currentPage);
  });
}

/**
 * Set analytics enabled/disabled (called from Settings toggle)
 */
export function setAnalyticsEnabled(enabled) {
  localStorage.setItem('analyticsEnabled', enabled.toString());
}

