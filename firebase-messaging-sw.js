importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyBtx8uE9hkBB86uA9p4gCCP3OHx3jdmfAs",
    authDomain: "notre-univers-d71a3.firebaseapp.com",
    projectId: "notre-univers-d71a3",
    storageBucket: "notre-univers-d71a3.firebasestorage.app",
    messagingSenderId: "909531230264",
    appId: "1:909531230264:web:8ea1c08b60058117eff6cd"
});

const messaging = firebase.messaging();

// Gère les notifications quand l'application est en arrière-plan
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Message reçu en arrière-plan:', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.png' // Assure-toi d'avoir une icône à la racine
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
