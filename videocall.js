/**
 * ==========================================
 * MODULE APPELS VIDÉO - Notre Univers Live
 * WebRTC + PeerJS + Firebase
 * ==========================================
 */

class VideoCallManager {
    constructor() {
        this.peer = null;
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.callInProgress = false;
        this.currentPartnerPeerId = null;
        this.gameIntensity = 1;
        this.currentGameChoice = null;
        this.db = firebase.database();
        this.callState = 'idle'; // idle, calling, connected, error
        this.callHistory = [];
        this.missedCalls = [];
        
        this.signalChannel = null;
        this.statsInterval = null;
        
        // Configuration ICE
        this.iceServers = [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
        ];
        
        this.init();
    }

    // Initialiser PeerJS
    async init() {
        try {
            // Générer un ID unique pour ce client
            const userId = this.getCurrentUserId();
            if (!userId) {
                console.warn('Utilisateur non authentifié');
                return;
            }

            this.peer = new Peer(userId, {
                host: 'peerjs-server.example.com', // À remplacer par votre serveur PeerJS
                port: 443,
                secure: true,
                config: {
                    iceServers: this.iceServers
                }
            });

            this.setupPeerEvents();
            console.log('✅ PeerJS initialisé:', userId);
        } catch (error) {
            console.error('❌ Erreur initialisation VideoCallManager:', error);
        }
    }

    // Récupérer l'ID utilisateur actuel
    getCurrentUserId() {
        return localStorage.getItem('userId') || null;
    }

    // Récupérer l'ID du partenaire (depuis Firebase)
    async getPartnerPeerId(partnerId) {
        try {
            const snapshot = await this.db.ref(`users/${partnerId}/peerId`).once('value');
            return snapshot.val();
        } catch (error) {
            console.error('Erreur récupération PeerID:', error);
            return null;
        }
    }

    // Setup événements PeerJS
    setupPeerEvents() {
        this.peer.on('open', (id) => {
            console.log('🔐 Votre ID Peer:', id);
            // Sauvegarder dans Firebase
            this.db.ref(`users/${this.getCurrentUserId()}/peerId`).set(id);
        });

        this.peer.on('call', (call) => {
            this.handleIncomingCall(call);
        });

        this.peer.on('connection', (conn) => {
            console.log('📡 Connexion reçue:', conn.peer);
        });

        this.peer.on('error', (err) => {
            console.error('❌ Erreur Peer:', err);
            this.setCallState('error');
            this.showToast('Erreur de connexion: ' + err.type);
        });
    }

    // Démarrer appel vidéo
    async startCall(partnerId) {
        try {
            if (this.callInProgress) {
                this.showToast('Un appel est déjà en cours');
                return;
            }

            this.setCallState('calling');
            
            // Obtenir caméra et micro
            const stream = await this.getMediaStream();
            this.localStream = stream;
            
            // Afficher vidéo locale
            this.displayLocalVideo(stream);

            // Obtenir PeerID du partenaire
            const partnerPeerId = await this.getPartnerPeerId(partnerId);
            if (!partnerPeerId) {
                throw new Error('Partenaire hors ligne');
            }

            this.currentPartnerPeerId = partnerPeerId;

            // Initier appel
            const call = this.peer.call(partnerPeerId, stream, {
                metadata: {
                    userName: this.getCurrentUserName(),
                    startTime: Date.now()
                }
            });

            this.setupCallEvents(call);

            // Notifier le partenaire
            await this.notifyCallIncoming(partnerId);

            console.log('📞 Appel initié vers:', partnerPeerId);

        } catch (error) {
            console.error('❌ Erreur lors du démarrage:', error);
            this.showToast('Impossible de démarrer l\'appel: ' + error.message);
            this.setCallState('error');
        }
    }

    // Répondre à un appel incoming
    async answerCall(call) {
        try {
            const stream = await this.getMediaStream();
            this.localStream = stream;
            
            this.displayLocalVideo(stream);
            
            call.answer(stream);
            this.setupCallEvents(call);

            this.setCallState('connected');
            this.callInProgress = true;
            this.currentPartnerPeerId = call.peer;

            console.log('✅ Appel accepté');

        } catch (error) {
            console.error('❌ Erreur réponse appel:', error);
            this.showToast('Erreur: ' + error.message);
            call.close();
        }
    }

