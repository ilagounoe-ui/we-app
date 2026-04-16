const CACHE_NAME = 'univers-cache-v50';
const urlsToCache = [
  './',
  './index.html'
];

// Installation : on met le HTML en cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Fichiers mis en cache avec succès');
        return cache.addAll(urlsToCache);
      })
  );
});

// Interception : s'il n'y a pas de réseau, on sert le fichier en cache
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si le fichier est dans le cache, on le retourne direct
        if (response) {
          return response;
        }
        // Sinon, on tente de le télécharger
        return fetch(event.request);
      })
  );
});
