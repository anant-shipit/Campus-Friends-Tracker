// PWA auto-update utility.
// - Listens for new service worker activation and reloads the page.
// - Periodically checks for SW updates (every 60 minutes) for long-lived sessions.

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Call once from main.jsx after rendering the app.
 * Sets up service worker update detection and auto-reload.
 */
export function setupPWAUpdater() {
  if (!('serviceWorker' in navigator)) return;

  // When a new service worker takes over, reload to pick up new assets.
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    console.log('[PWA] New service worker activated — reloading for update.');
    window.location.reload();
  });

  // Periodically ask the browser to check for a new SW (for users who
  // keep the app open for hours without navigating away).
  navigator.serviceWorker.ready.then((registration) => {
    setInterval(() => {
      registration.update().catch((err) => {
        console.warn('[PWA] Periodic update check failed:', err);
      });
    }, UPDATE_CHECK_INTERVAL_MS);
  });
}
