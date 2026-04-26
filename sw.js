const CACHE_NAME = 'hifz-companion-v3';
const STATIC_ASSETS = [
    'index.html',
    'style.css',
    'app.js',
    'manifest.json'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(STATIC_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

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

self.addEventListener('fetch', (e) => {
    const { request } = e;
    const url = new URL(request.url);

    if (url.hostname.includes('api.alquran.cloud')) {
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

self.addEventListener('push', (e) => {
    const data = e.data.json();
    e.waitUntil(
        self.registration.showNotification(data.title || 'رفيق الحفظ', {
            body: data.body || 'حان وقت ورد الحفظ اليومي!',
            icon: 'https://cdn-icons-png.flaticon.com/512/2855/2855140.png',
            tag: 'daily-reminder'
        })
    );
});

self.addEventListener('notificationclick', (e) => {
    e.notification.close();
    e.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
            if (clientList.length > 0) {
                clientList[0].focus();
            } else {
                clients.openWindow('./');
            }
        })
    );
});