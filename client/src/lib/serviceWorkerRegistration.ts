// This optional code is used to register a service worker.
// register() is not called by default.

import { Workbox } from 'workbox-window';

// This lets the app load faster on subsequent visits in production, and gives
// it offline capabilities. However, it also means that developers (and users)
// will only see deployed updates on subsequent visits to a page, after all the
// existing tabs open on the page have been closed, since previously cached
// resources are updated in the background.

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    // [::1] is the IPv6 localhost address.
    window.location.hostname === '[::1]' ||
    // 127.0.0.0/8 are considered localhost for IPv4.
    window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

type Config = {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
};

export function register(config?: Config): void {
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    // The URL constructor is available in all browsers that support SW.
    const publicUrl = new URL(window.location.href);
    
    window.addEventListener('load', () => {
      const swUrl = '/sw.js';

      if (isLocalhost) {
        // This is running on localhost. Check if a service worker still exists or not.
        checkValidServiceWorker(swUrl, config);

        // Add some additional logging to localhost, pointing developers to the
        // service worker/PWA documentation.
        navigator.serviceWorker.ready.then(() => {
          console.log(
            'This web app is being served cache-first by a service ' +
              'worker. To learn more, visit https://cra.link/PWA'
          );
        });
      } else {
        // Is not localhost. Just register service worker
        registerValidSW(swUrl, config);
      }
    });
  }
}

function registerValidSW(swUrl: string, config?: Config): void {
  try {
    const wb = new Workbox(swUrl);
    
    wb.addEventListener('installed', event => {
      if (event.isUpdate) {
        console.log('New content is available; please refresh.');
        const onUpdate = config?.onUpdate;
        if (onUpdate) {
          navigator.serviceWorker.ready.then(registration => {
            onUpdate(registration);
          });
        }
      } else {
        console.log('Content is cached for offline use.');
        const onSuccess = config?.onSuccess;
        if (onSuccess) {
          navigator.serviceWorker.ready.then(registration => {
            onSuccess(registration);
          });
        }
      }
    });
    
    wb.register();
  } catch (error) {
    console.error('Error during service worker registration:', error);
  }
}

function checkValidServiceWorker(swUrl: string, config?: Config): void {
  // Check if the service worker can be found. If it can't reload the page.
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      // Ensure service worker exists, and that we really are getting a JS file.
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        // No service worker found. Probably a different app. Reload the page.
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        // Service worker found. Proceed as normal.
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log('No internet connection found. App is running in offline mode.');
    });
}

export function unregister(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}

// Create a utility function to check if the app is in offline mode
export function isOffline(): boolean {
  return !navigator.onLine;
}

// Create a utility function to add event listeners for online/offline events
export function addNetworkStatusListeners(
  onlineCallback: () => void, 
  offlineCallback: () => void
): () => void {
  window.addEventListener('online', onlineCallback);
  window.addEventListener('offline', offlineCallback);
  
  // Return a cleanup function
  return () => {
    window.removeEventListener('online', onlineCallback);
    window.removeEventListener('offline', offlineCallback);
  };
}