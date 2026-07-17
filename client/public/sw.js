// Food Zone PWA Service Worker - Enhanced for Instant Table Loading
const CACHE_NAME = 'food-zone-v3.0.0';
const API_CACHE = 'food-zone-api-v3.0';
const TABLE_CACHE = 'food-zone-table-v3.0';

// Global variables
let keepAliveInterval = null;
let backgroundSyncRegistered = false;

// Critical resources for instant table loading
const urlsToCache = [
  '/',
  '/menu',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/images/logo.jpg',
  '/delivery-cart',
  '/reception',
  '/staff'
];

// API endpoints to aggressively cache for instant table experience
const CRITICAL_API_ENDPOINTS = [
  '/api/menu',
  '/api/tables/status',
  '/api/tables'
];

// Cache strategies
const CACHE_STRATEGIES = {
  // Cache first for static assets
  CACHE_FIRST: 'cache-first',
  // Network first for dynamic content
  NETWORK_FIRST: 'network-first',
  // Stale while revalidate for frequently updated content
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
};

// Install Service Worker with aggressive table caching
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing with table optimizations...');
  event.waitUntil(
    Promise.all([
      // Cache static resources with better error handling
      caches.open(CACHE_NAME).then(cache => {
        return Promise.all(
          urlsToCache.map(url => {
            return fetch(url)
              .then(response => {
                if (response.ok) {
                  return cache.put(url, response);
                }
                console.log(`⚠️ Skipped caching ${url}: ${response.status}`);
              })
              .catch(error => {
                console.log(`⚠️ Failed to cache ${url}:`, error.message);
              });
          })
        );
      }),
      // Pre-cache critical API endpoints for instant table loading
      caches.open(API_CACHE).then(cache => {
        return Promise.all(
          CRITICAL_API_ENDPOINTS.map(endpoint => {
            return fetch(endpoint)
              .then(response => {
                if (response.ok) {
                  cache.put(endpoint, response.clone());
                  console.log(`✅ Pre-cached ${endpoint}`);
                }
                return response;
              })
              .catch(error => {
                console.log(`⚠️ Failed to pre-cache ${endpoint}:`, error.message);
              });
          })
        );
      }),
      // Pre-cache table encryption utilities
      caches.open(TABLE_CACHE).then(cache => {
        const tableData = {
          fallbackMenu: [
            { id: 1, name: 'Chicken Momo', price: 180, category: 'Appetizers' },
            { id: 2, name: 'Chicken Thali', price: 350, category: 'Main Course' },
            { id: 3, name: 'Burger Combo', price: 280, category: 'Fast Food' },
            { id: 4, name: 'Cheese Pizza', price: 450, category: 'Pizza' },
            { id: 5, name: 'Fried Rice', price: 220, category: 'Main Course' }
          ],
          timestamp: Date.now()
        };
        return cache.put('/fallback-menu', new Response(JSON.stringify(tableData)));
      })
    ])
  );
  self.skipWaiting(); // Activate immediately
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activated for kitchen operations');
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== API_CACHE && 
                cacheName !== TABLE_CACHE) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim(),
      setupBackgroundSync(),
      startKeepAlive()
    ])
  );
});

// Setup background sync for persistent connectivity
async function setupBackgroundSync() {
  try {
    if ('sync' in self.registration) {
      await self.registration.sync.register('kitchen-orders-sync');
      backgroundSyncRegistered = true;
      console.log('📡 Background sync registered for kitchen orders');
    }
  } catch (error) {
    console.warn('Background sync not supported:', error);
  }
}

// Keep-alive mechanism for kitchen staff
function startKeepAlive() {
  if (keepAliveInterval) clearInterval(keepAliveInterval);
  
  keepAliveInterval = setInterval(() => {
    // Ping to maintain connection awareness
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'KEEP_ALIVE_PING',
          timestamp: Date.now()
        });
      });
    });
  }, 300000); // Every 5 minutes instead of 30 seconds
  
  console.log('⏰ Keep-alive mechanism started for kitchen staff');
}

