self.addEventListener('push', function(event) {
    const options = {
        body: 'Nouveau message sur Notre Univers !',
        icon: 'https://ui-avatars.com/api/?name=NU&background=bb86fc&color=fff',
        badge: 'https://ui-avatars.com/api/?name=NU&background=bb86fc&color=fff',
        vibrate: [200, 100, 200]
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
