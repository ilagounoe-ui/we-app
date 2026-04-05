// Importation des scripts Firebase pour le Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Configuration Firebase (identique à ton index.html)
const firebaseConfig = {
    apiKey: "AIzaSyBtx8uE9hkBB86uA9p4gCCP3OHx3jdmfAs",
    authDomain: "notre-univers-d71a3.firebaseapp.com",
    databaseURL: "https://notre-univers-d71a3-default-rtdb.firebaseio.com",
    projectId: "notre-univers-d71a3",
    storageBucket: "notre-univers-d71a3.firebasestorage.app",
    messagingSenderId: "909531230264",
    appId: "1:909531230264:web:8ea1c08b60058117eff6cd"
};

firebase.initializeApp(firebaseConfig);

// Initialisation du messaging
const messaging = firebase.messaging();

// Cette fonction intercepte les messages quand l'app est en arrière-plan
messaging.onBackgroundMessage((payload) => {
    console.log('[sw.js] Message reçu en arrière-plan :', payload);

    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/pfp_default.png', // Chemin vers une icône par défaut
        badge: '/badge_icon.png', // Petite icône pour la barre de statut
        data: payload.data // Permet de stocker l'ID du chat pour ouvrir la bonne fenêtre au clic
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Action au clic sur la notification
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    // Ici on peut forcer l'ouverture de l'application
    event.waitUntil(
        clients.openWindow('/')
    );
});
