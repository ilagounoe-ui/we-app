// odyLive.js
import { Peer } from "https://esm.sh/peerjs@1.5.2";

export class OdyVisio {
  constructor(myId, partnerId, remoteVideoElementId) {
    this.peer = new Peer(myId);
    this.partnerId = partnerId;
    this.remoteVideoElement = document.getElementById(remoteVideoElementId);
    this.localStream = null;
    this.init();
  }

  async init() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      
      // Réception d'un appel
      this.peer.on("call", (call) => {
        call.answer(this.localStream);
        this.handleCall(call);
      });
    } catch (err) {
      console.error("Erreur accès caméra/micro :", err);
    }
  }

  startCall() {
    if (!this.localStream) return;
    const call = this.peer.call(this.partnerId, this.localStream);
    this.handleCall(call);
  }

  handleCall(call) {
    call.on("stream", (remoteStream) => {
      if (this.remoteVideoElement) {
        this.remoteVideoElement.srcObject = remoteStream;
        this.remoteVideoElement.play();
      }
    });
  }

  terminate() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    this.peer.destroy();
  }
}
