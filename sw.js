// Service Worker pour les notifications "Notre Univers"
self.addEventListener('push', function(event) {
    const options = {
        body: '🌹 Nouveau message dans votre univers !',
        icon: 'https://ui-avatars.com/api/?name=NU&background=bb86fc&color=fff',
        badge: 'https://ui-avatars.com/api/?name=NU&background=bb86fc&color=fff',
        vibrate: [200, 100, 200],
        data: { url: '/' }
    };

    event.waitUntil(
        self.registration.showNotification('Notre Univers', options)
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/')
    );
});
