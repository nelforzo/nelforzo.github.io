// Service Worker for offline functionality
const CACHE_NAME = 'radio-memo-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    'https://unpkg.com/dexie@3.2.4/dist/dexie.js'
];

// インストール時のキャッシュ処理
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('キャッシュを開きました');
                return cache.addAll(urlsToCache);
            })
    );
});

// フェッチ時のキャッシュ処理
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
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(function(cache) {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    }
                );
            })
    );
});

// アクティベート時の古いキャッシュ削除
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheName !== CACHE_NAME) {
                        console.log('古いキャッシュを削除します:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});