const CACHE_NAME = 'univers-cache-v55';

// Liste des fichiers "fixes" à sauvegarder sur le téléphone
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&family=Pacifico&display=swap'
];

// 1. Installation du Service Worker et mise en cache
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Mise en cache des ressources');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting(); // Force la mise à jour immédiate
});

// 2. Activation et nettoyage des vieilles versions (si tu changes de V55 à V56 par ex)
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker] Suppression de l\'ancien cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// 3. Interception des requêtes réseau (La magie du mode hors-ligne)
self.addEventListener('fetch', (event) => {
    // ⚠️ On exclut Firebase du cache du Service Worker ! 
    // Firebase Firestore a déjà sa propre base de données hors-ligne activée dans ton index.html
    if (event.request.url.includes('firestore.googleapis.com') || 
        event.request.url.includes('firebasestorage.googleapis.com') ||
        event.request.url.includes('firebaseio.com')) {
        return; 
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Si le fichier est dans le cache, on le charge depuis la mémoire du téléphone
            if (cachedResponse) {
                return cachedResponse;
            }
            // Sinon, on va le chercher sur internet normalement
            return fetch(event.request);
        })
    );
});