    // Rejeter un appel
    rejectCall(call) {
        call.close();
        this.setCallState('idle');
        this.removeMissedCall(call.peer);
    }

    // Setup événements appel
    setupCallEvents(call) {
        call.on('stream', (remoteStream) => {
            console.log('🎥 Stream reçu');
            this.remoteStream = remoteStream;
            this.displayRemoteVideo(remoteStream);
            this.setCallState('connected');
            this.callInProgress = true;
            this.startStatsMonitoring();
        });

        call.on('close', () => {
            this.endCall();
        });

        call.on('error', (err) => {
            console.error('❌ Erreur appel:', err);
            this.showToast('Erreur appel: ' + err);
            this.endCall();
        });
    }

    // Gérer appel entrant
    async handleIncomingCall(call) {
        console.log('📞 Appel entrant de:', call.peer);
        
        this.setCallState('calling');
        const incomingCall = {
            peerId: call.peer,
            userName: call.metadata?.userName || 'Utilisateur inconnu',
            timestamp: Date.now(),
            call: call
        };

        // Ajouter aux appels manqués temporairement
        this.missedCalls.push(incomingCall);

        // Afficher notification
        this.showIncomingCallNotification(incomingCall);

        // Auto-réponse après 30s si pas de réaction (optionnel)
        setTimeout(() => {
            if (this.callState === 'calling' && this.missedCalls.includes(incomingCall)) {
                this.recordMissedCall(incomingCall);
                this.removeMissedCall(call.peer);
            }
        }, 30000);
    }

