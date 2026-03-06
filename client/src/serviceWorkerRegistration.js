/**
 * serviceWorkerRegistration.js — CRA-style service-worker registration helper
 *
 * Only registers in production mode.
 * Validates the SW URL on localhost before registering (so local prod builds
 * can still be tested, but a mismatched SW never silently takes over).
 *
 * Callbacks
 * ──────────
 *   config.onUpdate(registration)  — called when a waiting SW is available;
 *                                    use to show a "New version — click to update" toast.
 *   config.onSuccess(registration) — called after the first successful cache fill.
 */

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    // [::1] is the IPv6 localhost address.
    window.location.hostname === '[::1]' ||
    // 127.0.0.0/8 are considered localhost for IPv4.
    window.location.hostname.match(
      /^127(?:\.(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})){3}$/
    )
);

/**
 * Register the service worker.
 *
 * @param {{ onUpdate?: Function, onSuccess?: Function }} [config]
 */
export function register(config) {
  if (process.env.NODE_ENV !== 'production') return;
  if (!('serviceWorker' in navigator)) return;

  // The public URL might be on a different origin (CDN). The SW can only
  // control pages on its own origin, so bail if that's the case.
  const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
  if (publicUrl.origin !== window.location.origin) return;

  window.addEventListener('load', () => {
    const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

    if (isLocalhost) {
      // Running on localhost: verify the SW still exists before registering.
      checkValidServiceWorker(swUrl, config);

      // Extra logging to help developers understand what's happening.
      navigator.serviceWorker.ready.then(() => {
        console.log(
          '[SW] This web app is being served cache-first by a service worker. ' +
            'To learn more, visit https://cra.link/PWA'
        );
      });
    } else {
      // Non-localhost: just register the SW straight away.
      registerValidSW(swUrl, config);
    }
  });
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function registerValidSW(swUrl, config) {
  // ── controllerchange → reload ───────────────────────────────────────────
  // When a new SW takes control of this page (after skipWaiting() activates
  // it), reload so the fresh JS bundle is executed instead of the stale
  // in-memory one.  The guard prevents an infinite reload loop.
  //
  // Only attach the listener when there is already a controller — that means
  // this is a returning visitor, not a first install.  On first install there
  // is nothing to reload; on update the reload gives the user the latest code.
  //
  // Edge-specific: Edge's "Startup Boost" / "Continue where you left off"
  // keeps old SW clients alive indefinitely.  Without this reload the new JS
  // never runs even though the new SW is active.
  let swUpdateRefreshing = false;
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!swUpdateRefreshing) {
        swUpdateRefreshing = true;
        console.log('[SW] New version activated — reloading for latest code.');
        window.location.reload();
      }
    });
  }

  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.onstatechange = () => {
          if (installingWorker.state !== 'installed') return;

          if (navigator.serviceWorker.controller) {
            // A new version has been installed.
            // skipWaiting() in the SW will activate it immediately, which
            // fires controllerchange, which triggers the reload above.
            // Send SKIP_WAITING as a belt-and-suspenders fallback in case
            // the SW's own install-time skipWaiting() didn't fire (e.g. an
            // older cached SW file without the skipWaiting() call).
            console.log('[SW] New content available — sending SKIP_WAITING.');
            if (installingWorker.state === 'installed' && registration.waiting) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            if (config && typeof config.onUpdate === 'function') {
              config.onUpdate(registration);
            }
          } else {
            // Everything has been pre-cached for offline use.
            console.log('[SW] Content is cached for offline use.');
            if (config && typeof config.onSuccess === 'function') {
              config.onSuccess(registration);
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error('[SW] Error during service worker registration:', error);
    });
}

function checkValidServiceWorker(swUrl, config) {
  // Check that the SW file can actually be found.  If it can't, reload the page.
  fetch(swUrl, { headers: { 'Service-Worker': 'script' } })
    .then((response) => {
      const contentType = response.headers.get('content-type');

      if (
        response.status === 404 ||
        (contentType != null && !contentType.includes('javascript'))
      ) {
        // SW not found — probably a different app at this URL. Reload without it.
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => window.location.reload());
        });
      } else {
        // SW file found — proceed with registration.
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log('[SW] No internet connection found. App is running in offline mode.');
    });
}

/**
 * Unregister all service workers for this origin.
 * Useful during development or if you want to opt out of offline support.
 */
export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => registration.unregister())
      .catch((error) => console.error(error.message));
  }
}
