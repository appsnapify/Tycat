// ✅ SERVICE WORKER ULTRA-OTIMIZADO PARA TYCAT
const CACHE_NAME = 'tycat-v1.0.0';
const STATIC_CACHE = 'tycat-static-v1.0.0';
const API_CACHE = 'tycat-api-v1.0.0';

// ✅ RECURSOS CRÍTICOS PARA CACHE AGRESSIVO
const CRITICAL_ASSETS = [
  '/',
  '/login',
  '/register',
  '/_next/static/css/',
  '/_next/static/chunks/webpack.js',
  '/_next/static/chunks/main.js',
  '/manifest.json',
];

// ✅ INSTALL EVENT - CACHE CRÍTICO
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(CRITICAL_ASSETS);
      }),
      self.skipWaiting(),
    ])
  );
});

// ✅ ACTIVATE EVENT - LIMPEZA DE CACHE ANTIGO
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== STATIC_CACHE && 
                cacheName !== API_CACHE) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim(),
    ])
  );
});

// ✅ FETCH EVENT - ESTRATÉGIAS OTIMIZADAS
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // ✅ STATIC ASSETS - Cache First (Performance)
  if (request.destination === 'image' || 
      request.destination === 'style' || 
      request.destination === 'script' ||
      url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // ✅ API CALLS - Network First com Cache Fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.status === 200 && request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(API_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        return caches.match(request);
      })
    );
    return;
  }

  // ✅ HTML PAGES - Stale While Revalidate
  if (request.destination === 'document') {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          });
          
          return cachedResponse || fetchPromise;
        });
      })
    );
  }
});

// ✅ BACKGROUND SYNC PARA OFFLINE ACTIONS
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Implementar sincronização offline se necessário
  console.log('Background sync executado');
}

// ✅ PUSH NOTIFICATIONS (Futuro)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
      })
    );
  }
});
