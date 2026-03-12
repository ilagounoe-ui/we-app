self.addEventListener('push', function(event) {
    const options = {
        body: 'Nouveau message sur Nexus',
        icon: 'https://ui-avatars.com/api/?name=N&background=ff2d55',
        badge: 'https://ui-avatars.com/api/?name=N&background=ff2d55',
        vibrate: [200, 100, 200]
    };
    event.waitUntil(self.registration.showNotification('Nexus', options));
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(clients.openWindow('./'));
});
