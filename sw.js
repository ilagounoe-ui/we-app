const CACHE_NAME = 'univers-cache-v56'; // Tu peux laisser ce nom, ce n'est plus lui qui bloque

// Les fichiers essentiels à charger dès l'installation
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// À l'installation, on force le nouveau Service Worker à prendre le contrôle
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting(); 
});

// Nettoyage des vieux caches si jamais on change de version
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim(); 
});

// STRATÉGIE "NETWORK FIRST" : Le cœur de la mise à jour automatique
self.addEventListener('fetch', event => {
  // On ignore les requêtes qui ne sont pas "http" ou "https" (ex: extensions Chrome)
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Si on a récupéré la donnée sur GitHub avec succès, on met à jour le cache
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
        }
        // On retourne la version fraîche de GitHub !
        return networkResponse; 
      })
      .catch(() => {
        // SI ON EST HORS-LIGNE (Le fetch réseau a échoué) : On retourne la version en cache
        return caches.match(event.request);
      })
  );
});
