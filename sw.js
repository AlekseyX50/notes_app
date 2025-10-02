const CACHE_NAME = 'notes-app-v1';
const urlsToCache = [
    '/notes-app/',
    '/notes-app/index.html',
    '/notes-app/styles.css',
    '/notes-app/app.js',
    '/notes-app/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Возвращаем кешированную версию или загружаем из сети
                return response || fetch(event.request);
            }
        )
    );
});