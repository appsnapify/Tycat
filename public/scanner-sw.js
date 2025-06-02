const CACHE_NAME = 'snap-scanner-v1';
const STATIC_CACHE = 'snap-scanner-static-v1';

// Arquivos para cache estático
const STATIC_FILES = [
  '/scanner/login',
  '/scanner/dashboard',
  '/scanner/search',
  '/_next/static/css/app/scanner/layout.css',
  '/scanner-manifest.json'
];

// Instalar service worker
self.addEventListener('install', event => {
  console.log('[Scanner SW] Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[Scanner SW] Caching static files');
        return cache.addAll(STATIC_FILES.filter(url => !url.includes('_next')));
      })
      .then(() => {
        console.log('[Scanner SW] Static files cached');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[Scanner SW] Error caching static files:', err);
      })
  );
});

// Ativar service worker
self.addEventListener('activate', event => {
  console.log('[Scanner SW] Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
            console.log('[Scanner SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Scanner SW] Activated');
      return self.clients.claim();
    })
  );
});

// Interceptar requests
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Apenas interceptar requests do scanner
  if (!url.pathname.startsWith('/scanner/')) {
    return;
  }
  
  // Strategy: Network first, then cache
  if (request.method === 'GET') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Se sucesso, cache a resposta
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Se falha, tenta cache
          return caches.match(request).then(response => {
            if (response) {
              console.log('[Scanner SW] Serving from cache:', request.url);
              return response;
            }
            
            // Fallback para página offline
            if (request.mode === 'navigate') {
              return caches.match('/scanner/login');
            }
            
            return new Response('Offline', { status: 503 });
          });
        })
    );
  }
});

// Sync em background para dados offline
self.addEventListener('sync', event => {
  console.log('[Scanner SW] Background sync:', event.tag);
  
  if (event.tag === 'scanner-sync') {
    event.waitUntil(syncOfflineScans());
  }
});

async function syncOfflineScans() {
  try {
    console.log('[Scanner SW] Syncing offline scans...');
    
    // Buscar dados offline do IndexedDB ou localStorage
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_OFFLINE_SCANS',
        timestamp: Date.now()
      });
    });
    
  } catch (error) {
    console.error('[Scanner SW] Error syncing offline scans:', error);
  }
}

// Notificações push (futuro)
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    console.log('[Scanner SW] Push received:', data);
    
    const options = {
      body: data.message,
      icon: '/scanner-icon-192.png',
      badge: '/scanner-icon-192.png',
      vibrate: [100, 50, 100],
      data: data,
      actions: [
        {
          action: 'open',
          title: 'Abrir Scanner'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'SNAP Scanner', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/scanner/dashboard')
    );
  }
}); 