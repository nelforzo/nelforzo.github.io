// Service Worker for offline functionality
// v56: Redesign header - make sticky and move add log button to header
const CACHE_NAME = 'radio-memo-v56';
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './icon-512.png',
    './icon-192.png',
    './apple-touch-icon.png',
    './radio-memo.png',
    './CODING_CONVENTIONS.md',
    'https://unpkg.com/dexie@3.2.4/dist/dexie.js',
    'https://fonts.googleapis.com/css2?family=DotGothic16&display=swap',
];

/**
 * Install event - caches resources for offline use
 */
self.addEventListener('install', function (event) {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then(function (cache) {
                return cache.addAll(urlsToCache);
            })
            .then(function () {
                // 即座にアクティベートするため待機をスキップ
                return self.skipWaiting();
            })
    );
});

/**
 * Fetch event - serves cached resources when available, falls back to network
 * Optimized to skip unnecessary cache lookups for better performance
 */
self.addEventListener('fetch', function (event) {
    const requestUrl = new URL(event.request.url);

    // Skip cache for non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip cache for chrome-extension, blob, and data URLs
    if (
        requestUrl.protocol === 'chrome-extension:' ||
        requestUrl.protocol === 'blob:' ||
        requestUrl.protocol === 'data:'
    ) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then(function (response) {
            // キャッシュにあれば返す
            if (response) {
                return response;
            }

            // キャッシュにない場合はネットワークから取得
            return fetch(event.request)
                .then(function (response) {
                    // レスポンスが有効でない場合はそのまま返す
                    if (!response || response.status !== 200) {
                        return response;
                    }

                    // Only cache GET requests for our domain or whitelisted CDNs
                    const shouldCache =
                        response.type === 'basic' ||
                        (response.type === 'cors' &&
                            (requestUrl.hostname === 'unpkg.com' ||
                                requestUrl.hostname === 'fonts.googleapis.com' ||
                                requestUrl.hostname === 'fonts.gstatic.com'));

                    if (shouldCache) {
                        const responseToCache = response.clone();
                        caches
                            .open(CACHE_NAME)
                            .then(function (cache) {
                                cache.put(event.request, responseToCache);
                            })
                            .catch(function () {
                                // Silently fail cache writes to avoid blocking
                            });
                    }

                    return response;
                })
                .catch(function () {
                    // Network error - return nothing (offline mode will handle)
                    return new Response('', {
                        status: 408,
                        statusText: 'Request Timeout',
                    });
                });
        })
    );
});

/**
 * Activate event - cleans up old caches and takes control of clients
 */
self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches
            .keys()
            .then(function (cacheNames) {
                return Promise.all(
                    cacheNames.map(function (cacheName) {
                        if (cacheName !== CACHE_NAME) {
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(function () {
                // すべてのページを即座に制御下に置く
                return self.clients.claim();
            })
    );
});
