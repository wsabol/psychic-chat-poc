/* eslint-disable no-restricted-globals */
/**
 * service-worker.js — CRA InjectManifest-compatible service worker
 *
 * CRA's InjectManifest plugin replaces the `self.__WB_MANIFEST` token at build
 * time with the list of hashed, versioned assets to precache.  This file is the
 * custom SW entry-point declared in package.json → "workbox" → "swSrc".
 *
 * Routing table
 * ─────────────
 * 1. Never-cache pass-through  → Firebase, Stripe, hCaptcha, /api/*
 * 2. Navigation requests        → App-shell (cached index.html) + offline fallback
 * 3. Images                     → CacheFirst  (30-day TTL, 200-entry cap)
 * 4. JS/CSS bundles             → StaleWhileRevalidate
 * 5. Precache manifest          → precacheAndRoute(self.__WB_MANIFEST)
 */

import { clientsClaim } from 'workbox-core';
import {
  precacheAndRoute,
  createHandlerBoundToURL,
} from 'workbox-precaching';
import { registerRoute, NavigationRoute, setCatchHandler } from 'workbox-routing';
import {
  NetworkOnly,
  CacheFirst,
  StaleWhileRevalidate,
} from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// ─── Core behaviour ──────────────────────────────────────────────────────────

// Take control of all in-scope clients as soon as the new SW activates.
clientsClaim();

// ─── Precache (CRA injects the hashed asset manifest here at build time) ─────

precacheAndRoute(self.__WB_MANIFEST);

// ─── Never-cache pass-through patterns ───────────────────────────────────────
// Firebase auth & DB, Stripe, hCaptcha, and all backend API calls must always
// go to the network; stale data here would break auth, billing, and chat.

const PASSTHROUGH_PATTERNS = [
  // Firebase
  /firebase\.googleapis\.com/,
  /firebaseio\.com/,
  /identitytoolkit\.googleapis\.com/,
  /securetoken\.googleapis\.com/,
  // Stripe
  /js\.stripe\.com/,
  /api\.stripe\.com/,
  // hCaptcha
  /hcaptcha\.com/,
];

PASSTHROUGH_PATTERNS.forEach((pattern) => {
  registerRoute(pattern, new NetworkOnly());
});

// /api/* — backend REST calls (chat, billing, auth) — never cache.
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkOnly()
);

// ─── PDF files → NetworkOnly (MUST come before the NavigationRoute) ───────────
// All legal-document PDFs live in the public folder and are served by
// S3 / CloudFront.  We must NOT let the NavigationRoute hand these requests the
// cached index.html — doing so causes the React app to load, fail to match the
// PDF path, and redirect the user to the login page instead of showing the
// document.  Registering a NetworkOnly route here, before the NavigationRoute,
// ensures PDF navigation requests bypass the app-shell handler entirely.

registerRoute(
  ({ url }) => /\.pdf$/i.test(url.pathname),
  new NetworkOnly()
);

// ─── Navigation requests → App Shell ─────────────────────────────────────────
// Serve the pre-cached index.html for every navigation so the React app boots
// offline.  React itself then handles any "offline" UI state in the browser.
//
// IMPORTANT: the denylist explicitly excludes .pdf paths so the NavigationRoute
// can never intercept a PDF navigation and return the app-shell HTML.  Belt-
// and-suspenders alongside the NetworkOnly PDF route above — in practice the
// denylist alone is sufficient because a denied navigation falls straight
// through to the network (CloudFront → S3) which correctly returns the PDF.

const appShellHandler = createHandlerBoundToURL('/index.html');
registerRoute(new NavigationRoute(appShellHandler, {
  denylist: [/\.pdf$/i],
}));

// ─── Images → CacheFirst ──────────────────────────────────────────────────────
// Tarot cards, icons, and logo images change rarely; cache aggressively.

registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// ─── JS / CSS bundles → StaleWhileRevalidate ─────────────────────────────────
// Belt-and-suspenders for any chunk that isn't already covered by the precache
// manifest (e.g. dynamically-loaded code-split chunks on old clients).

registerRoute(
  ({ request }) =>
    request.destination === 'script' || request.destination === 'style',
  new StaleWhileRevalidate({
    cacheName: 'static-resources',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// ─── Offline fallback ─────────────────────────────────────────────────────────
// If the app shell itself cannot be served (extreme edge case — the shell is
// precached, so this is truly last-resort only), return /offline.html.

// ─── Force immediate SW activation (skip the waiting phase) ──────────────────
// Without skipWaiting(), a new SW sits in 'waiting' state until ALL tabs using
// the old SW are closed.  Microsoft Edge's "Startup Boost" and "Continue where
// you left off" features keep the old SW client alive indefinitely — so the old
// cached JS bundle never gets replaced on Edge, even after new deployments.
// self.skipWaiting() causes the new SW to activate immediately, then
// clientsClaim() (above) hands it control of all open clients.  The
// serviceWorkerRegistration.js controllerchange listener then reloads the page
// so the new JS bundle is served right away.

self.addEventListener('install', (event) => {
  self.skipWaiting(); // ← Activate immediately; don't wait for old tabs to close
  event.waitUntil(
    caches.open('offline-fallback').then((cache) =>
      cache.addAll(['/offline.html'])
    )
  );
});

// ─── SKIP_WAITING message (programmatic trigger from the app) ─────────────────
// serviceWorkerRegistration.js sends { type: 'SKIP_WAITING' } when it detects
// a waiting SW via the onUpdate callback.  Belt-and-suspenders alongside the
// unconditional skipWaiting() above.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

setCatchHandler(async ({ event }) => {
  if (event.request.destination === 'document') {
    const cache = await caches.open('offline-fallback');
    return (await cache.match('/offline.html')) || Response.error();
  }
  return Response.error();
});
