// Service Worker for offline functionality
const CACHE_NAME = 'radio-memo-v1';
const urls_to_cache = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    'https://unpkg.com/dexie@3.2.4/dist/dexie.js'
];

/**
 * Install event - caches resources for offline use
 */
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('キャッシュを開きました');
                return cache.addAll(urls_to_cache);
            })
    );
});

/**
 * Fetch event - serves cached resources when available, falls back to network
 */
self.addEventListener('fetch', function(event) {
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
                        if(!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // レスポンスをキャッシュに保存
                        const response_to_cache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(function(cache) {
                                cache.put(event.request, response_to_cache);
                            });

                        return response;
                    }
                );
            })
    );
});

/**
 * Activate event - cleans up old caches
 */
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cache_names) {
            return Promise.all(
                cache_names.map(function(cache_name) {
                    if (cache_name !== CACHE_NAME) {
                        console.log('古いキャッシュを削除します:', cache_name);
                        return caches.delete(cache_name);
                    }
                })
            );
        })
    );
});