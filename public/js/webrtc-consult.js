/**
 * ONEHEALTH AI - Production-Grade WebRTC Cross-Device Video Consultation System
 * 
 * Capabilities:
 * 1. Multi-Channel Signaling:
 *    - BroadcastChannel ('onehealth_webrtc_bus') for instant 0ms cross-tab calls on the same device.
 *    - localStorage Storage Events for window/tab synchronization.
 *    - HTTP REST API (/api/consultations/...) for cross-device signaling across the network.
 * 2. Incoming Video Call Notification & Ringing:
 *    - Doctor screen receives incoming call modal with audio chime.
 *    - Accept / Decline actions with instant state propagation.
 * 3. Bidirectional P2P Media Streams:
 *    - Public Google STUN servers (NAT traversal).
 *    - Camera flip (Front/Back camera for wound/lesion inspection).
 *    - Mute/Unmute, Cam Off/On, Call Duration Timer.
 *    - Integrated Clinical Case Drawer during consultation.
 * 4. WhatsApp / Phone Rural Fallbacks.
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
    this.ringAudioContext = null;
    this.ringInterval = null;
    this.pendingIncomingCall = null;

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

    // Initialize cross-tab signaling broadcast channel
    this.channel = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.channel = new BroadcastChannel('onehealth_webrtc_bus');
        this.channel.onmessage = (e) => this._handleSignalingMessage(e.data);
      }
    } catch (e) {
      console.warn('[WebRTC] BroadcastChannel not available:', e);
    }

    // Storage event listener fallback for cross-tab messaging
    window.addEventListener('storage', (e) => {
      if (e.key === 'onehealth_webrtc_signal_bus' && e.newValue) {
        try {
          const msg = JSON.parse(e.newValue);
          this._handleSignalingMessage(msg);
        } catch (err) {}
      }
    });

    // Start background listener for incoming calls
    this._startBackgroundIncomingCallPoll();
  }

  // =========================================================================
  // 1. SIGNALING DISPATCH & RECEPTION
  // =========================================================================

  _broadcastSignal(msg) {
    // 1. Send via BroadcastChannel
    if (this.channel) {
      try { this.channel.postMessage(msg); } catch (e) {}
    }

    // 2. Send via localStorage event (triggers in other tabs/windows)
    try {
      localStorage.setItem('onehealth_webrtc_signal_bus', JSON.stringify({ ...msg, _rand: Math.random() }));
    } catch (e) {}

    // 3. Post to backend server
    this.postSignalToServer(msg.type, msg);
  }

  _handleSignalingMessage(msg) {
    if (!msg || !msg.type) return;

    // A. Incoming Call Notification received by Doctor
    if (msg.type === 'INCOMING_CALL') {
      const currentRole = window.oneHealthApp?.userRole || 'doctor';
      // If user is doctor/vet or on doctor portal, show incoming call alert
      if (currentRole === 'doctor' || currentRole === 'vet' || window.location.hash.includes('portal')) {
        this._showIncomingCallDialog(msg);
      }
    }

    // B. Call Accepted by Doctor -> Patient initiates WebRTC Offer
    else if (msg.type === 'CALL_ACCEPTED' && msg.roomId === this.currentRoomId) {
      if (this.userRoleInCall === 'patient' && this.peerConnection) {
        this.updateStatusBadge('CONNECTING', 'Doctor accepted call! Connecting video stream...');
        this.createAndSendOffer();
      }
    }

    // C. Call Declined by Doctor
    else if (msg.type === 'CALL_DECLINED' && msg.roomId === this.currentRoomId) {
      this._stopRinging();
      this.updateStatusBadge('DISCONNECTED', 'Physician is currently busy or declined the call.');
      if (window.oneHealthApp) {
        window.oneHealthApp.showToast('Physician is currently attending another patient. WhatsApp/Direct Phone available.');
      }
      setTimeout(() => this.endCall(false), 3000);
    }

    // D. SDP Offer received
    else if (msg.type === 'offer' && msg.roomId === this.currentRoomId && this.userRoleInCall === 'doctor') {
      this.handleReceivedOffer(msg.data);
    }

    // E. SDP Answer received
    else if (msg.type === 'answer' && msg.roomId === this.currentRoomId && this.userRoleInCall === 'patient') {
      this.handleReceivedAnswer(msg.data);
    }

    // F. ICE Candidate received
    else if (msg.type === 'candidate' && msg.roomId === this.currentRoomId) {
      if (msg.sender !== this.userRoleInCall) {
        this.handleReceivedCandidate(msg.data);
      }
    }

    // G. End call signal
    else if (msg.type === 'end_call' && msg.roomId === this.currentRoomId) {
      this.endCall(false);
    }
  }

  // =========================================================================
  // 2. CALL INITIALIZATION (PATIENT & DOCTOR)
  // =========================================================================

  /**
   * Start Video Call Consultation (Called by Patient or Doctor)
   */
  async startConsultation(doctorObj, caseRecord = null, role = 'patient', existingRoomId = null) {
    this.activeDoctor = doctorObj || { id: 'DOC-1', name: 'Dr. Rahul Deshmukh', clinic_name: 'Rural Health Clinic' };
    this.currentCase = caseRecord;
    this.userRoleInCall = role;
    this.currentRoomId = existingRoomId || `ROOM-${(this.activeDoctor.id || 'DOC').replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString(36).toUpperCase()}`;

    // 1. Render Video Room Modal
    this.renderVideoModal(this.activeDoctor, caseRecord);

    // 2. Request Camera & Mic Media Stream
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

      this.updateStatusBadge('CONNECTING', `Calling ${this.activeDoctor.name}... Waiting for doctor to join`);
      
      // 3. Initialize PeerConnection and Cross-Device Signaling
      await this.initializePeerConnection();

      // 4. If patient, broadcast INCOMING_CALL alert to doctors
      if (this.userRoleInCall === 'patient') {
        const callerName = caseRecord?.subject_name || window.oneHealthSupabase?.currentUser?.name || 'Patient (Rural OPD)';
        const callerVillage = caseRecord?.village || 'Kopargaon';

        const callPayload = {
          type: 'INCOMING_CALL',
          roomId: this.currentRoomId,
          doctorId: this.activeDoctor.id,
          doctorName: this.activeDoctor.name,
          doctorObj: this.activeDoctor,
          patientName: callerName,
          patientVillage: callerVillage,
          caseRecord: caseRecord,
          timestamp: Date.now()
        };

        this._broadcastSignal(callPayload);
      } else if (this.userRoleInCall === 'doctor') {
        // Doctor accepted: announce acceptance
        this._broadcastSignal({
          type: 'CALL_ACCEPTED',
          roomId: this.currentRoomId,
          sender: 'doctor'
        });
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

  // =========================================================================
  // 3. INCOMING CALL NOTIFICATION DIALOG & RINGING
  // =========================================================================

  _showIncomingCallDialog(callData) {
    this.pendingIncomingCall = callData;

    let incomingModal = document.getElementById('incomingCallModal');
    if (!incomingModal) {
      incomingModal = document.createElement('div');
      incomingModal.id = 'incomingCallModal';
      incomingModal.className = 'auth-modal-overlay';
      incomingModal.style.zIndex = '99999';
      document.body.appendChild(incomingModal);
    }

    incomingModal.innerHTML = `
      <div class="auth-modal-card" style="max-width:440px; text-align:center; border:2px solid #0f766e; animation: pulseRing 1.5s infinite;">
        <div style="font-size:48px; margin:8px 0;">📹</div>
        <h3 style="font-size:18px; font-weight:800; color:#0f766e; margin-bottom:4px;">Incoming Video Consultation</h3>
        <p style="font-size:13px; color:var(--text-muted); margin-bottom:14px;">
          Patient is waiting in virtual consultation room
        </p>

        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:14px; margin-bottom:18px; text-align:left;">
          <div style="font-size:14px; font-weight:800; color:#1e293b; margin-bottom:4px;">
            👤 ${callData.patientName || 'Patient'}
          </div>
          <div style="font-size:12px; color:#64748b;">
            📍 Village: <strong>${callData.patientVillage || 'Kopargaon'}</strong>
          </div>
          ${callData.caseRecord?.primary_condition ? `
            <div style="font-size:12px; color:#0f766e; margin-top:4px;">
              🩺 Condition: <strong>${callData.caseRecord.primary_condition}</strong>
            </div>
          ` : ''}
          <div style="font-size:11px; color:#94a3b8; margin-top:6px; font-family:monospace;">
            Room ID: ${callData.roomId}
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <button class="btn btn-primary" onclick="window.oneHealthWebRTC.acceptIncomingCall()" style="background:#16a34a; border-color:#16a34a; padding:12px; font-size:14px; font-weight:800;">
            🟢 Accept Call
          </button>
          <button class="btn btn-outline" onclick="window.oneHealthWebRTC.declineIncomingCall()" style="color:#ef4444; border-color:#ef4444; padding:12px; font-size:14px; font-weight:800;">
            🔴 Decline
          </button>
        </div>
      </div>
    `;

    incomingModal.style.display = 'flex';
    this._startRinging();
  }

  _startRinging() {
    this._stopRinging();
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.ringAudioContext = new AudioContext();

      const playChime = () => {
        if (!this.ringAudioContext) return;
        const osc = this.ringAudioContext.createOscillator();
        const gain = this.ringAudioContext.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, this.ringAudioContext.currentTime); // D5
        osc.frequency.setValueAtTime(880, this.ringAudioContext.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.15, this.ringAudioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ringAudioContext.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(this.ringAudioContext.destination);
        osc.start();
        osc.stop(this.ringAudioContext.currentTime + 0.4);
      };

      playChime();
      this.ringInterval = setInterval(playChime, 2000);
    } catch (e) {}
  }

  _stopRinging() {
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
    if (this.ringAudioContext) {
      try { this.ringAudioContext.close(); } catch (e) {}
      this.ringAudioContext = null;
    }
  }

  async acceptIncomingCall() {
    this._stopRinging();
    const modal = document.getElementById('incomingCallModal');
    if (modal) modal.style.display = 'none';

    if (!this.pendingIncomingCall) return;
    const callData = this.pendingIncomingCall;
    this.pendingIncomingCall = null;

    // Start Doctor session in this room
    await this.startConsultation(
      callData.doctorObj || { id: callData.doctorId, name: callData.doctorName },
      callData.caseRecord,
      'doctor',
      callData.roomId
    );
  }

  declineIncomingCall() {
    this._stopRinging();
    const modal = document.getElementById('incomingCallModal');
    if (modal) modal.style.display = 'none';

    if (this.pendingIncomingCall) {
      this._broadcastSignal({
        type: 'CALL_DECLINED',
        roomId: this.pendingIncomingCall.roomId,
        sender: 'doctor'
      });
      this.pendingIncomingCall = null;
    }
  }

  // =========================================================================
  // 4. WEBRTC PEER CONNECTION & STREAMS
  // =========================================================================

  async initializePeerConnection() {
    try {
      this.peerConnection = new RTCPeerConnection(this.iceServers);

      // Add local stream tracks
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection.addTrack(track, this.localStream);
        });
      }

      // Local ICE candidate generated -> broadcast
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this._broadcastSignal({
            type: 'candidate',
            roomId: this.currentRoomId,
            sender: this.userRoleInCall,
            data: event.candidate
          });
        }
      };

      // Remote media track received -> show video
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
      this._broadcastSignal({
        type: 'offer',
        roomId: this.currentRoomId,
        sender: 'patient',
        data: offer
      });
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
      this._broadcastSignal({
        type: 'answer',
        roomId: this.currentRoomId,
        sender: 'doctor',
        data: answer
      });
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

  // =========================================================================
  // 5. SERVER SIGNALING API CLIENT
  // =========================================================================

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
    } catch (err) {}
  }

  startSignalingLoop() {
    if (this.signalingInterval) clearInterval(this.signalingInterval);

    this.signalingInterval = setInterval(async () => {
      if (!this.currentRoomId) return;
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
      } catch (err) {}
    }, 1500);
  }

  _startBackgroundIncomingCallPoll() {
    // Polls for active incoming rooms every 3 seconds if on doctor view
    setInterval(async () => {
      const currentRole = window.oneHealthApp?.userRole || 'patient';
      if (currentRole !== 'doctor' && currentRole !== 'vet') return;
      if (this.peerConnection) return; // Already in a call

      try {
        const raw = localStorage.getItem('onehealth_incoming_call');
        if (raw) {
          const callData = JSON.parse(raw);
          // If recent (within 30 seconds)
          if (Date.now() - callData.timestamp < 30000 && (!this.pendingIncomingCall || this.pendingIncomingCall.roomId !== callData.roomId)) {
            this._showIncomingCallDialog(callData);
          }
        }
      } catch (e) {}
    }, 3000);
  }

  // =========================================================================
  // 6. UI CONTROLS & DIRECT CALL DIALOG
  // =========================================================================

  openCallDialog() {
    let dialog = document.getElementById('directCallDialogModal');
    if (!dialog) {
      dialog = document.createElement('div');
      dialog.id = 'directCallDialogModal';
      dialog.className = 'auth-modal-overlay';
      dialog.style.zIndex = '9999';
      document.body.appendChild(dialog);
    }

    dialog.innerHTML = `
      <div class="auth-modal-card" style="max-width:460px;">
        <div class="auth-modal-header">
          <div class="auth-modal-brand">
            <span style="font-size:26px;">🎥</span>
            <div>
              <div class="auth-modal-title">Telemedicine Video Consult</div>
              <div class="auth-modal-sub">Direct Room or Patient Call</div>
            </div>
          </div>
          <button class="auth-modal-close" onclick="document.getElementById('directCallDialogModal').style.display='none'">✕</button>
        </div>
        <div class="auth-modal-body">
          <p style="font-size:13px; color:var(--text-muted); margin-bottom:14px;">
            Start an instant virtual consultation session or connect with a waiting patient.
          </p>

          <div style="display:flex; flex-direction:column; gap:10px;">
            <button class="btn btn-primary" onclick="window.oneHealthWebRTC.startInstantDoctorRoom()" style="padding:12px; font-weight:800;">
              ⚡ Start Instant OPD Video Room
            </button>
            <div style="text-align:center; font-size:12px; color:var(--text-muted); margin:4px 0;">— OR JOIN BY ROOM ID —</div>
            <div style="display:flex; gap:8px;">
              <input type="text" id="directRoomInput" class="form-input" placeholder="e.g. ROOM-DOC1-XYZ" style="font-family:monospace; font-weight:700;">
              <button class="btn btn-secondary" onclick="window.oneHealthWebRTC.joinRoomById()" style="white-space:nowrap;">
                Join Room ➔
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    dialog.style.display = 'flex';
  }

  startInstantDoctorRoom() {
    const dialog = document.getElementById('directCallDialogModal');
    if (dialog) dialog.style.display = 'none';

    const doctorUser = window.oneHealthSupabase?.currentUser || { id: 'DOC-1', name: 'Dr. Rahul Deshmukh', clinic_name: 'Deshmukh Clinic' };
    this.startConsultation(doctorUser, null, 'doctor');
  }

  joinRoomById() {
    const input = document.getElementById('directRoomInput');
    const roomId = input?.value.trim();
    if (!roomId) {
      if (window.oneHealthApp) window.oneHealthApp.showToast('Please enter a Room ID');
      return;
    }

    const dialog = document.getElementById('directCallDialogModal');
    if (dialog) dialog.style.display = 'none';

    const doctorUser = window.oneHealthSupabase?.currentUser || { id: 'DOC-1', name: 'Dr. Rahul Deshmukh', clinic_name: 'Deshmukh Clinic' };
    this.startConsultation(doctorUser, null, 'doctor', roomId);
  }

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
    this._stopRinging();
    if (notifyServer && this.currentRoomId) {
      this._broadcastSignal({
        type: 'end_call',
        roomId: this.currentRoomId,
        sender: this.userRoleInCall
      });
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
      } else if (statusType === 'ERROR' || statusType === 'DISCONNECTED') {
        badge.style.backgroundColor = '#ef4444';
      } else {
        badge.style.backgroundColor = '#0284c7';
      }
    }
  }

  // =========================================================================
  // 7. VIDEO ROOM UI MODAL
  // =========================================================================

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
              <span style="font-size:11px; color:#94a3b8;">${doctorObj.clinic_name || 'OneHealth Rural Telehealth'} • Room: ${this.currentRoomId.slice(0, 12)}</span>
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
              <h4 style="font-size:16px; color:#fff; font-weight:700; margin-bottom:4px;">Live Encrypted Video Consultation</h4>
              <p style="font-size:12px; color:#94a3b8; max-width:320px; margin-bottom:14px;" id="videoRoomStatusBadge">
                Establishing P2P WebRTC connection...
              </p>
              
              <!-- Direct WhatsApp / Phone Fallback -->
              <div style="background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); border-radius:10px; padding:10px 14px; display:flex; gap:10px; flex-wrap:wrap; justify-content:center;">
                <span style="font-size:11px; color:#cbd5e1; width:100%; display:block;">Quick Direct Connectivity Fallback:</span>
                ${whatsappNumber ? `
                  <a href="https://wa.me/${whatsappNumber}?text=Hello%20${encodeURIComponent(doctorObj.name)},%20I%20am%20ready%20for%20the%20video%20consultation." target="_blank" class="btn btn-sm" style="background:#16a34a; color:#fff; text-decoration:none; font-size:11px; padding:6px 12px; border-radius:6px;">
                    💬 WhatsApp Video Call
                  </a>
                ` : ''}
                <a href="tel:${cleanPhone || '+919822144552'}" class="btn btn-sm" style="background:#0284c7; color:#fff; text-decoration:none; font-size:11px; padding:6px 12px; border-radius:6px;">
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
}

// Global Singleton
window.oneHealthWebRTC = new OneHealthWebRTCConsult();
