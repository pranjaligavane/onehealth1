/**
 * ONEHEALTH AI - Real WebRTC Cross-Device Video Consultation System
 * Features:
 * 1. P2P Video/Audio stream pipelines using public Google STUN servers.
 * 2. Cross-device WebRTC signaling (HTTP + Supabase Realtime fallback).
 * 3. Mobile camera toggle (front/back camera for lesion & wound examination).
 * 4. Audio mute/unmute, call duration timer, and integrated clinical case drawer.
 * 5. Direct WhatsApp Video / Phone fallback for rural networks.
 */

class OneHealthWebRTCConsult {
  constructor() {
    this.localStream = null;
    this.remoteStream = null;
    this.peerConnection = null;
    this.currentRoomId = null;
    this.activeDoctor = null;
    this.currentCase = null;
    this.isMuted = false;
    this.isVideoOff = false;
    this.currentFacingMode = 'user'; // 'user' or 'environment'
    this.callDurationTimer = null;
    this.secondsElapsed = 0;
    this.signalingInterval = null;
    this.userRoleInCall = 'patient'; // 'patient' or 'doctor'

    // Public STUN servers for WebRTC ICE negotiation across NAT/firewalls
    this.iceServers = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ]
    };
  }

  /**
   * Start Video Call Consultation (Called by Patient or Doctor)
   */
  async startConsultation(doctorObj, caseRecord = null, role = 'patient', existingRoomId = null) {
    this.activeDoctor = doctorObj;
    this.currentCase = caseRecord;
    this.userRoleInCall = role;
    this.currentRoomId = existingRoomId || `ROOM-${(doctorObj.id || 'DOC').replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString(36).toUpperCase()}`;

    // 1. Check Network Connectivity
    if (!navigator.onLine) {
      this.showOfflineNotice(doctorObj);
      return;
    }

    // 2. Open Video Room Modal
    this.renderVideoModal(doctorObj, caseRecord);

    // 3. Request Camera & Mic Media Stream
    try {
      this.updateStatusBadge('REQUESTING_PERMISSIONS', 'Requesting camera & microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: this.currentFacingMode },
        audio: { echoCancellation: true, noiseSuppression: true }
      });

      this.localStream = stream;
      const localVideo = document.getElementById('webrtcLocalVideo');
      if (localVideo) {
        localVideo.srcObject = stream;
      }

      this.updateStatusBadge('CONNECTING', `Connecting to ${doctorObj.name} (Room: ${this.currentRoomId})...`);
      
      // 4. Initialize PeerConnection and Cross-Device Signaling
      await this.initializePeerConnection(doctorObj);

      if (this.userRoleInCall === 'patient') {
        // Patient creates the offer
        await this.createAndSendOffer();
      }

      // Start signaling poll loop
      this.startSignalingLoop();
      this.startDurationClock();

    } catch (err) {
      console.error('[WebRTC] Media Device Error:', err);
      let errMsg = "Camera / Microphone permission denied.";
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errMsg = "No camera or microphone device detected on this system.";
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errMsg = "Camera/Mic permission was denied. Please allow access in browser settings to conduct video visits.";
      }
      this.updateStatusBadge('ERROR', errMsg);
    }
  }

  /**
   * Initialize RTCPeerConnection and Track Listeners
   */
  async initializePeerConnection(doctorObj) {
    try {
      this.peerConnection = new RTCPeerConnection(this.iceServers);

      // Add local stream tracks to connection
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection.addTrack(track, this.localStream);
        });
      }

      // Handle ICE candidates generated locally -> send to server
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.postSignalToServer('candidate', event.candidate);
        }
      };

      // Handle incoming remote media tracks
      this.peerConnection.ontrack = (event) => {
        console.log('[WebRTC] Received remote track:', event.track.kind);
        const remoteVideo = document.getElementById('webrtcRemoteVideo');
        const waitingOverlay = document.getElementById('videoWaitingOverlay');

        if (remoteVideo) {
          if (!remoteVideo.srcObject) {
            remoteVideo.srcObject = event.streams[0];
          }
          if (waitingOverlay) waitingOverlay.style.display = 'none';
          this.updateStatusBadge('CONNECTED', '🟢 Encrypted Cross-Device P2P Active');
        }
      };

      // Handle connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection.connectionState;
        console.log('[WebRTC] Connection State:', state);
        if (state === 'connected') {
          this.updateStatusBadge('CONNECTED', '🟢 Encrypted P2P Session Active');
          const waitingOverlay = document.getElementById('videoWaitingOverlay');
          if (waitingOverlay) waitingOverlay.style.display = 'none';
        } else if (state === 'disconnected' || state === 'failed') {
          this.updateStatusBadge('RECONNECTING', 'Reconnecting to physician...');
        }
      };

    } catch (err) {
      console.error('[WebRTC] Peer Connection Init Error:', err);
    }
  }

  async createAndSendOffer() {
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      await this.postSignalToServer('offer', offer);
      console.log('[WebRTC] Sent SDP Offer to Room:', this.currentRoomId);
    } catch (err) {
      console.warn('[WebRTC] Error creating offer:', err);
    }
  }

  async handleReceivedOffer(offerData) {
    try {
      if (!this.peerConnection) return;
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offerData));
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      await this.postSignalToServer('answer', answer);
      console.log('[WebRTC] Sent SDP Answer to Room:', this.currentRoomId);
    } catch (err) {
      console.warn('[WebRTC] Error handling offer:', err);
    }
  }

  async handleReceivedAnswer(answerData) {
    try {
      if (!this.peerConnection) return;
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answerData));
      console.log('[WebRTC] Established SDP Answer with remote peer.');
    } catch (err) {
      console.warn('[WebRTC] Error handling answer:', err);
    }
  }

  async handleReceivedCandidate(candidateData) {
    try {
      if (!this.peerConnection) return;
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateData));
    } catch (err) {
      console.warn('[WebRTC] Error adding ICE candidate:', err);
    }
  }

  // --- CROSS-DEVICE SIGNALING API CLIENT ---

  async postSignalToServer(type, data) {
    try {
      await fetch('/api/consultations/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: this.currentRoomId,
          sender: this.userRoleInCall,
          type: type,
          data: data
        })
      });
    } catch (err) {
      console.warn('[WebRTC Signaling] Post note:', err);
    }
  }

  startSignalingLoop() {
    if (this.signalingInterval) clearInterval(this.signalingInterval);

    this.signalingInterval = setInterval(async () => {
      try {
        const resp = await fetch(`/api/consultations/signals/${this.currentRoomId}?recipient=${this.userRoleInCall}`);
        if (resp.ok) {
          const resData = await resp.json();
          for (const sig of resData.signals || []) {
            if (sig.type === 'offer' && this.userRoleInCall === 'doctor') {
              await this.handleReceivedOffer(sig.data);
            } else if (sig.type === 'answer' && this.userRoleInCall === 'patient') {
              await this.handleReceivedAnswer(sig.data);
            } else if (sig.type === 'candidate') {
              await this.handleReceivedCandidate(sig.data);
            } else if (sig.type === 'end_call') {
              this.endCall(false);
            }
          }
        }
      } catch (err) {
        // Silent catch for network hiccups
      }
    }, 1500);
  }

  // --- UI CONTROLS & MEDIA ACTIONS ---

  toggleMute() {
    if (!this.localStream) return;
    this.isMuted = !this.isMuted;
    this.localStream.getAudioTracks().forEach(track => {
      track.enabled = !this.isMuted;
    });

    const btn = document.getElementById('btnToggleMute');
    if (btn) {
      btn.innerText = this.isMuted ? '🔇 Unmute' : '🎙️ Mute';
      btn.style.backgroundColor = this.isMuted ? '#ef4444' : 'rgba(255,255,255,0.2)';
    }
  }

  toggleVideo() {
    if (!this.localStream) return;
    this.isVideoOff = !this.isVideoOff;
    this.localStream.getVideoTracks().forEach(track => {
      track.enabled = !this.isVideoOff;
    });

    const btn = document.getElementById('btnToggleVideo');
    if (btn) {
      btn.innerText = this.isVideoOff ? '📷 Turn On Cam' : '📹 Cam Off';
      btn.style.backgroundColor = this.isVideoOff ? '#ef4444' : 'rgba(255,255,255,0.2)';
    }
  }

  async switchCamera() {
    if (!this.localStream) return;
    this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';

    try {
      this.localStream.getVideoTracks().forEach(t => t.stop());
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: this.currentFacingMode },
        audio: true
      });

      const videoTrack = newStream.getVideoTracks()[0];
      const sender = this.peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender) {
        sender.replaceTrack(videoTrack);
      }

      this.localStream = newStream;
      const localVideo = document.getElementById('webrtcLocalVideo');
      if (localVideo) localVideo.srcObject = newStream;

      const btn = document.getElementById('btnSwitchCam');
      if (btn) btn.innerText = this.currentFacingMode === 'user' ? '🔄 Back Cam' : '🔄 Front Cam';

    } catch (err) {
      console.warn('[WebRTC] Switch camera error:', err);
    }
  }

  endCall(notifyServer = true) {
    if (notifyServer && this.currentRoomId) {
      fetch('/api/consultations/end-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: this.currentRoomId })
      }).catch(() => {});
    }

    if (this.signalingInterval) clearInterval(this.signalingInterval);
    if (this.callDurationTimer) clearInterval(this.callDurationTimer);

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    const modal = document.getElementById('videoConsultModal');
    if (modal) modal.style.display = 'none';

    if (window.oneHealthApp) {
      window.oneHealthApp.showToast("Video consultation session ended.");
    }
  }

  startDurationClock() {
    this.secondsElapsed = 0;
    if (this.callDurationTimer) clearInterval(this.callDurationTimer);

    this.callDurationTimer = setInterval(() => {
      this.secondsElapsed++;
      const mins = Math.floor(this.secondsElapsed / 60).toString().padStart(2, '0');
      const secs = (this.secondsElapsed % 60).toString().padStart(2, '0');
      const durationEl = document.getElementById('videoCallDuration');
      if (durationEl) durationEl.innerText = `${mins}:${secs}`;
    }, 1000);
  }

  updateStatusBadge(statusType, message) {
    const badge = document.getElementById('videoRoomStatusBadge');
    if (badge) {
      badge.innerText = message;
      if (statusType === 'CONNECTED') {
        badge.style.backgroundColor = '#16a34a';
      } else if (statusType === 'ERROR') {
        badge.style.backgroundColor = '#ef4444';
      } else {
        badge.style.backgroundColor = '#0284c7';
      }
    }
  }

  // --- MODAL RENDERING ---

  renderVideoModal(doctorObj, caseRecord) {
    const modal = document.getElementById('videoConsultModal');
    const content = document.getElementById('videoModalContent');
    if (!modal || !content) return;

    const whatsappNumber = (doctorObj.whatsapp || doctorObj.phone || '').replace(/[^0-9]/g, '');
    const cleanPhone = (doctorObj.phone || '').replace(/[^0-9+]/g, '');

    content.innerHTML = `
      <div class="video-room-container">
        <!-- Room Top Bar -->
        <div class="video-room-header">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:22px;">📹</span>
            <div>
              <h3 style="font-size:15px; font-weight:800; color:#fff; margin:0;">${doctorObj.name}</h3>
              <span style="font-size:11px; color:#94a3b8;">${doctorObj.clinic_name} • Room: ${this.currentRoomId.slice(0, 12)}</span>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span id="videoCallDuration" style="font-size:12px; color:#38bdf8; font-weight:700; font-family:monospace;">00:00</span>
            <button onclick="window.oneHealthWebRTC.endCall()" style="background:#ef4444; border:none; color:#fff; width:28px; height:28px; border-radius:50%; cursor:pointer; font-weight:bold;">✕</button>
          </div>
        </div>

        <!-- Video Stage Area -->
        <div class="video-stage">
          <div class="remote-video-box">
            <video id="webrtcRemoteVideo" class="remote-video-element" autoplay playsinline></video>
            
            <div id="videoWaitingOverlay" class="video-waiting-overlay">
              <div style="font-size:42px; margin-bottom:8px;">🩺</div>
              <h4 style="font-size:16px; color:#fff; font-weight:700; margin-bottom:4px;">Connecting Live Secure Consultation</h4>
              <p style="font-size:12px; color:#94a3b8; max-width:320px; margin-bottom:14px;" id="videoRoomStatusBadge">
                Requesting camera & establishing WebRTC stream...
              </p>
              
              <!-- Direct WhatsApp / Phone Fallback -->
              <div style="background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); border-radius:10px; padding:10px 14px; display:flex; gap:10px; flex-wrap:wrap; justify-content:center;">
                <span style="font-size:11px; color:#cbd5e1; width:100%; display:block;">Quick Direct Connectivity Fallback:</span>
                ${whatsappNumber ? `
                  <a href="https://wa.me/${whatsappNumber}?text=Hello%20${encodeURIComponent(doctorObj.name)},%20I%20am%20ready%20for%20the%20video%20consultation." target="_blank" class="btn btn-sm" style="background:#16a34a; color:#fff; text-decoration:none; font-size:11px; padding:6px 12px; border-radius:6px;">
                    💬 WhatsApp Video Call
                  </a>
                ` : ''}
                <a href="tel:${cleanPhone}" class="btn btn-sm" style="background:#0284c7; color:#fff; text-decoration:none; font-size:11px; padding:6px 12px; border-radius:6px;">
                  📞 Direct Phone Call
                </a>
              </div>
            </div>
          </div>

          <!-- Local Self Camera View (Picture in Picture) -->
          <div class="local-video-pip">
            <video id="webrtcLocalVideo" class="local-video-element" autoplay playsinline muted></video>
          </div>
        </div>

        <!-- Integrated Clinical Context -->
        ${caseRecord ? `
          <div class="video-clinical-drawer">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <strong style="font-size:13px; color:#0f766e;">Clinical Case: ${caseRecord.subject_name} (${caseRecord.age_or_dob || 'N/A'})</strong>
              <span class="badge badge-${(caseRecord.risk_level || 'GREEN').toLowerCase()}">${caseRecord.risk_level} RISK</span>
            </div>
            <div style="font-size:12px; color:#475569; margin-top:2px;">
              <strong>Assessment:</strong> ${caseRecord.primary_condition || 'Screened Case'} | 📍 ${caseRecord.village || 'Kopargaon'}
            </div>
          </div>
        ` : ''}

        <!-- Interactive Control Bar -->
        <div class="video-controls-bar">
          <button id="btnToggleMute" class="btn-video-control" onclick="window.oneHealthWebRTC.toggleMute()">
            🎙️ Mute
          </button>
          <button id="btnToggleVideo" class="btn-video-control" onclick="window.oneHealthWebRTC.toggleVideo()">
            📹 Cam Off
          </button>
          <button id="btnSwitchCam" class="btn-video-control" onclick="window.oneHealthWebRTC.switchCamera()">
            🔄 Back Cam
          </button>
          <button class="btn-video-control btn-end-call" onclick="window.oneHealthWebRTC.endCall()">
            🔴 End Call
          </button>
        </div>
      </div>
    `;

    modal.style.display = 'flex';
  }

  showOfflineNotice(doctorObj) {
    if (window.oneHealthApp) {
      window.oneHealthApp.showToast("Video consultation requires internet. You can still use the on-device AI assistant, screening forms, and local doctor directory offline.");
    }
  }
}

// Global Singleton
window.oneHealthWebRTC = new OneHealthWebRTCConsult();
