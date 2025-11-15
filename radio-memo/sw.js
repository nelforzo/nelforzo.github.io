// Service Worker for offline functionality
const CACHE_NAME = 'radio-memo-v7';
const urls_to_cache = [
    './',
    './index.html',
    './style.css',
    './app.js',
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
                        if(!response || response.status !== 200) {
                            return response;
                        }

                        // CORSリソースもキャッシュに保存（外部CDNのライブラリ用）
                        if (response.type === 'basic' || response.type === 'cors') {
                            const response_to_cache = response.clone();
                            caches.open(CACHE_NAME)
                                .then(function(cache) {
                                    cache.put(event.request, response_to_cache);
                                });
                        }

                        return response;
                    }
                ).catch(function(error) {
                    // ネットワークエラー時は例外をスロー
                    throw error;
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