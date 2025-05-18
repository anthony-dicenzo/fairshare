// Service Worker with Workbox pattern
const CACHE_NAME = 'fairshare-cache-v1';

// App Shell - the core HTML, CSS, and JavaScript files that make your app work.
// Route-based chunks under /assets are cached on first fetch.
const APP_SHELL = [
  '/',
  '/index.html',
  '/offline.html'
];

// Static Assets - images, fonts, etc.
const STATIC_ASSETS = [
  '/icons/192.png',
  '/icons/512.png',
  '/manifest.json',
  '/icons/fairshare-icon.svg'
];

// Install event - cache the app shell and static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app shell and static assets');
        return cache.addAll([...APP_SHELL, ...STATIC_ASSETS]);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache first, then network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip cross-origin requests
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  
  // API requests - use stale-while-revalidate strategy
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return fetch(event.request)
          .then(networkResponse => {
            // Only cache successful responses
            if (networkResponse.ok) {
              const clonedResponse = networkResponse.clone();
              cache.put(event.request, clonedResponse);
            }
            return networkResponse;
          })
          .catch(() => {
            console.log('Serving API request from cache:', event.request.url);
            return cache.match(event.request);
          });
      })
    );
    return;
  }
  
  // HTML pages - use network-first strategy
  if (event.request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          console.log('Serving HTML from cache:', event.request.url);
          return caches.match(event.request)
            .then(response => {
              return response || caches.match('/offline.html');
            });
        })
    );
    return;
  }
  
  // All other assets - use cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then(response => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200) {
              return response;
            }
            
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
              
            return response;
          })
          .catch(error => {
            console.error('Fetch failed:', error);
            // Offline fallback for images
            if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
              return caches.match('/icons/192.png');
            }
            return new Response('Network error happened', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});