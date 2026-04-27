const CACHE_NAME = 'gvasist-v1';

// Instala o Service Worker
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// Ativa e limpa caches antigos
self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// Intercepta as requisições (Necessário para o PWA ser instalável)
self.addEventListener('fetch', (event) => {
    event.respondWith(fetch(event.request).catch(() => {
        return new Response('Você está offline. Verifique sua conexão com a internet.');
    }));
});