    // Obtenir accès au média (caméra + micro)
    async getMediaStream() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { 
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                }
            });
            return stream;
        } catch (error) {
            console.error('❌ Erreur accès média:', error);
            throw new Error('Caméra/Micro non disponible: ' + error.message);
        }
    }

    // Afficher vidéo locale
    displayLocalVideo(stream) {
        const video = document.getElementById('localVideoLive');
        if (video) {
            video.srcObject = stream;
            video.play();
        }
    }

    // Afficher vidéo distante
    displayRemoteVideo(stream) {
        const video = document.getElementById('remoteVideo');
        if (video) {
            video.srcObject = stream;
            video.play();
        }
        
        // Masquer placeholder
        const placeholder = document.getElementById('remotePlaceholder');
        if (placeholder) {
            placeholder.style.display = 'none';
        }
    }

    // Terminer appel
    endCall() {
        try {
            // Arrêter tous les streams
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop());
                this.localStream = null;
            }

            if (this.remoteStream) {
                this.remoteStream.getTracks().forEach(track => track.stop());
                this.remoteStream = null;
            }

            // Fermer vidéos
            const localVideo = document.getElementById('localVideoLive');
            const remoteVideo = document.getElementById('remoteVideo');
            if (localVideo) localVideo.srcObject = null;
            if (remoteVideo) remoteVideo.srcObject = null;

            // Arrêter monitoring stats
            if (this.statsInterval) {
                clearInterval(this.statsInterval);
                this.statsInterval = null;
            }

            this.callInProgress = false;
            this.currentPartnerPeerId = null;
            this.setCallState('idle');
            
            // Enregistrer l'appel
            this.recordCallHistory();

            // Fermer gameRoom
            this.closeGameRoom();

            console.log('📞 Appel terminé');

        } catch (error) {
            console.error('Erreur fermeture appel:', error);
        }
    }

    // Contrôle caméra
    toggleCamera(enabled) {
        if (this.localStream) {
            this.localStream.getVideoTracks().forEach(track => {
                track.enabled = enabled;
            });
            console.log('🎥 Caméra:', enabled ? 'ON' : 'OFF');
        }
    }

    // Contrôle micro
    toggleMicrophone(enabled) {
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => {
                track.enabled = enabled;
            });
            console.log('🎤 Micro:', enabled ? 'ON' : 'OFF');
        }
    }

    // Changer intensité du jeu
    setGameIntensity(level) {
        this.gameIntensity = level;
        const labels = {
            1: 'Mignon 💕',
            2: 'Complice 😊',
            3: 'Sensuel 😏',
            4: 'Hot 🌶️'
        };
        this.showToast('Température: ' + labels[level]);
        
        // Envoyer au partenaire via signal
        this.sendGameData({ intensity: level });
    }

    // Envoyer choix du jeu
    handleGameChoice(choice) {
        this.currentGameChoice = choice;
        
        // Envoyer au partenaire
        this.sendGameData({
            choice: choice,
            intensity: this.gameIntensity
        });

        // Afficher feedback
        const emoji = choice === 'verite' ? '❓' : '🎬';
        this.showToast(`${emoji} ${choice.toUpperCase()}`);

        // Récupérer question/action
        this.getGameContent(choice);
    }

    // Récupérer question/action du jeu
    async getGameContent(type) {
        try {
            const ref = type === 'verite' ? 'game/questions' : 'game/actions';
            const snapshot = await this.db.ref(ref).orderByChild('difficulty')
                .equalTo(this.gameIntensity).limitToFirst(1).once('value');
            
            const data = snapshot.val();
            if (data) {
                const content = Object.values(data)[0];
                this.displayGameContent(content);
            }
        } catch (error) {
            console.error('Erreur récupération contenu jeu:', error);
        }
    }

    // Afficher contenu du jeu
    displayGameContent(content) {
        const gameButtonsRow = document.getElementById('gameButtonsRow');
        if (gameButtonsRow) {
            gameButtonsRow.insertAdjacentHTML('afterend', `
                <div style="background: rgba(0,0,0,0.5); padding: 20px; border-radius: 20px; margin-top: 20px; text-align: center; color: white;">
                    <p style="font-size: 14px; opacity: 0.8; margin: 0 0 10px 0;">${this.currentGameChoice === 'verite' ? 'VÉRITÉ' : 'ACTION'}</p>
                    <p style="font-size: 16px; font-weight: bold; margin: 0;">${content.text}</p>
                </div>
            `);
        }
    }

    // Envoyer données du jeu
    sendGameData(data) {
        if (this.currentPartnerPeerId) {
            const conn = this.peer.connect(this.currentPartnerPeerId);
            conn.send({
                type: 'gameData',
                payload: data
            });
        }
    }

    // Monitoring stats de connexion
    startStatsMonitoring() {
        if (this.statsInterval) clearInterval(this.statsInterval);
        
        this.statsInterval = setInterval(async () => {
            if (!this.peerConnection) return;
            
            try {
                const stats = await this.peerConnection.getStats();
                stats.forEach(report => {
                    if (report.type === 'inbound-rtp' && report.kind === 'video') {
                        const packetsLost = report.packetsLost || 0;
                        const jitter = (report.jitter * 1000).toFixed(2);
                        
                        if (packetsLost > 10) {
                            console.warn('⚠️ Perte de paquets:', packetsLost);
                            this.showToast('Connexion faible ⚠️');
                        }
                    }
                });
            } catch (error) {
                console.error('Erreur monitoring stats:', error);
            }
        }, 5000);
    }

    // Notifier appel entrant au partenaire
    async notifyCallIncoming(partnerId) {
        try {
            await this.db.ref(`users/${partnerId}/incomingCall`).set({
                from: this.getCurrentUserId(),
                userName: this.getCurrentUserName(),
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
        } catch (error) {
            console.error('Erreur notification:', error);
        }
    }

    // Enregistrer appel dans l'historique
    recordCallHistory() {
        const callRecord = {
            partnerId: this.currentPartnerPeerId,
            duration: Math.floor((Date.now() - (this.callStartTime || Date.now())) / 1000),
            timestamp: Date.now(),
            gameIntensity: this.gameIntensity,
            status: 'completed'
        };

        this.callHistory.push(callRecord);
        
        // Sauvegarder dans Firebase
        this.db.ref(`users/${this.getCurrentUserId()}/callHistory`).push(callRecord);
    }

    // Enregistrer appel manqué
    recordMissedCall(call) {
        const missedRecord = {
            from: call.peerId,
            userName: call.userName,
            timestamp: call.timestamp
        };

        this.db.ref(`users/${this.getCurrentUserId()}/missedCalls`).push(missedRecord);
    }

    // Retirer des appels manqués
    removeMissedCall(peerId) {
        this.missedCalls = this.missedCalls.filter(call => call.peerId !== peerId);
    }

    // Afficher notification d'appel entrant
    showIncomingCallNotification(call) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(11, 9, 20, 0.95);
            border: 2px solid var(--love);
            border-radius: 40px;
            padding: 40px;
            z-index: 100001;
            text-align: center;
            box-shadow: 0 20px 60px rgba(255, 75, 110, 0.4);
            backdrop-filter: blur(10px);
        `;

        notification.innerHTML = `
            <div style="font-family: Pacifico; color: var(--love); font-size: 28px; margin-bottom: 20px;">
                ${call.userName}
            </div>
            <div style="color: white; font-size: 16px; margin-bottom: 30px;">
                t'appelle...
            </div>
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button onclick="window.videoCallManager.rejectCall(event.target.closest('div').call)" 
                    style="background: rgba(255, 75, 110, 0.3); border: 1px solid var(--love); color: var(--love); 
                    padding: 12px 30px; border-radius: 25px; cursor: pointer; font-weight: bold;">
                    Refuser
                </button>
                <button onclick="window.videoCallManager.answerCall(event.target.closest('div').call)"
                    style="background: var(--love); border: none; color: white; 
                    padding: 12px 30px; border-radius: 25px; cursor: pointer; font-weight: bold;">
                    Répondre
                </button>
            </div>
        `;

        notification.call = call.call;
        document.body.appendChild(notification);

        setTimeout(() => notification.remove(), 30000);
    }

    // Ouvrir gameRoom
    async openGameRoom() {
        try {
            if (!this.callInProgress) {
                this.showToast('Aucun appel en cours');
                return;
            }

            const gameRoom = document.getElementById('gameRoomContainer');
            if (gameRoom) {
                gameRoom.style.display = 'flex';
                this.showToast('🎮 Jeu lancé!');
            }
        } catch (error) {
            console.error('Erreur ouverture gameRoom:', error);
        }
    }

    // Fermer gameRoom
    closeGameRoom() {
        const gameRoom = document.getElementById('gameRoomContainer');
        if (gameRoom) {
            gameRoom.style.display = 'none';
        }
    }

    // État de l'appel
    setCallState(state) {
        this.callState = state;
        console.log('📊 État appel:', state);
        
        // Mettre à jour UI si besoin
        const stateElement = document.getElementById('callState');
        if (stateElement) {
            stateElement.textContent = state.toUpperCase();
        }
    }

    // Afficher toast notification
    showToast(message) {
        const toast = document.getElementById('toastAlert');
        if (toast) {
            toast.textContent = message;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        }
    }

    // Récupérer nom utilisateur actuel
    getCurrentUserName() {
        return localStorage.getItem('userName') || 'Utilisateur';
    }
}

// Initialiser le gestionnaire global
window.videoCallManager = new VideoCallManager();

// Fonctions globales pour les événements HTML
function sendLiveCall() {
    const partnerId = localStorage.getItem('partnerId');
    if (!partnerId) {
        window.videoCallManager.showToast('Partenaire non défini');
        return;
    }
    window.videoCallManager.startCall(partnerId);
}

function handleGameChoice(choice) {
    window.videoCallManager.handleGameChoice(choice);
}

function closeGameRoom() {
    window.videoCallManager.endCall();
}

function updateLiveIntensity(value) {
    window.videoCallManager.setGameIntensity(parseInt(value));
}

function toggleVideoCall(enabled) {
    window.videoCallManager.toggleCamera(enabled);
}

function toggleMicCall(enabled) {
    window.videoCallManager.toggleMicrophone(enabled);
}
