// Service Worker for offline functionality
// v30: Clickable page title navigation - return to first page with title click
const CACHE_NAME = 'radio-memo-v30';
const urls_to_cache = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './icon-512.png',
    './icon-192.png',
    './apple-touch-icon.png',
    './radio-memo.png',
    'https://unpkg.com/dexie@3.2.4/dist/dexie.js'
];

/**
 * Install event - caches resources for offline use
 */
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                return cache.addAll(urls_to_cache);
            })
            .then(function() {
                // 即座にアクティベートするため待機をスキップ
                return self.skipWaiting();
            })
    );
});

/**
 * Fetch event - serves cached resources when available, falls back to network
 * Optimized to skip unnecessary cache lookups for better performance
 */
self.addEventListener('fetch', function(event) {
    const request_url = new URL(event.request.url);

    // Skip cache for non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip cache for chrome-extension, blob, and data URLs
    if (request_url.protocol === 'chrome-extension:' ||
        request_url.protocol === 'blob:' ||
        request_url.protocol === 'data:') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                // キャッシュにあれば返す
                if (response) {
                    return response;
                }

                // キャッシュにない場合はネットワークから取得
                return fetch(event.request).then(
                    function(response) {
                        // レスポンスが有効でない場合はそのまま返す
                        if(!response || response.status !== 200) {
                            return response;
                        }

                        // Only cache GET requests for our domain or whitelisted CDNs
                        const should_cache = response.type === 'basic' ||
                            (response.type === 'cors' && request_url.hostname === 'unpkg.com');

                        if (should_cache) {
                            const response_to_cache = response.clone();
                            caches.open(CACHE_NAME)
                                .then(function(cache) {
                                    cache.put(event.request, response_to_cache);
                                })
                                .catch(function() {
                                    // Silently fail cache writes to avoid blocking
                                });
                        }

                        return response;
                    }
                ).catch(function() {
                    // Network error - return nothing (offline mode will handle)
                    return new Response('', {
                        status: 408,
                        statusText: 'Request Timeout'
                    });
                });
            })
    );
});

/**
 * Activate event - cleans up old caches and takes control of clients
 */
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cache_names) {
            return Promise.all(
                cache_names.map(function(cache_name) {
                    if (cache_name !== CACHE_NAME) {
                        return caches.delete(cache_name);
                    }
                })
            );
        }).then(function() {
            // すべてのページを即座に制御下に置く
            return self.clients.claim();
        })
    );
});