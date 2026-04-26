const CACHE_NAME = 'quran-companion-v2';
const STATIC_ASSETS = [
    'index.html',
    'style.css',
    'app.js',
    'manifest.json'
];

// Install - cache static assets
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(STATIC_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// Activate - clean old caches
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch - cache first, then network
self.addEventListener('fetch', (e) => {
    const { request } = e;
    const url = new URL(request.url);

    // API requests - network first, then cache
    if (url.hostname.includes('api.alquran.cloud') ||
        url.hostname.includes('cdn.islamic.network')) {
        e.respondWith(
            fetch(request)
                .then(response => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                    return response;
                })
                .catch(() => caches.match(request))
        );
        return;
    }

    // Static assets - cache first
    e.respondWith(
        caches.match(request).then(cached => {
            if (cached) return cached;
            return fetch(request).then(response => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                return response;
            });
        })
    );
});

// Background sync for offline actions
self.addEventListener('sync', (e) => {
    if (e.tag === 'sync-stats') {
        e.waitUntil(syncStats());
    }
});

async function syncStats() {
    // In a real app, this would sync with a server
    console.log('Syncing stats...');
}

// Push notifications
self.addEventListener('push', (e) => {
    const data = e.data.json();
    e.waitUntil(
        self.registration.showNotification(data.title || 'رفيق القرآن', {
            body: data.body || 'حان وقت وردك اليومي!',
            icon: 'https://cdn-icons-png.flaticon.com/512/2855/2855140.png',
            badge: 'https://cdn-icons-png.flaticon.com/512/2855/2855140.png',
            tag: 'daily-reminder',
            requireInteraction: true,
            actions: [
                { action: 'open', title: 'فتح التطبيق' },
                { action: 'dismiss', title: 'لاحقاً' }
            ]
        })
    );
});

self.addEventListener('notificationclick', (e) => {
    e.notification.close();

    if (e.action === 'open' || !e.action) {
        e.waitUntil(
            clients.matchAll({ type: 'window' }).then(clientList => {
                if (clientList.length > 0) {
                    clientList[0].focus();
                } else {
                    clients.openWindow('./');
                }
            })
        );
    }
});