// Enhanced fetch handler for instant table loading
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle http(s) requests — chrome-extension://, ws://, blob:, etc.
  // throw on cache.put() and clutter the console.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // Skip caching for POST, PUT, DELETE requests
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // PWA manifests are network-first — each surface (/admin, /pos, …) swaps
  // in its own manifest, and a stale cached one would break install/start_url.
  if (url.pathname.startsWith('/manifest')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // API requests are network-first: live data (orders, tables, settings,
  // menu edits) must always reflect the server, not yesterday's cache.
  // The cache is only a fallback for when the network is down, which keeps
  // the offline story (incl. the hardcoded fallback menu) intact. The old
  // cache-first strategy here was why the admin showed stale orders until
  // a manual refresh. [live-admin]
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.ok && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(API_CACHE).then(cache => cache.put(event.request, copy));
        }
        return networkResponse;
      }).catch(() =>
        caches.open(API_CACHE).then(cache => cache.match(event.request)).then(cached => {
          if (cached) return cached;
          if (url.pathname === '/api/menu') {
            return caches.open(TABLE_CACHE).then(tableCache => tableCache.match('/fallback-menu'));
          }
          throw new Error('Network unavailable');
        })
      )
    );
    return;
  }
  
  // Navigation requests (HTML documents) use network-first so the app shell
  // is always the latest version — this prevents stale UI (e.g. the customer
  // header leaking onto /admin) from being served from an old cache. Falls
  // back to the cached shell only when offline.
  if (event.request.mode === 'navigate' ||
      (event.request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.ok && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return networkResponse;
      }).catch(() =>
        caches.match(event.request).then(r => r || caches.match('/'))
      )
    );
    return;
  }

  // Handle static resources with cache-first for instant loading
  // (hashed JS/CSS are immutable, so cache-first is safe and fast here)
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response;
      }
      return fetch(event.request).then(networkResponse => {
        // Only cache successful responses with status 200 (not partial 206)
        if (networkResponse &&
            networkResponse.ok &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});

// Background sync for kitchen operations
self.addEventListener('sync', (event) => {
  if (event.tag === 'kitchen-orders-sync') {
    console.log('🔄 Kitchen orders background sync triggered');
    event.waitUntil(syncKitchenOrders());
  }
});

// Background sync function for kitchen orders
async function syncKitchenOrders() {
  try {
    console.log('📡 Syncing kitchen orders in background...');
    
    // Relative fetch — same origin as the app (proxied/redirected to the API)
    const response = await fetch('/api/orders/today');
    if (response.ok) {
      const orders = await response.json();
      
      // Notify all clients about updated orders
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'BACKGROUND_ORDERS_UPDATE',
          orders: orders
        });
      });
      
      console.log('✅ Kitchen orders synced successfully');
    }
  } catch (error) {
    console.error('❌ Kitchen orders sync failed:', error);
    // Don't retry automatically to avoid spam
  }
}

// Ask every open app window to play the alert sound. Service workers cannot
// play audio themselves (no AudioContext in a worker), so pages listen for
// this message and play the mp3 via soundManager.
function broadcastPlayAlert(sound, tag) {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    clientList.forEach((client) => {
      client.postMessage({ type: 'PLAY_ALERT', sound: sound || 'new-order', tag: tag || 'order' });
    });
  });
}

// Handle push events for background notifications
self.addEventListener('push', function(event) {
  let data = {};
  if (event.data) {
    try { data = event.data.json(); } catch (e) { /* plain-text push */ }
  }

  // Deep link for the click handler: server sends url/orderId; default to the
  // reception desk where incoming orders are handled.
  const targetUrl = data.url || (data.orderId ? `/reception?order=${data.orderId}` : '/reception');
  const tag = data.orderId ? `food-zone-order-${data.orderId}` : 'food-zone-order';

  event.waitUntil(
    Promise.all([
      broadcastPlayAlert('new-order', tag),
      self.registration.showNotification(data.title || '🍽️ New Order!', {
        body: data.body || 'You have a new order',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        vibrate: [400, 200, 400, 200, 400, 200, 400],
        requireInteraction: true,
        silent: false, // play the system notification sound too
        tag: tag,
        renotify: true,
        data: { url: targetUrl, orderId: data.orderId || null },
        actions: [
          { action: 'view', title: 'View Order' },
          { action: 'dismiss', title: 'Dismiss' }
        ]
      })
    ])
  );
});

// Notification click → land on the order. Focus an existing app window and
// navigate it; only open a new window when none is open.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const targetUrl = (event.notification.data && event.notification.data.url) || '/reception';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Prefer a window already on a staff surface, else any app window
      const staffClient = clientList.find((c) =>
        ['/reception', '/admin', '/staff', '/pos', '/kitchen-tv'].some((p) => new URL(c.url).pathname.startsWith(p))
      );
      const client = staffClient || clientList[0];
      if (client) {
        return client.focus().then((focused) => {
          // Tell the SPA to route to the order (full navigate as fallback)
          focused.postMessage({ type: 'NAVIGATE', url: targetUrl });
          if ('navigate' in focused && !staffClient) {
            return focused.navigate(targetUrl).catch(() => {});
          }
        });
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('🔔 Service worker received message:', event.data);

  // Activate a freshly-installed worker immediately so the page can reload
  // onto the latest version without a manual hard-refresh.
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (event.data && event.data.type === 'NEW_ORDER') {
    const { orderType, tableId, totalAmount, orderInfo, orderId } = event.data;
    const displayInfo = orderInfo || (orderType === 'dine-in' ? `Table ${tableId}` : 'Delivery');
    const targetUrl = orderId ? `/reception?order=${orderId}` : '/reception';

    // Show persistent notification for lock screen (sound is played by the
    // page that posted this message via soundManager, not by the SW)
    self.registration.showNotification('🍽️ New Order!', {
      body: `${displayInfo} - NPR ${totalAmount || 'N/A'}`,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      vibrate: [400, 200, 400, 200, 400, 200, 400],
      requireInteraction: true,
      silent: false,
      tag: orderId ? `food-zone-order-${orderId}` : 'food-zone-order-' + Date.now(),
      renotify: true,
      data: { url: targetUrl, orderId: orderId || null },
      actions: [
        { action: 'view', title: 'View Order' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    });
  }
});

// Background sync function
async function doBackgroundSync() {
  try {
    // Keep connection alive with server
    const response = await fetch('/api/orders');
    if (response.ok) {
      console.log('🔄 Background sync successful');
    }
  } catch (error) {
    console.error('❌ Background sync failed:', error);
  }
}

// Periodic background sync to keep PWA active (reduced frequency)
setInterval(() => {
  console.log('💓 Service Worker heartbeat');
}, 300000); // Every 5 minutes instead of 30 seconds
