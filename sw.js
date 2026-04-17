const CACHE_NAME = 'univers-cache-v51'; // Pense à changer ce numéro à ta prochaine grosse MAJ
const urlsToCache = [
  './',
  './index.html'
];

// 1. INSTALLATION : On force le nouveau Service Worker à s'activer tout de suite
self.addEventListener('install', event => {
  self.skipWaiting(); // Magie : n'attend pas que l'utilisateur ferme tous les onglets pour se mettre à jour
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Fichiers mis en cache avec succès');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. ACTIVATION : On nettoie les anciens caches pour faire de la place au nouveau
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Si le nom du cache ne correspond pas à la version actuelle, on le détruit 💥
          if (cacheName !== CACHE_NAME) {
            console.log('Ancien cache supprimé:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Prend le contrôle de la page immédiatement
  );
});

// 3. INTERCEPTION : Stratégie "Network First, fallback to Cache"
self.addEventListener('fetch', event => {
  event.respondWith(
    // On essaie TOUJOURS de récupérer la version la plus récente sur internet d'abord
    fetch(event.request)
      .then(response => {
        // Si on a internet et que la requête a réussi, on met à jour notre cache silencieusement
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return response; // On affiche la nouveauté à l'écran
      })
      .catch(() => {
        // Si ça "catch", ça veut dire qu'on a PAS internet (Hors-ligne)
        // Dans ce cas, on va chercher le fichier de secours dans le cache 🛟
        return caches.match(event.request);
      })
  );
});
