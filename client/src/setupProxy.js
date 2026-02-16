/**
 * Custom webpack dev server configuration
 * This file configures the React dev server to allow Stripe popups
 * 
 * CRITICAL: COOP must be DISABLED in development for Stripe to work
 * Even 'same-origin-allow-popups' causes issues with Stripe iframes and popups
 */

module.exports = function(app) {
  // Set custom headers on all responses from dev server
  app.use((req, res, next) => {
    // ✅ CRITICAL FIX: Remove COOP entirely in development
    // Stripe requires no COOP restrictions for iframes/popups to function
    // In production, your hosting platform should set appropriate COOP headers
    res.removeHeader('Cross-Origin-Opener-Policy');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    next();
  });
};
