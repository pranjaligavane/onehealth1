/**
 * ONEHEALTH AI - Main Application Controller (Role-Aware Architecture)
 * Supports Patient / Citizen, Medical Doctor (MBBS), and Veterinary Doctor (BVSc).
 * Features autonomous offline AI, local IndexedDB persistence, Doctor Location matching,
 * real WebRTC video consultations, on-device conversational AI assistant, and GPS proximity ranking.
 */

class OneHealthApp {
  constructor() {
    this.currentView = 'home';
    this.userRole = localStorage.getItem('onehealth_user_role') || null;
    this.currentAuthUser = null;   // Populated when Supabase Auth session is active
    this.selectedScreeningType = 'human_general';
    this.capturedImages = [];
    this.activeCase = null;
    this.allCases = [];
    this.lastScreeningResult = null;
  }

  async init() {
    console.log('[OneHealthApp] Starting ONEHEALTH AI Application...');

    // 1. Initialize IndexedDB & Sync Engine
    await window.oneHealthDB.init();
    window.oneHealthSync.init();

    // 2. Setup Service Worker for offline PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./service-worker.js')
        .then((reg) => console.log('[ServiceWorker] Registered:', reg.scope))
        .catch((err) => console.warn('[ServiceWorker] Registration failed:', err));
    }

    // 3. Setup UI Listeners & Sync Handlers
    this.setupEventListeners();
    this.setupSyncListeners();

    // 4. Initialize i18n
    window.oneHealthI18n.applyTranslations();

    // 5. Initialize Supabase Auth (restores session & sets up listeners)
    if (window.oneHealthAuth) {
      window.oneHealthAuth.init();
    }

    // 6. Apply User Role (from saved preference or auth)
    if (!this.userRole) {
      this.userRole = 'patient';
    }
    this.applyUserRole(this.userRole, false);

    // 7. Initial Data Load & Pending Sync Count
    await this.updatePendingSyncCount();

    // Trigger auto sync if online
    if (navigator.onLine) {
      window.oneHealthSync.triggerAutoSync(true);
    }
  }

  // =========================================================================
  // ROLE MANAGEMENT & DYNAMIC UI CUSTOMIZATION
  // =========================================================================
  openRoleModal() {
    const modal = document.getElementById('roleSelectionModal');
    if (modal) {
      window.oneHealthI18n.applyTranslations();
      modal.style.display = 'flex';
    }
  }

  closeRoleModal() {
    const modal = document.getElementById('roleSelectionModal');
    if (modal) modal.style.display = 'none';
  }

  setUserRole(role) {
    this.userRole = role;
    localStorage.setItem('onehealth_user_role', role);
    this.closeRoleModal();
    this.applyUserRole(role, true);
    this.showToast(`${window.oneHealthI18n.t(role === 'doctor' ? 'role_doctor' : role === 'vet' ? 'role_vet' : 'role_patient')}`);
  }

  /**
   * Called by auth-ui.js after successful Supabase sign-in/sign-up.
   * Updates the app role and stores the authenticated user profile.
   */
  setUserRoleFromAuth(role, authUser) {
    this.currentAuthUser = authUser || null;
    const validRole = ['patient', 'doctor', 'vet', 'health_worker'].includes(role) ? role : 'patient';
    const mappedRole = validRole === 'health_worker' ? 'patient' : validRole;
    this.userRole = mappedRole;
    localStorage.setItem('onehealth_user_role', mappedRole);
    this.applyUserRole(mappedRole, true);
  }

  applyUserRole(role, navigate = true) {
    const roleIcon = document.getElementById('roleBadgeIcon');
    const roleText = document.getElementById('roleBadgeText');
    const subtitle = document.getElementById('headerRoleSubtitle');

    if (role === 'doctor') {
      if (roleIcon) roleIcon.innerText = '🩺';
      if (roleText) roleText.innerText = window.oneHealthI18n.t('role_doctor');
      if (subtitle) subtitle.innerText = window.oneHealthI18n.t('portal_title');
    } else if (role === 'vet') {
      if (roleIcon) roleIcon.innerText = '🐄';
      if (roleText) roleText.innerText = window.oneHealthI18n.t('role_vet');
      if (subtitle) subtitle.innerText = window.oneHealthI18n.t('cat_livestock');
    } else {
      if (roleIcon) roleIcon.innerText = '👤';
      if (roleText) roleText.innerText = window.oneHealthI18n.t('role_patient');
      if (subtitle) subtitle.innerText = window.oneHealthI18n.t('app_subtitle');
    }

    this.renderBottomNavigation(role);

    if (navigate) {
      if (role === 'doctor' || role === 'vet') {
        this.navigateTo('portal');
      } else {
        this.navigateTo('home');
      }
    }
  }

  renderBottomNavigation(role) {
    const nav = document.getElementById('appBottomNav');
    if (!nav) return;

    const t = (k) => window.oneHealthI18n.t(k);

    if (role === 'doctor') {
      nav.innerHTML = `
        <button class="nav-item" data-view="portal" onclick="window.oneHealthApp.navigateTo('portal')">
          <span class="nav-icon">👨‍⚕️</span>
          <span>${t('nav_portal')}</span>
        </button>
        <button class="nav-item" data-view="cases" onclick="window.oneHealthApp.navigateTo('cases')">
          <span class="nav-icon">📂</span>
          <span>${t('nav_cases')}</span>
        </button>
        <button class="nav-item" data-view="clinic_profile" onclick="window.oneHealthApp.navigateTo('clinic_profile')">
          <span class="nav-icon">📍</span>
          <span>${t('nav_clinic_profile')}</span>
        </button>
        <button class="nav-item" data-view="analytics" onclick="window.oneHealthApp.navigateTo('analytics')">
          <span class="nav-icon">📊</span>
          <span>${t('nav_analytics')}</span>
        </button>
      `;
    } else if (role === 'vet') {
      nav.innerHTML = `
        <button class="nav-item" data-view="portal" onclick="window.oneHealthApp.navigateTo('portal')">
          <span class="nav-icon">🐄</span>
          <span>${t('nav_portal')}</span>
        </button>
        <button class="nav-item" data-view="cases" onclick="window.oneHealthApp.navigateTo('cases')">
          <span class="nav-icon">📂</span>
          <span>${t('nav_cases')}</span>
        </button>
        <button class="nav-item" data-view="clinic_profile" onclick="window.oneHealthApp.navigateTo('clinic_profile')">
          <span class="nav-icon">📍</span>
          <span>${t('nav_clinic_profile')}</span>
        </button>
        <button class="nav-item" data-view="analytics" onclick="window.oneHealthApp.navigateTo('analytics')">
          <span class="nav-icon">📊</span>
          <span>${t('nav_analytics')}</span>
        </button>
      `;
    } else {
      nav.innerHTML = `
        <button class="nav-item" data-view="home" onclick="window.oneHealthApp.navigateTo('home')">
          <span class="nav-icon">🏠</span>
          <span>${t('nav_home')}</span>
        </button>
        <button class="nav-item" data-view="screen" onclick="window.oneHealthApp.navigateTo('screen')">
          <span class="nav-icon">➕</span>
          <span>${t('nav_screen')}</span>
        </button>
        <button class="nav-item" data-view="doctors" onclick="window.oneHealthApp.navigateTo('doctors')">
          <span class="nav-icon">📍</span>
          <span>${t('nav_doctors')}</span>
        </button>
        <button class="nav-item" data-view="cases" onclick="window.oneHealthApp.navigateTo('cases')">
          <span class="nav-icon">📂</span>
          <span>${t('nav_cases')}</span>
        </button>
        <button class="nav-item" data-view="analytics" onclick="window.oneHealthApp.navigateTo('analytics')">
          <span class="nav-icon">📊</span>
          <span>${t('nav_analytics')}</span>
        </button>
      `;
    }
  }

  // --- NAVIGATION & ROUTING ---
  navigateTo(viewId) {
    this.currentView = viewId;

    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-view') === viewId);
    });

    document.querySelectorAll('.view-section').forEach(el => {
      el.classList.remove('active');
    });

    const target = document.getElementById(`view-${viewId}`);
    if (target) {
      target.classList.add('active');
      window.scrollTo(0, 0);
    }

    window.oneHealthI18n.applyTranslations();

    if (viewId === 'cases') {
      this.loadCasesList();
    } else if (viewId === 'portal') {
      this.loadPortalQueue();
    } else if (viewId === 'doctors') {
      this.loadDoctorsDirectory();
    } else if (viewId === 'clinic_profile') {
      this.loadClinicProfileForm();
    } else if (viewId === 'analytics') {
      this.loadAnalytics();
    } else if (viewId === 'screen') {
      this.renderScreeningForm();
    }
  }

  setupEventListeners() {
    const langSelect = document.getElementById('langSelect');
    if (langSelect) {
      langSelect.value = window.oneHealthI18n.currentLang;
      langSelect.addEventListener('change', (e) => {
        const newLang = e.target.value;
        window.oneHealthI18n.setLanguage(newLang);
        this.applyUserRole(this.userRole, false);
        window.oneHealthI18n.applyTranslations();
        this.navigateTo(this.currentView);
        this.showToast(newLang === 'mr' ? 'भाषा मराठी निवडली' : newLang === 'hi' ? 'भाषा हिंदी चुनी गई' : 'Language set to English');
      });
    }

    const btnManualSync = document.getElementById('btnManualSync');
    if (btnManualSync) {
      btnManualSync.addEventListener('click', () => {
        window.oneHealthSync.triggerAutoSync(false);
      });
    }

    const searchInput = document.getElementById('caseSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', () => this.filterCases());
    }
    const filterType = document.getElementById('caseFilterType');
    if (filterType) {
      filterType.addEventListener('change', () => this.filterCases());
    }
    const filterRisk = document.getElementById('caseFilterRisk');
    if (filterRisk) {
      filterRisk.addEventListener('change', () => this.filterCases());
    }
  }

  setupSyncListeners() {
    window.oneHealthSync.onStatusChange(async (event) => {
      const statusDot = document.getElementById('networkDot');
      const statusText = document.getElementById('networkText');

      if (event.type === 'network_status') {
        if (event.isOnline) {
          statusDot.className = 'status-dot';
          statusText.innerText = window.oneHealthI18n.t('status_online');
        } else {
          statusDot.className = 'status-dot offline';
          statusText.innerText = window.oneHealthI18n.t('status_offline');
        }
        if (this.currentView === 'doctors') this.loadDoctorsDirectory();
      } else if (event.type === 'sync_success') {
        this.showToast(`Synced ${event.casesSynced} cases successfully.`);
        await this.updatePendingSyncCount();
        if (this.currentView === 'cases') this.loadCasesList();
        if (this.currentView === 'portal') this.loadPortalQueue();
      } else if (event.type === 'standalone_notice' || event.type === 'sync_error') {
        this.showToast(event.message);
      }
    });
  }

  async updatePendingSyncCount() {
    const count = await window.oneHealthDB.countPendingSync();
    const badge = document.getElementById('pendingSyncCount');
    if (badge) {
      badge.innerText = count > 0 ? `${count} Pending` : 'All Synced';
      badge.style.backgroundColor = count > 0 ? '#f97316' : '#0284c7';
    }
  }

  showToast(message) {
    const toast = document.getElementById('toastNotification');
    if (toast) {
      toast.innerText = message;
      toast.classList.add('active');
      setTimeout(() => toast.classList.remove('active'), 3500);
    }
  }

  // =========================================================================
  // GPS LOCATION TOGGLE & PROXIMITY
  // =========================================================================
  async toggleGPSLocation() {
    const btn = document.getElementById('btnToggleGPS');
    const textEl = document.getElementById('gpsBtnText');
    if (textEl) textEl.innerText = 'Acquiring GPS...';

    const res = await window.oneHealthLocation.requestGPSLocation();
    if (res.success) {
      if (btn) btn.classList.add('btn-primary');
      if (textEl) textEl.innerText = window.oneHealthI18n.t('btn_gps_active');
      this.showToast(`GPS Location Acquired (Accuracy: ${Math.round(res.coords.accuracy)}m)`);
    } else {
      if (textEl) textEl.innerText = window.oneHealthI18n.t('btn_use_gps');
      this.showToast(res.error || 'GPS unavailable. Showing village based distances.');
    }
    await this.loadDoctorsDirectory();
  }

  // =========================================================================
  // NEARBY DOCTORS & VETS DIRECTORY (GPS & Explainable Recommendations)
  // =========================================================================
  async loadDoctorsDirectory() {
    const container = document.getElementById('doctorsListContainer');
    if (!container) return;

    const t = (k) => window.oneHealthI18n.t(k);
    const lang = window.oneHealthI18n.currentLang;

    const villageFilter = document.getElementById('doctorVillageFilter') ? document.getElementById('doctorVillageFilter').value : '';
    const roleFilter = document.getElementById('doctorRoleFilter') ? document.getElementById('doctorRoleFilter').value : '';
    
    // If online, sync latest verified doctors from backend/Supabase
    if (navigator.onLine) {
      try {
        const resp = await fetch('/api/professionals/directory');
        if (resp.ok) {
          const serverDocs = await resp.json();
          if (Array.isArray(serverDocs) && serverDocs.length > 0) {
            for (const doc of serverDocs) {
              await window.oneHealthDB.saveDoctor(doc);
            }
          }
        }
      } catch (err) {
        console.warn('[Directory Sync] Fallback to cached IndexedDB:', err);
      }
    }

    const allDocs = await window.oneHealthDB.getAllDoctors(roleFilter || null);
    const ranked = window.oneHealthLocation.rankDoctors(allDocs, {
      targetVillage: villageFilter,
      targetRole: roleFilter || null,
      recommendedSpecialty: this.lastScreeningResult ? this.lastScreeningResult.recommended_specialty : null
    });

    if (ranked.length === 0) {
      container.innerHTML = `<p class="text-muted" style="text-align:center; padding:30px;">${lang === 'mr' ? 'कोणतेही दवाखाने आढळले नाहीत.' : lang === 'hi' ? 'कोई क्लिनिक नहीं मिला।' : 'No registered healthcare or veterinary facilities found matching your criteria.'}</p>`;
      return;
    }

    container.innerHTML = ranked.map(doc => {
      const isVet = doc.role === 'vet';
      const icon = isVet ? '🐄' : '🩺';
      const badgeClass = isVet ? 'badge-green' : 'badge-yellow';
      const isFree = (doc.consultation_fee || '').toLowerCase().includes('free') || (doc.consultation_fee || '').includes('मोफत') || (doc.consultation_fee || '').includes('निःशुल्क');

      // Availability state badge
      const availState = doc.effectiveAvailability || 'AVAILABLE';
      let availClass = 'avail-available';
      let availText = '🟢 Available';
      if (availState === 'BUSY') {
        availClass = 'avail-busy';
        availText = '🟡 Busy (In OPD)';
      } else if (availState === 'OFFLINE') {
        availClass = 'avail-offline';
        availText = '⚪ Off-Duty';
      } else if (availState === 'UNKNOWN') {
        availClass = 'avail-unknown';
        availText = '🔘 Unknown';
      }

      const labelHospital = lang === 'mr' ? '🏥 दवाखाना / रुग्णालय:' : lang === 'hi' ? '🏥 अस्पताल / क्लिनिक:' : '🏥 Hospital / Clinic:';
      const labelAddress = lang === 'mr' ? '📍 पत्ता:' : lang === 'hi' ? '📍 पता:' : '📍 Address:';
      const labelTimings = lang === 'mr' ? '🕒 वेळ:' : lang === 'hi' ? '🕒 समय:' : '🕒 OPD Timings:';
      const labelLanguages = lang === 'mr' ? '🗣️ भाषा:' : lang === 'hi' ? '🗣️ भाषाएं:' : '🗣️ Languages:';
      const labelSpecialization = lang === 'mr' ? '🔬 विशेष तज्ज्ञता:' : lang === 'hi' ? '🔬 विशेषज्ञता:' : '🔬 Specialization:';
      const labelFacilities = lang === 'mr' ? '🛠️ उपलब्ध सुविधा:' : lang === 'hi' ? '🛠️ सुविधाएं:' : '🛠️ Facilities:';

      return `
        <div class="doctor-card">
          <div class="doc-header">
            <div>
              <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                <span style="font-size:20px;">${icon}</span>
                <strong class="doc-name">${doc.name}</strong>
                ${doc.calculatedDistanceKm !== null ? `<span class="distance-badge">📍 ${doc.calculatedDistanceKm} km away</span>` : ''}
              </div>
              <div class="doc-title-sub">${doc.title || (isVet ? 'Veterinary Surgeon' : 'Medical Officer')}</div>
            </div>
            <div style="text-align:right;">
              <span class="avail-badge ${availClass}">${availText}</span>
              ${doc.cacheNote ? `<div style="font-size:10px; color:#64748b; margin-top:2px;">${doc.cacheNote}</div>` : ''}
            </div>
          </div>

          <!-- Explainable Recommendation Reason Box -->
          ${(doc.recommendationReasons && doc.recommendationReasons.length > 0) ? `
            <div class="recommendation-box">
              <strong>💡 Recommended because:</strong>
              <ul>
                ${doc.recommendationReasons.slice(0, 3).map(r => `<li>${r}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          <!-- Tags: Education, Reg, Experience, Fee -->
          <div class="doc-tags-row">
            <span class="doc-tag exp">🎓 ${doc.education || 'Medical Degree'}</span>
            ${doc.medical_reg_no ? `<span class="doc-tag">📜 ${lang === 'mr' ? 'नोंदणी' : lang === 'hi' ? 'पंजीकरण' : 'Reg'}: ${doc.medical_reg_no}</span>` : ''}
            ${doc.experience_years ? `<span class="doc-tag exp">⏱️ ${doc.experience_years} ${lang === 'mr' ? 'वर्षे अनुभव' : lang === 'hi' ? 'वर्ष अनुभव' : 'Yrs Exp'}</span>` : ''}
            <span class="doc-tag ${isFree ? 'fee-free' : 'fee-paid'}">💰 ${doc.consultation_fee || 'Standard'}</span>
            <span class="doc-tag">📍 ${doc.village}</span>
          </div>

          <!-- Detailed Info Grid -->
          <div class="doc-info-grid">
            <div class="doc-info-item">
              <strong>${labelHospital}</strong> ${doc.clinic_name}
            </div>
            <div class="doc-info-item">
              <strong>${labelAddress}</strong> ${doc.address}
            </div>
            <div class="doc-info-item">
              <strong>${labelTimings}</strong> ${doc.opd_timings}
            </div>
            <div class="doc-info-item">
              <strong>${labelLanguages}</strong> ${doc.languages || 'Marathi, Hindi, English'}
            </div>
            ${doc.specialization ? `
              <div class="doc-info-item" style="grid-column: 1 / -1;">
                <strong>${labelSpecialization}</strong> ${doc.specialization}
              </div>
            ` : ''}
            ${doc.facilities ? `
              <div class="doc-info-item" style="grid-column: 1 / -1;">
                <strong>${labelFacilities}</strong> ${doc.facilities}
              </div>
            ` : ''}
          </div>

          <!-- Action Buttons -->
          <div class="doc-actions">
            <a href="tel:${doc.phone.replace(/[^0-9+]/g, '')}" class="btn-call">
              📞 ${t('btn_call_doc')} ${doc.phone}
            </a>
            ${doc.whatsapp ? `
              <a href="https://wa.me/${doc.whatsapp.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(doc.name)},%20I%20would%20like%20to%20consult%20regarding%20a%20health%20screening." target="_blank" class="btn-whatsapp">
                💬 ${t('btn_whatsapp_doc')}
              </a>
            ` : ''}
            <button class="btn-video-call" onclick='window.oneHealthApp.launchVideoConsult(${JSON.stringify(doc).replace(/'/g, "&apos;")})'>
              📹 ${t('btn_video_consult')}
            </button>
            <button class="btn btn-outline btn-sm" onclick="window.oneHealthApp.referDirectlyToDoctor('${doc.name}', '${doc.role}')">
              📋 ${t('btn_consult_doc')}
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  launchVideoConsult(doctorObj) {
    window.oneHealthWebRTC.startConsultation(doctorObj, this.activeCase, this.userRole || 'patient');
  }

  async launchDoctorVideoVisit(caseId) {
    const caseData = await window.oneHealthDB.getCase(caseId);
    const doctorProfile = (await window.oneHealthDB.getSetting('doctor_profile_data', null)) || {
      name: "Attending Physician / Vet",
      clinic_name: "Clinical Station Video OPD",
      id: "DOC-STATION"
    };
    window.oneHealthWebRTC.startConsultation(doctorProfile, caseData, 'doctor');
  }

  referDirectlyToDoctor(doctorName, role) {
    const lang = window.oneHealthI18n.currentLang;
    const msg = lang === 'mr' ? `${doctorName} यांच्याकडे सल्ला मागितला आहे. तपासणी सुरू करत आहोत...` : lang === 'hi' ? `${doctorName} से परामर्श के लिए जांच शुरू कर रहे हैं...` : `Consultation request flagged for ${doctorName}. Starting screening...`;
    this.showToast(msg);
    this.selectedScreeningType = role === 'vet' ? 'livestock' : 'human_general';
    this.navigateTo('screen');
  }

  // =========================================================================
  // OFFLINE AI ASSISTANT CHAT HANDLERS
  // =========================================================================
  openAIAssistant() {
    const drawer = document.getElementById('aiAssistantDrawer');
    if (!drawer) return;
    drawer.style.display = 'flex';

    if (window.oneHealthAIAssistant.chatHistory.length === 0) {
      const lang = window.oneHealthI18n.currentLang;
      const greeting = window.oneHealthAIAssistant.formatGreetingResponse(lang);
      this.appendAssistantBubble({ text: greeting, timestamp: 'Now' });
    }
  }

  closeAIAssistant() {
    const drawer = document.getElementById('aiAssistantDrawer');
    if (drawer) drawer.style.display = 'none';
  }

  async sendAIMessage() {
    const input = document.getElementById('aiChatInput');
    if (!input || !input.value.trim()) return;

    const userText = input.value.trim();
    input.value = '';

    // Append user message to UI
    this.appendUserBubble(userText);

    // Process on-device offline
    const response = await window.oneHealthAIAssistant.processUserMessage(userText);
    if (response) {
      this.appendAssistantBubble(response);
    }
  }

  startAIVoiceInput() {
    window.oneHealthVoice.startListening((transcript) => {
      const input = document.getElementById('aiChatInput');
      if (input) {
        input.value = transcript;
        this.sendAIMessage();
      }
    });
  }

  appendUserBubble(text) {
    const container = document.getElementById('aiChatMessages');
    if (!container) return;

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble user';
    bubble.innerText = text;
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
  }

  appendAssistantBubble(data) {
    const container = document.getElementById('aiChatMessages');
    if (!container) return;

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble assistant';

    let html = `<div style="white-space:pre-line;">${data.text}</div>`;

    if (data.matchingDoctors && data.matchingDoctors.length > 0) {
      html += `<div style="margin-top:10px; border-top:1px solid #e2e8f0; padding-top:8px;">
        <strong style="font-size:12px; color:#0f766e;">Matched Doctors in Directory:</strong>`;
      for (const d of data.matchingDoctors) {
        html += `
          <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:6px 8px; margin-top:6px; font-size:12px;">
            <strong>${d.name}</strong> (${d.education})<br>
            📍 ${d.village} • 💰 ${d.consultation_fee}<br>
            <a href="tel:${d.phone}" style="color:#0284c7; font-weight:700; text-decoration:none;">📞 Call ${d.phone}</a>
          </div>
        `;
      }
      html += `</div>`;
    }

    if (data.suggestedAction) {
      if (data.suggestedAction.type === 'start_screening') {
        html += `
          <button class="btn btn-primary btn-sm" style="margin-top:10px; width:100%;" onclick="window.oneHealthApp.switchScreeningType('${data.suggestedAction.category}'); window.oneHealthApp.closeAIAssistant(); window.oneHealthApp.navigateTo('screen');">
            ⚡ Open ${data.suggestedAction.category.replace('_', ' ').toUpperCase()} Screening Form ➔
          </button>
        `;
      } else if (data.suggestedAction.type === 'view_directory') {
        html += `
          <button class="btn btn-secondary btn-sm" style="margin-top:10px; width:100%;" onclick="window.oneHealthApp.closeAIAssistant(); window.oneHealthApp.navigateTo('doctors');">
            📍 Open Local Doctor Directory ➔
          </button>
        `;
      }
    }

    bubble.innerHTML = html;
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;

    // Optional voice playback of key advice
    if (data.symptomsDetected && data.symptomsDetected.length > 0) {
      window.oneHealthVoice.speak("Symptoms recorded. Please complete the on-device screening form.");
    }
  }

  // =========================================================================
  // DOCTOR / VET CLINIC PROFILE (Location & Full Credentials Setup)
  // =========================================================================
  async loadClinicProfileForm() {
    const roleBadge = document.getElementById('profileRoleBadge');
    if (roleBadge) {
      roleBadge.innerText = this.userRole === 'vet' ? window.oneHealthI18n.t('role_vet') : window.oneHealthI18n.t('role_doctor');
    }

    let savedProfile = await window.oneHealthDB.getSetting('doctor_profile_data', null);

    // If opening on a new device, fetch existing profile from backend/Supabase
    if (!savedProfile && navigator.onLine) {
      try {
        const resp = await fetch('/api/professionals/directory?role=' + (this.userRole || 'doctor'));
        if (resp.ok) {
          const list = await resp.json();
          const myPhone = localStorage.getItem('onehealth_doctor_phone');
          if (myPhone) {
            savedProfile = list.find(d => d.phone && d.phone.includes(myPhone));
          }
          if (!savedProfile && list.length > 0) {
            // Prepopulate with primary doctor for role
            savedProfile = list[0];
          }
        }
      } catch (e) {
        console.warn('[Profile Sync] Note:', e);
      }
    }

    if (savedProfile) {
      document.getElementById('prof_name').value = savedProfile.name || '';
      document.getElementById('prof_title').value = savedProfile.title || '';
      document.getElementById('prof_reg_no').value = savedProfile.medical_reg_no || '';
      document.getElementById('prof_education').value = savedProfile.education || '';
      document.getElementById('prof_experience').value = savedProfile.experience_years || '';
      document.getElementById('prof_specialization').value = savedProfile.specialization || '';
      document.getElementById('prof_fee').value = savedProfile.consultation_fee || '';
      document.getElementById('prof_clinic').value = savedProfile.clinic_name || '';
      document.getElementById('prof_village').value = savedProfile.village || '';
      document.getElementById('prof_pincode').value = savedProfile.pincode || '';
      document.getElementById('prof_address').value = savedProfile.address || '';
      document.getElementById('prof_phone').value = savedProfile.phone || '';
      document.getElementById('prof_whatsapp').value = savedProfile.whatsapp || '';
      document.getElementById('prof_timings').value = savedProfile.opd_timings || '';
      document.getElementById('prof_languages').value = savedProfile.languages || '';
      document.getElementById('prof_facilities').value = savedProfile.facilities || '';
    }
  }

  async saveDoctorProfile(event) {
    event.preventDefault();

    const phoneVal = document.getElementById('prof_phone').value.trim();
    const existingProfile = await window.oneHealthDB.getSetting('doctor_profile_data', null);
    const profileId = (existingProfile && existingProfile.id) ? existingProfile.id : `DOC-${Date.now().toString(36).toUpperCase()}`;

    const profile = {
      id: profileId,
      role: this.userRole || 'doctor',
      name: document.getElementById('prof_name').value.trim(),
      title: document.getElementById('prof_title').value.trim(),
      medical_reg_no: document.getElementById('prof_reg_no').value.trim(),
      education: document.getElementById('prof_education').value.trim(),
      experience_years: parseInt(document.getElementById('prof_experience').value) || 1,
      specialization: document.getElementById('prof_specialization').value.trim(),
      consultation_fee: document.getElementById('prof_fee').value.trim(),
      clinic_name: document.getElementById('prof_clinic').value.trim(),
      village: document.getElementById('prof_village').value.trim(),
      pincode: document.getElementById('prof_pincode').value.trim(),
      address: document.getElementById('prof_address').value.trim(),
      phone: phoneVal,
      whatsapp: document.getElementById('prof_whatsapp').value.trim(),
      opd_timings: document.getElementById('prof_timings').value.trim(),
      languages: document.getElementById('prof_languages').value.trim(),
      facilities: document.getElementById('prof_facilities').value.trim(),
      coordinates: window.oneHealthLocation.getVillageCoordinates(document.getElementById('prof_village').value.trim()),
      availability_state: "AVAILABLE",
      last_status_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      verified: true
    };

    localStorage.setItem('onehealth_doctor_phone', phoneVal);
    await window.oneHealthDB.saveSetting('doctor_profile_data', profile);
    await window.oneHealthDB.saveDoctor(profile);

    // Sync to backend / Supabase so other devices see the doctor immediately
    if (navigator.onLine) {
      try {
        await fetch('/api/professionals/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profile)
        });
      } catch (err) {
        console.warn('[Doctor Sync] Queued offline:', err);
      }
    }

    const lang = window.oneHealthI18n.currentLang;
    this.showToast(lang === 'mr' ? 'माहिती सुरक्षित जतन झाली व सर्व उपकरणांवर सिंक झाली!' : lang === 'hi' ? 'प्रोफाइल सुरक्षित सेव की गई और सभी उपकरणों पर सिंक हुई!' : 'Profile & Location saved and synchronized across all devices!');
    this.navigateTo('portal');
  }

  // =========================================================================
  // SCREENING FORM BUILDER & SUBMISSION
  // =========================================================================
  renderScreeningForm() {
    const container = document.getElementById('screeningFormContainer');
    if (!container) return;

    this.capturedImages = [];
    const t = (k) => window.oneHealthI18n.t(k);
    const lang = window.oneHealthI18n.currentLang;

    let typeTitle = t('cat_human');
    let icon = "🩺";
    if (this.selectedScreeningType === 'child_development') {
      typeTitle = t('cat_child');
      icon = "👶";
    } else if (this.selectedScreeningType === 'livestock') {
      typeTitle = t('cat_livestock');
      icon = "🐄";
    }

    const lblSubject = this.selectedScreeningType === 'livestock' ? t('lbl_subject_name_vet') : t('lbl_subject_name_human');
    const lblAge = this.selectedScreeningType === 'child_development' ? t('lbl_age_child') : t('lbl_age_human');
    const lblGuardian = this.selectedScreeningType === 'livestock' ? t('lbl_guardian_vet') : t('lbl_guardian_human');

    container.innerHTML = `
      <div class="card-box">
        <div class="form-title-bar">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:24px;">${icon}</span>
            <h3 class="form-title">${typeTitle}</h3>
          </div>
          <div style="display:flex; gap:6px;">
            <button type="button" class="btn btn-outline btn-sm" onclick="window.oneHealthApp.readFormAloud()">
              🔊 ${t('btn_listen')}
            </button>
            <select class="form-control" style="width:auto; padding:4px 8px;" id="typeSwitcher" onchange="window.oneHealthApp.switchScreeningType(this.value)">
              <option value="human_general" ${this.selectedScreeningType === 'human_general' ? 'selected' : ''}>${t('cat_human')}</option>
              <option value="child_development" ${this.selectedScreeningType === 'child_development' ? 'selected' : ''}>${t('cat_child')}</option>
              <option value="livestock" ${this.selectedScreeningType === 'livestock' ? 'selected' : ''}>${t('cat_livestock')}</option>
            </select>
          </div>
        </div>

        <form id="activeScreeningForm" onsubmit="window.oneHealthApp.handleScreeningSubmit(event)">
          <!-- Subject Demographics -->
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${lblSubject}</label>
              <input type="text" class="form-control" id="f_subject_name" required placeholder="${this.selectedScreeningType === 'livestock' ? 'HF Cow #402 / INAPH Tag' : 'Ramesh Thorat'}">
            </div>
            <div class="form-group">
              <label class="form-label">${lblAge}</label>
              <input type="${this.selectedScreeningType === 'child_development' ? 'number' : 'text'}" class="form-control" id="f_age" required placeholder="${this.selectedScreeningType === 'child_development' ? '14' : '42'}">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${this.selectedScreeningType === 'livestock' ? t('lbl_species') : t('lbl_gender')}</label>
              ${this.selectedScreeningType === 'livestock' ? `
                <select class="form-control" id="f_species">
                  <option value="Cattle (Crossbred HF/Jersey)">Cattle (Crossbred HF/Jersey / संकरित गाय)</option>
                  <option value="Cattle (Indigenous Gir/Khillar)">Cattle (Indigenous Gir/Khillar / देशी गाय)</option>
                  <option value="Buffalo (Murrah/Jafarabadi)">Buffalo (Murrah/Jafarabadi / म्हैस)</option>
                  <option value="Goat (Osmanabadi/Sirohi)">Goat (Osmanabadi/Sirohi / शेळी)</option>
                  <option value="Sheep (Deccani/Madgyal)">Sheep (Deccani/Madgyal / मेंढी)</option>
                  <option value="Poultry (Broiler/Desi)">Poultry (Broiler/Desi / कुक्कुटपालन)</option>
                  <option value="Canine / Pet">Canine / Pet (श्वान/पाळीव)</option>
                </select>
              ` : `
                <select class="form-control" id="f_gender">
                  <option value="Male">${lang === 'mr' ? 'पुरुष (Male)' : lang === 'hi' ? 'पुरुष (Male)' : 'Male'}</option>
                  <option value="Female">${lang === 'mr' ? 'स्त्री (Female)' : lang === 'hi' ? 'महिला (Female)' : 'Female'}</option>
                  <option value="Other">${lang === 'mr' ? 'इतर (Other)' : lang === 'hi' ? 'अन्य (Other)' : 'Other'}</option>
                </select>
              `}
            </div>
            <div class="form-group">
              <label class="form-label">${t('lbl_village')}</label>
              <input type="text" class="form-control" id="f_village" required value="Kopargaon" placeholder="e.g. Pohegaon, Dhamori, Kopargaon">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${lblGuardian}</label>
              <input type="text" class="form-control" id="f_guardian" placeholder="e.g. Bhausaheb Vikhe">
            </div>
            <div class="form-group">
              <label class="form-label">${t('lbl_phone')}</label>
              <input type="tel" class="form-control" id="f_phone" placeholder="e.g. 9822114455">
            </div>
          </div>

          <!-- Dynamic Questions Section -->
          ${this.renderCategorySpecificFields()}

          <!-- Photo Capture & Visual Inspection -->
          <div class="form-group" style="margin-top: 16px;">
            <label class="form-label">📷 ${t('lbl_photo_capture')}</label>
            <input type="file" id="f_camera_input" accept="image/*" class="form-control" onchange="window.oneHealthApp.handleImageCapture(event)">
            <div id="imagePreviewContainer" style="display:flex; gap:10px; margin-top:8px; flex-wrap:wrap;"></div>
          </div>

          <!-- Submit Button -->
          <div style="margin-top: 24px;">
            <button type="submit" class="btn btn-primary btn-block" style="font-size:16px; padding:14px;">
              ⚡ ${t('btn_run_screening')}
            </button>
          </div>
        </form>
      </div>

      <div id="screeningResultContainer"></div>
    `;
  }

  switchScreeningType(type) {
    this.selectedScreeningType = type;
    this.renderScreeningForm();
  }

  renderCategorySpecificFields() {
    const lang = window.oneHealthI18n.currentLang;
    const t = (k) => window.oneHealthI18n.t(k);

    if (this.selectedScreeningType === 'human_general') {
      const lblTemp = lang === 'mr' ? 'तापमान (Temperature °F)' : lang === 'hi' ? 'तापमान (Temperature °F)' : 'Temperature (°F)';
      const lblBP = lang === 'mr' ? 'रक्तदाब (BP Systolic / Diastolic)' : lang === 'hi' ? 'ब्लड प्रेशर (Systolic / Diastolic)' : 'Blood Pressure (Systolic / Diastolic)';
      const lblPulseSpo2 = lang === 'mr' ? 'नाडीचे ठोके (Pulse bpm) व SpO2 (%)' : lang === 'hi' ? 'पल्स (Pulse bpm) व SpO2 (%)' : 'Pulse (bpm) & SpO2 (%)';
      const lblSugar = lang === 'mr' ? 'रक्तातील साखर (Blood Sugar mg/dL)' : lang === 'hi' ? 'ब्लड शुगर (Blood Sugar mg/dL)' : 'Random Blood Sugar (mg/dL)';

      const s_fever = lang === 'mr' ? 'थंडी वाजून तीव्र ताप येणे' : lang === 'hi' ? 'ठंड लगकर तेज बुखार आना' : 'High fever with chills / rigors';
      const s_eye = lang === 'mr' ? 'डोळ्यांच्या मागे तीव्र वेदना (Retro-orbital pain)' : lang === 'hi' ? 'आंखों के पीछे तेज दर्द' : 'Retro-orbital pain (behind eyes)';
      const s_rash = lang === 'mr' ? 'त्वचेवर लाल पुरळ / बारीक डाग (Rash/Petechiae)' : lang === 'hi' ? 'त्वचा पर लाल दाने / चकत्ते' : 'Skin rash or red petechial spots';
      const s_body = lang === 'mr' ? 'अंगदुखी व सांधेदुखी (Severe Bodyache)' : lang === 'hi' ? 'तेज बदन दर्द व जोड़ों में दर्द' : 'Severe joint / muscular bodyache';
      const s_cough = lang === 'mr' ? '२ आठवड्यांपेक्षा जास्त खोकला' : lang === 'hi' ? '2 सप्ताह से अधिक की खांसी' : 'Chronic cough > 2 weeks';
      const s_sweat = lang === 'mr' ? 'रात्री घाम येणे व वजन घटणे' : lang === 'hi' ? 'रात में पसीना व वजन कम होना' : 'Night sweats and weight loss';
      const s_diarrhea = lang === 'mr' ? 'वारंवार पातळ जुलाब होणे (>३ वेळा)' : lang === 'hi' ? 'बार-बार पतले दस्त होना (>3 बार)' : 'Frequent watery stools (>3/day)';
      const s_vomit = lang === 'mr' ? 'उलटी व मळमळ होणे' : lang === 'hi' ? 'उल्टी एवं जी मिचलाना' : 'Persistent vomiting and nausea';
      const s_step = lang === 'mr' ? 'सतत चढणारा ताप (Step-ladder fever)' : lang === 'hi' ? 'लगातार बढ़ता बुखार' : 'Step-ladder continuous fever';
      const s_ulcer = lang === 'mr' ? 'न भरणारी जखम / अल्सर' : lang === 'hi' ? 'न भरने वाला घाव / छाला' : 'Non-healing foot / skin ulcer';

      const rf_chest = lang === 'mr' ? 'छातीत तीव्र असह्य वेदना / दाब' : lang === 'hi' ? 'सीने में तेज दर्द या भारीपन' : 'Severe crushing chest pain';
      const rf_stroke = lang === 'mr' ? 'तोंडाचा कोपरा वाकडा होणे / बोलण्यात अडखळणे (पक्षाघात)' : lang === 'hi' ? 'चेहरे का टेढ़ा होना / बोली लड़खड़ाना (स्ट्रोक)' : 'Sudden face droop / speech slur (FAST Stroke)';
      const rf_breath = lang === 'mr' ? 'श्वास घेण्यास तीव्र त्रास होणे' : lang === 'hi' ? 'सांस लेने में भारी तकलीफ' : 'Severe resting breathlessness';
      const rf_sensorium = lang === 'mr' ? 'शुद्ध हरपणे / सुस्ती येणे' : lang === 'hi' ? 'बेहोशी / अत्यधिक सुस्ती' : 'Altered sensorium / drowsiness';

      return `
        <h4 style="font-size:14px; font-weight:700; margin:16px 0 8px 0; color:var(--secondary);">🩺 ${t('lbl_vitals')}</h4>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">${lblTemp}</label>
            <input type="number" step="0.1" class="form-control" id="v_temp" placeholder="98.6">
          </div>
          <div class="form-group">
            <label class="form-label">${lblBP}</label>
            <div style="display:flex; gap:6px;">
              <input type="number" class="form-control" id="v_bpsys" placeholder="120">
              <input type="number" class="form-control" id="v_bpdia" placeholder="80">
            </div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">${lblPulseSpo2}</label>
            <div style="display:flex; gap:6px;">
              <input type="number" class="form-control" id="v_pulse" placeholder="78">
              <input type="number" class="form-control" id="v_spo2" placeholder="98%">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">${lblSugar}</label>
            <input type="number" class="form-control" id="v_sugar" placeholder="110">
          </div>
        </div>

        <h4 style="font-size:14px; font-weight:700; margin:16px 0 8px 0; color:var(--text-main);">📋 ${t('lbl_symptoms')} (EkaCare BODHI-S & General)</h4>
        <div class="checkbox-grid">
          <label class="checkbox-label"><input type="checkbox" name="symptom" value="fever_chills"> ${s_fever}</label>
          <label class="checkbox-label"><input type="checkbox" name="symptom" value="eye_pain_retroorbital"> ${s_eye}</label>
          <label class="checkbox-label"><input type="checkbox" name="symptom" value="skin_rash_petechiae"> ${s_rash}</label>
          <label class="checkbox-label"><input type="checkbox" name="symptom" value="severe_bodyache"> ${s_body}</label>
          <label class="checkbox-label"><input type="checkbox" name="symptom" value="cough_chronic_2wks"> ${s_cough}</label>
          <label class="checkbox-label"><input type="checkbox" name="symptom" value="yellow_sputum_bronchitis"> 🔬 ${lang === 'mr' ? 'पिवळी/हिरवी थुंकी व खोकला (BODHI-S Bronchitis)' : lang === 'hi' ? 'पीला/हरा कफ व खांसी (BODHI-S)' : 'Productive cough with yellow/green sputum (BODHI-S)'}</label>
          <label class="checkbox-label"><input type="checkbox" name="symptom" value="night_sweats_weightloss"> ${s_sweat}</label>
          <label class="checkbox-label"><input type="checkbox" name="symptom" value="watery_diarrhea"> ${s_diarrhea}</label>
          <label class="checkbox-label"><input type="checkbox" name="symptom" value="epigastric_pain_pancreas"> 🔬 ${lang === 'mr' ? 'पोटात तीव्र कळा व पाठीत कळ मारणे (Pancreatitis)' : lang === 'hi' ? 'पेट में तेज दर्द जो पीठ तक जाए' : 'Severe epigastric pain radiating to back (BODHI-S)'}</label>
          <label class="checkbox-label"><input type="checkbox" name="symptom" value="jaundice_cholecystitis"> 🔬 ${lang === 'mr' ? 'कावीळ व पोटात उजव्या बाजूला दुखणे (Cholecystitis)' : lang === 'hi' ? 'पीलिया व दाईं ओर पेट दर्द' : 'Jaundice & Right upper quadrant pain (BODHI-S)'}</label>
          <label class="checkbox-label"><input type="checkbox" name="symptom" value="vomiting_nausea"> ${s_vomit}</label>
          <label class="checkbox-label"><input type="checkbox" name="symptom" value="stepladder_fever"> ${s_step}</label>
          <label class="checkbox-label"><input type="checkbox" name="symptom" value="non_healing_ulcer"> ${s_ulcer}</label>
        </div>

        <h4 style="font-size:14px; font-weight:700; margin:16px 0 8px 0; color:#991b1b;">🚨 ${t('lbl_red_flags')} (BODHI-S Emergency Indicators)</h4>
        <div class="checkbox-grid">
          <label class="checkbox-label red-flag"><input type="checkbox" name="redflag" value="chest_pain_severe"> ${rf_chest}</label>
          <label class="checkbox-label red-flag"><input type="checkbox" name="redflag" value="chest_discomfort_exertion"> 🔬 ${lang === 'mr' ? 'छातीत भरून येणे / चालताना धाप लागणे (Acute MI)' : lang === 'hi' ? 'सीने में भारीपन / चलने पर सांस फूलना (Acute MI)' : 'Crushing chest discomfort / aggravated on exertion (Acute MI)'}</label>
          <label class="checkbox-label red-flag"><input type="checkbox" name="redflag" value="pregnancy_bleeding_pain"> 🔬 ${lang === 'mr' ? 'गर्भारपणात तीव्र पोटदुखी / रक्तस्राव (Abruptio Placenta)' : lang === 'hi' ? 'गर्भावस्था में तेज दर्द / रक्तस्राव (Abruptio Placenta)' : 'Pregnancy bleeding / severe pain / tender uterus (Abruptio Placenta)'}</label>
          <label class="checkbox-label red-flag"><input type="checkbox" name="redflag" value="sudden_weakness_speech"> ${rf_stroke}</label>
          <label class="checkbox-label red-flag"><input type="checkbox" name="redflag" value="severe_breathlessness_rest"> ${rf_breath}</label>
          <label class="checkbox-label red-flag"><input type="checkbox" name="redflag" value="altered_consciousness"> ${rf_sensorium}</label>
        </div>
      `;
    } else if (this.selectedScreeningType === 'child_development') {
      const lblWeight = lang === 'mr' ? 'वजन (किलो ग्रॅम मध्ये) *' : lang === 'hi' ? 'वजन (किलोग्राम) *' : 'Weight (kg) *';
      const lblHeight = lang === 'mr' ? 'उंची / लांबी (सेंटीमीटर मध्ये) *' : lang === 'hi' ? 'लंबाई / ऊंचाई (सेमी) *' : 'Length / Height (cm) *';
      const lblMuac = lang === 'mr' ? 'दंडाचा घेर (MUAC cm)' : lang === 'hi' ? 'मध्य बांह की परिधि (MUAC cm)' : 'MUAC (cm)';
      const lblEdema = lang === 'mr' ? 'पायावर सूज आहे का (Edema)?' : lang === 'hi' ? 'पैरों में सूजन है क्या (Edema)?' : 'Bilateral Pitting Edema?';

      const optNoEdema = lang === 'mr' ? 'सूज नाही (No Edema)' : lang === 'hi' ? 'सूजन नहीं है' : 'No Edema';
      const optYesEdema = lang === 'mr' ? 'होय, सूज आहे (Yes, Edema)' : lang === 'hi' ? 'हाँ, दोनों पैरों में सूजन है' : 'Yes (Bilateral Swelling)';

      const m_title = lang === 'mr' ? '🌱 बाल विकासाचे ४ मुख्य टप्पे' : lang === 'hi' ? '🌱 बाल विकास के 4 मुख्य चरण' : '🌱 4-Domain Milestone Evaluations';
      const optAchieved = lang === 'mr' ? 'सामान्य / वयानुसार साध्य' : lang === 'hi' ? 'सामान्य / उम्र अनुसार सही' : 'Normal / Achieved for age';
      const optDelayed = lang === 'mr' ? 'विलंब / असमर्थ' : lang === 'hi' ? 'विलंबित / असमर्थ' : 'Delayed / Unable to perform';

      return `
        <h4 style="font-size:14px; font-weight:700; margin:16px 0 8px 0; color:var(--secondary);">📏 WHO मोजमापे</h4>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">${lblWeight}</label>
            <input type="number" step="0.1" class="form-control" id="c_weight" required placeholder="7.5">
          </div>
          <div class="form-group">
            <label class="form-label">${lblHeight}</label>
            <input type="number" step="0.1" class="form-control" id="c_height" required placeholder="72.0">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">${lblMuac}</label>
            <input type="number" step="0.1" class="form-control" id="c_muac" placeholder="11.2 (<11.5=SAM)">
          </div>
          <div class="form-group">
            <label class="form-label">${lblEdema}</label>
            <select class="form-control" id="c_edema">
              <option value="no">${optNoEdema}</option>
              <option value="yes">${optYesEdema}</option>
            </select>
          </div>
        </div>

        <h4 style="font-size:14px; font-weight:700; margin:16px 0 8px 0; color:var(--text-main);">${m_title}</h4>
        <div class="form-group">
          <label class="form-label">1. ${lang === 'mr' ? 'शारीरिक हालचाली (मान धरणे, बसणे, उभे राहणे, चालणे)' : lang === 'hi' ? 'शारीरिक विकास (गर्दन संभालना, बैठना, चलना)' : 'Gross Motor (Neck holding, sitting, standing, walking)'}</label>
          <select class="form-control" id="m_gross">
            <option value="achieved">${optAchieved}</option>
            <option value="delayed">${optDelayed}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">2. ${lang === 'mr' ? 'हातांची पकड व बारीक कामे (खेळणे धरणे, वस्तू उचलणे)' : lang === 'hi' ? 'सूक्ष्म विकास (खिलौना पकड़ना, वस्तुएं उठाना)' : 'Fine Motor (Grasping, picking objects)'}</label>
          <select class="form-control" id="m_fine">
            <option value="achieved">${optAchieved}</option>
            <option value="delayed">${optDelayed}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">3. ${lang === 'mr' ? 'भाषा व संवाद (आवाज काढणे, शब्द बोलणे)' : lang === 'hi' ? 'भाषा एवं संवाद (आवाज निकालना, शब्द बोलना)' : 'Language & Communication (Babbling, single words)'}</label>
          <select class="form-control" id="m_language">
            <option value="achieved">${optAchieved}</option>
            <option value="delayed">${optDelayed}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">4. ${lang === 'mr' ? 'सामाजिक व मानसिक प्रतिसाद (हसणे, ओळखणे, खेळणे)' : lang === 'hi' ? 'सामाजिक विकास (मुस्कुराना, पहचानना, खेलना)' : 'Social & Cognitive (Smiling, recognition)'}</label>
          <select class="form-control" id="m_social">
            <option value="achieved">${optAchieved}</option>
            <option value="delayed">${optDelayed}</option>
          </select>
        </div>
      `;
    } else if (this.selectedScreeningType === 'livestock') {
      const lblVetTemp = lang === 'mr' ? 'गुदा तापमान (Rectal Temp °F)' : lang === 'hi' ? 'पशु का तापमान (°F)' : 'Rectal Temperature (°F)';
      const lblHerdSize = lang === 'mr' ? 'गोठ्यातील जनावरांची संख्या' : lang === 'hi' ? 'कुल पशुओं की संख्या' : 'Number of Animals in Herd';

      const v_lsd = lang === 'mr' ? 'त्वचेवर कडक गाठी / फोड (LSD - लम्पी त्वचा रोग)' : lang === 'hi' ? 'त्वचा पर सख्त गांठें (लंपी स्किन रोग)' : 'Multiple firm skin nodules/lumps (LSD sign)';
      const v_milk = lang === 'mr' ? 'दुधात अचानक तीव्र घट (>५०%)' : lang === 'hi' ? 'दूध उत्पादन में अचानक भारी गिरावट (>50%)' : 'Sudden severe drop in milk production (>50%)';
      const v_saliva = lang === 'mr' ? 'तोंडातून फेसळ लाळ गळणे' : lang === 'hi' ? 'मुंह से झागदार लार गिरना' : 'Excessive frothy salivation & lip smacking';
      const v_fmd = lang === 'mr' ? 'तोंडात व जिभेवर फोड (लाळ्या खुरकूत / FMD)' : lang === 'hi' ? 'मुंह और जीभ पर छाले (खुरपका-मुंहपका)' : 'Blisters/ulcers in mouth or gums (FMD)';
      const v_hoof = lang === 'mr' ? 'खुरांच्या मध्ये जखमा व लंगडणे' : lang === 'hi' ? 'खुरों के बीच घाव और लंगड़ाना' : 'Foot lesions between hooves & lameness';
      const v_mastitis = lang === 'mr' ? 'कास सुजणे, गरम होणे व दुखणे (मस्तान रोग)' : lang === 'hi' ? 'अयन (थन) में सूजन, लाली व दर्द (थनैला)' : 'Swollen, hot, painful udder (Mastitis)';
      const v_clots = lang === 'mr' ? 'दुधात पिवळसर गुठळ्या किंवा रक्त येणे' : lang === 'hi' ? 'दूध में गांठें, छीछड़े या खून आना' : 'Milk with yellow clots, flakes, or blood';
      const v_bq = lang === 'mr' ? 'मांडीवर किंवा खांद्यावर कुरकुरीत वायू सूज (फऱ्या / BQ)' : lang === 'hi' ? 'जांघ या कंधे पर गैस वाली सूजन (ब्लैक क्वार्टर)' : 'Crepitating gas swelling on thigh/shoulder (BQ)';
      const v_hs = lang === 'mr' ? 'घशावर सूज व घोरल्यासारखा श्वास (घटसर्प / HS)' : lang === 'hi' ? 'गले पर सूजन व सांस लेने में खर्र-खर्र (गलघोंटू)' : 'Swollen throat / dewlap area with snoring';
      const v_ppr = lang === 'mr' ? 'शेळ्यांमध्ये दुर्गंधीयुक्त जुलाब व डोळ्यातून पाणी (PPR)' : lang === 'hi' ? 'बकरियों में बदबूदार दस्त व आंखों से स्राव (PPR)' : 'Foul diarrhea & ocular discharge (Goats/PPR)';
      const v_poultry = lang === 'mr' ? 'पक्ष्यांमध्ये रक्ताची विष्ठा व पंख लोंबणे' : lang === 'hi' ? 'मुर्गियों में खूनी दस्त व पंख लटकना' : 'Bloody droppings & drooping wings (Poultry)';

      return `
        <h4 style="font-size:14px; font-weight:700; margin:16px 0 8px 0; color:var(--secondary);">🩺 ${t('lbl_vitals')}</h4>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">${lblVetTemp}</label>
            <input type="number" step="0.1" class="form-control" id="vet_temp" placeholder="101.5">
          </div>
          <div class="form-group">
            <label class="form-label">${lblHerdSize}</label>
            <input type="number" class="form-control" id="vet_herd_size" value="1">
          </div>
        </div>

        <h4 style="font-size:14px; font-weight:700; margin:16px 0 8px 0; color:var(--text-main);">📋 ${t('lbl_symptoms')}</h4>
        <div class="checkbox-grid">
          <label class="checkbox-label"><input type="checkbox" name="vet_symptom" value="skin_nodules_lumps"> ${v_lsd}</label>
          <label class="checkbox-label"><input type="checkbox" name="vet_symptom" value="milk_drop_severe"> ${v_milk}</label>
          <label class="checkbox-label"><input type="checkbox" name="vet_symptom" value="salivation_frothing"> ${v_saliva}</label>
          <label class="checkbox-label"><input type="checkbox" name="vet_symptom" value="mouth_tongue_blisters"> ${v_fmd}</label>
          <label class="checkbox-label"><input type="checkbox" name="vet_symptom" value="hoof_lesions_lameness"> ${v_hoof}</label>
          <label class="checkbox-label"><input type="checkbox" name="vet_symptom" value="hard_swollen_udder"> ${v_mastitis}</label>
          <label class="checkbox-label"><input type="checkbox" name="vet_symptom" value="clots_blood_in_milk"> ${v_clots}</label>
          <label class="checkbox-label"><input type="checkbox" name="vet_symptom" value="crepitating_swelling_leg"> ${v_bq}</label>
          <label class="checkbox-label"><input type="checkbox" name="vet_symptom" value="swollen_throat_dewlap"> ${v_hs}</label>
          <label class="checkbox-label"><input type="checkbox" name="vet_symptom" value="nasal_discharge_foul_diarrhea"> ${v_ppr}</label>
          <label class="checkbox-label"><input type="checkbox" name="vet_symptom" value="bloody_droppings_birds"> ${v_poultry}</label>
        </div>
      `;
    }
  }

  async handleImageCapture(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const processed = await window.oneHealthCamera.processFileInput(file);
      this.capturedImages.push(processed.dataUrl);

      const previewBox = document.getElementById('imagePreviewContainer');
      if (previewBox) {
        const thumb = document.createElement('div');
        thumb.style.position = 'relative';
        thumb.innerHTML = `
          <img src="${processed.dataUrl}" style="width:75px; height:75px; object-fit:cover; border-radius:8px; border:2px solid #0f766e;">
          <span style="position:absolute; bottom:2px; right:2px; background:rgba(0,0,0,0.7); color:#fff; font-size:9px; padding:1px 4px; border-radius:4px;">${Math.round(processed.sizeBytes/1024)}KB</span>
        `;
        previewBox.appendChild(thumb);
      }
    } catch (err) {
      alert(`Could not process image: ${err.message}`);
    }
  }

  readFormAloud() {
    let msg = "Please enter patient name, age, village, and check symptoms.";
    if (this.selectedScreeningType === 'livestock') {
      msg = "Please enter animal tag number, species, rectal temperature, and check for skin nodules or swollen udder.";
    } else if (this.selectedScreeningType === 'child_development') {
      msg = "Please enter child's age in months, weight in kilograms, height, and check developmental milestones.";
    }

    if (window.oneHealthI18n.currentLang === 'mr') {
      msg = "कृपया रुग्णाचे किंवा जनावराचे नाव, वय, गाव आणि दिसणारी लक्षणे निवडा. माहिती भरून एआय तपासणी बटण दाबा.";
    } else if (window.oneHealthI18n.currentLang === 'hi') {
      msg = "कृपया मरीज या पशु का नाम, उम्र, गांव और लक्षण दर्ज करें। इसके बाद एआई जांच बटन दबाएं।";
    }

    window.oneHealthVoice.speak(msg);
  }

  async handleScreeningSubmit(event) {
    event.preventDefault();

    const subjectName = document.getElementById('f_subject_name').value.trim();
    const age = document.getElementById('f_age').value.trim();
    const village = document.getElementById('f_village').value.trim();
    const guardian = (document.getElementById('f_guardian') ? document.getElementById('f_guardian').value.trim() : '');
    const phone = (document.getElementById('f_phone') ? document.getElementById('f_phone').value.trim() : '');

    const caseId = `CASE-${Date.now().toString(36).toUpperCase()}`;
    let aiResult = null;
    let payload = {};

    if (this.selectedScreeningType === 'human_general') {
      const gender = document.getElementById('f_gender').value;
      const vitals = {
        temp_f: parseFloat(document.getElementById('v_temp').value) || 98.6,
        bp_systolic: parseFloat(document.getElementById('v_bpsys').value) || 120,
        bp_diastolic: parseFloat(document.getElementById('v_bpdia').value) || 80,
        pulse: parseFloat(document.getElementById('v_pulse').value) || 75,
        spo2: parseFloat(document.getElementById('v_spo2').value) || 98,
        blood_sugar_mgdl: parseFloat(document.getElementById('v_sugar').value) || 100
      };

      const symptoms = Array.from(document.querySelectorAll('input[name="symptom"]:checked')).map(cb => cb.value);
      const redFlags = Array.from(document.querySelectorAll('input[name="redflag"]:checked')).map(cb => cb.value);

      const allEvaluationSymptoms = [...symptoms, ...redFlags];
      payload = { vitals, symptoms: allEvaluationSymptoms, red_flags: redFlags, duration_days: 3 };
      aiResult = window.oneHealthAI.evaluateHumanGeneral(payload);

    } else if (this.selectedScreeningType === 'child_development') {
      const weight = parseFloat(document.getElementById('c_weight').value) || 8.0;
      const height = parseFloat(document.getElementById('c_height').value) || 72.0;
      const muac = parseFloat(document.getElementById('c_muac').value) || 13.0;
      const edema = document.getElementById('c_edema').value;

      const milestones = {
        gross_motor: document.getElementById('m_gross').value,
        fine_motor: document.getElementById('m_fine').value,
        language: document.getElementById('m_language').value,
        social_cognitive: document.getElementById('m_social').value
      };

      payload = { age_months: parseInt(age) || 12, weight_kg: weight, height_cm: height, muac_cm: muac, edema, milestones };
      aiResult = window.oneHealthAI.evaluateChildDevelopment(payload);

    } else if (this.selectedScreeningType === 'livestock') {
      const species = document.getElementById('f_species').value;
      const tempF = parseFloat(document.getElementById('vet_temp').value) || 101.5;
      const herdSize = parseInt(document.getElementById('vet_herd_size').value) || 1;
      const symptoms = Array.from(document.querySelectorAll('input[name="vet_symptom"]:checked')).map(cb => cb.value);

      payload = { species, rectal_temp_f: tempF, herd_size: herdSize, symptoms, duration_days: 2 };
      aiResult = window.oneHealthAI.evaluateLivestock(payload);
    }

    this.lastScreeningResult = aiResult;

    const caseRecord = {
      id: caseId,
      case_type: this.selectedScreeningType,
      subject_name: subjectName,
      age_or_dob: age,
      gender_or_sex: document.getElementById('f_gender') ? document.getElementById('f_gender').value : 'Animal',
      species: document.getElementById('f_species') ? document.getElementById('f_species').value : 'Human',
      tag_or_id: caseId,
      guardian_or_owner: guardian,
      contact_phone: phone,
      village: village,
      risk_level: aiResult.risk_level,
      triage_summary: aiResult.triage_summary,
      primary_condition: aiResult.primary_condition,
      confidence_score: aiResult.confidence_score,
      recommended_specialty: aiResult.recommended_specialty,
      data_payload: payload,
      images: this.capturedImages,
      status: (aiResult.risk_level === 'RED' || aiResult.risk_level === 'ORANGE') ? 'escalated' : 'screened',
      assigned_role: this.selectedScreeningType === 'livestock' ? 'vet' : 'doctor',
      client_created_at: new Date().toISOString(),
      is_synced: false,
      reviews: []
    };

    this.activeCase = caseRecord;

    await window.oneHealthDB.saveCase(caseRecord, true);
    await this.updatePendingSyncCount();

    if (navigator.onLine) {
      window.oneHealthSync.triggerAutoSync(true);
    }

    this.renderResultCard(caseRecord, aiResult, village);

    if (aiResult.risk_level === 'RED') {
      window.oneHealthVoice.speak(window.oneHealthI18n.currentLang === 'mr' ? "सावधान. आणीबाणीचा धोका आढळला आहे. तात्काळ ग्रामीण रुग्णालयात दाखल करा." : window.oneHealthI18n.currentLang === 'hi' ? "सावधान. आपातकालीन स्थिति पाई गई है। तुरंत अस्पताल ले जाएं।" : "Warning. Critical emergency risk identified. Please refer to Sub-District Hospital immediately.");
    } else {
      window.oneHealthVoice.speak(`${window.oneHealthI18n.currentLang === 'mr' ? 'तपासणी पूर्ण झाली.' : window.oneHealthI18n.currentLang === 'hi' ? 'जांच पूरी हुई।' : 'Screening completed.'} ${aiResult.primary_condition}.`);
    }
  }

  async renderResultCard(caseRecord, aiResult, village) {
    const resultBox = document.getElementById('screeningResultContainer');
    if (!resultBox) return;

    const lang = window.oneHealthI18n.currentLang;
    const t = (k) => window.oneHealthI18n.t(k);

    const allDocs = await window.oneHealthDB.getAllDoctors(caseRecord.assigned_role);
    const rankedDocs = window.oneHealthLocation.rankDoctors(allDocs, {
      targetVillage: village,
      targetRole: caseRecord.assigned_role,
      recommendedSpecialty: aiResult.recommended_specialty
    });

    const topDoc = rankedDocs.length > 0 ? rankedDocs[0] : null;

    resultBox.innerHTML = `
      <div class="result-box risk-${aiResult.risk_level}">
        <div class="result-header">
          <span class="badge badge-${aiResult.risk_level.toLowerCase()}">
            ${aiResult.risk_level} RISK (${lang === 'mr' ? 'विश्वासार्हता' : lang === 'hi' ? 'सटीकता' : 'Confidence'}: ${Math.round(aiResult.confidence_score * 100)}%)
          </span>
          <span style="font-size:12px; font-weight:700;">ID: ${caseRecord.id}</span>
        </div>

        <h3 class="result-title">${aiResult.primary_condition}</h3>
        <div style="font-size:13px; color:#0f766e; font-weight:700; margin-bottom:8px;">
          🔬 Recommended Medical Specialty: <u>${aiResult.recommended_specialty || 'General Care'}</u>
        </div>
        <p class="result-summary"><strong>${lang === 'mr' ? 'तपासणी सारांश:' : lang === 'hi' ? 'जांच सारांश:' : 'Summary:'}</strong> ${aiResult.triage_summary}</p>

        <h4 style="font-size:14px; font-weight:700; margin-bottom:6px;">📋 ${lang === 'mr' ? 'उपचार व वैद्यकीय सूचना:' : lang === 'hi' ? 'देखभाल एवं चिकित्सकीय परामर्श:' : 'Care & Clinical Recommendations:'}</h4>
        <ul class="recommendations-list">
          ${aiResult.recommendations.map(r => `<li>${r}</li>`).join('')}
        </ul>

        ${topDoc ? `
          <div style="background:rgba(255,255,255,0.95); padding:16px; border-radius:10px; margin:16px 0; border:1px solid #cbd5e1; box-shadow:var(--shadow-sm);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <div style="font-size:12px; font-weight:800; color:var(--secondary); text-transform:uppercase;">
                📍 Best Matching Doctor for ${aiResult.recommended_specialty}:
              </div>
              ${topDoc.calculatedDistanceKm !== null ? `<span class="distance-badge">📍 ${topDoc.calculatedDistanceKm} km away</span>` : ''}
            </div>

            <strong style="font-size:16.5px; display:block; color:var(--text-main);">${topDoc.name} (${topDoc.education})</strong>
            <div style="font-size:12.5px; color:#475569;">🏥 ${topDoc.clinic_name} | 💰 ${lang === 'mr' ? 'फी' : lang === 'hi' ? 'फीस' : 'Fee'}: <strong>${topDoc.consultation_fee}</strong></div>
            <div style="font-size:12px; color:#64748b;">📍 ${topDoc.address} | 🕒 ${topDoc.opd_timings}</div>

            ${(topDoc.recommendationReasons && topDoc.recommendationReasons.length > 0) ? `
              <div class="recommendation-box" style="margin-top:8px;">
                <strong>💡 Why this doctor is recommended:</strong>
                <ul>
                  ${topDoc.recommendationReasons.slice(0, 2).map(r => `<li>${r}</li>`).join('')}
                </ul>
              </div>
            ` : ''}

            <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
              <a href="tel:${topDoc.phone.replace(/[^0-9+]/g, '')}" class="btn-call" style="font-size:12px; padding:6px 12px;">
                📞 ${t('btn_call_doc')} ${topDoc.phone}
              </a>
              <button class="btn-video-call" style="font-size:12px; padding:6px 12px;" onclick='window.oneHealthApp.launchVideoConsult(${JSON.stringify(topDoc).replace(/'/g, "&apos;")})'>
                📹 ${t('btn_video_consult')}
              </button>
              <button class="btn btn-outline btn-sm" onclick="window.oneHealthApp.navigateTo('doctors')">
                ${t('btn_find_nearby_docs')}
              </button>
            </div>
          </div>
        ` : ''}

        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:16px;">
          <button class="btn btn-outline" onclick="window.oneHealthApp.openCaseModal('${caseRecord.id}')">
            📄 ${t('btn_export_pdf')}
          </button>
          <button class="btn btn-primary" onclick="window.oneHealthApp.navigateTo('cases')">
            📂 ${t('records_title')}
          </button>
        </div>
      </div>
    `;

    resultBox.scrollIntoView({ behavior: 'smooth' });
  }

  // =========================================================================
  // CASES LIST & FILTERING
  // =========================================================================
  async loadCasesList() {
    const container = document.getElementById('casesListContainer');
    if (!container) return;

    const cases = await window.oneHealthDB.getAllCases();
    this.allCases = cases;
    this.renderCasesList(cases);
  }

  async exportCasesBackup() {
    try {
      const data = await window.oneHealthDB.exportAllDataAsJSON();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `onehealth_backup_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.showToast(window.oneHealthI18n.currentLang === 'mr' ? 'डेटा यशस्वीरित्या डाउनलोड झाला!' : 'Cases exported successfully as JSON!');
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    }
  }

  async importCasesBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);
      const count = await window.oneHealthDB.importDataFromJSON(jsonData);
      this.showToast(`${count} ${window.oneHealthI18n.currentLang === 'mr' ? 'नोंदी यशस्वीरित्या जोडल्या!' : 'cases imported successfully!'}`);
      await this.loadCasesList();
      event.target.value = '';
    } catch (err) {
      alert(`Import error: ${err.message}`);
    }
  }

  filterCases() {
    if (!this.allCases) return;

    const query = (document.getElementById('caseSearchInput').value || '').toLowerCase();
    const typeFilter = document.getElementById('caseFilterType').value;
    const riskFilter = document.getElementById('caseFilterRisk').value;

    const filtered = this.allCases.filter(c => {
      const matchQuery = !query ||
        (c.subject_name && c.subject_name.toLowerCase().includes(query)) ||
        (c.village && c.village.toLowerCase().includes(query)) ||
        (c.primary_condition && c.primary_condition.toLowerCase().includes(query)) ||
        (c.id && c.id.toLowerCase().includes(query));

      const matchType = !typeFilter || c.case_type === typeFilter;
      const matchRisk = !riskFilter || c.risk_level === riskFilter;

      return matchQuery && matchType && matchRisk;
    });

    this.renderCasesList(filtered);
  }

  renderCasesList(cases) {
    const container = document.getElementById('casesListContainer');
    if (!container) return;

    const lang = window.oneHealthI18n.currentLang;
    const t = (k) => window.oneHealthI18n.t(k);

    if (cases.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:40px 20px; color:var(--text-muted);">
          <span style="font-size:40px;">📭</span>
          <p style="margin-top:10px; font-weight:600;">${lang === 'mr' ? 'कोणत्याही नोंदी आढळल्या नाहीत.' : lang === 'hi' ? 'कोई रिकॉर्ड नहीं मिला।' : 'No screening cases match your search or filter.'}</p>
          <button class="btn btn-primary btn-sm" style="margin-top:14px;" onclick="window.oneHealthApp.navigateTo('screen')">
            + ${t('btn_start_screening')}
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = cases.map(c => {
      const isSynced = c.is_synced;
      let icon = c.case_type === 'human_general' ? '🩺' : c.case_type === 'child_development' ? '👶' : '🐄';

      const tagSynced = isSynced ? `🟢 <span style="color:#059669; font-weight:700;">${lang === 'mr' ? 'सिंक झाले' : lang === 'hi' ? 'सिंक हुआ' : 'Synced'}</span>` : `🟠 <span style="color:#ea580c; font-weight:700;">${lang === 'mr' ? 'ऑफलाइन जतन' : lang === 'hi' ? 'ऑफलाइन सेव' : 'Saved Offline'}</span>`;
      const tagReviewed = (c.reviews && c.reviews.length > 0) ? ` | 👨‍⚕️ <strong style="color:var(--secondary);">${lang === 'mr' ? 'तपासले' : lang === 'hi' ? 'समीक्षित' : 'Reviewed'}</strong>` : '';

      return `
        <div class="case-card" onclick="window.oneHealthApp.openCaseModal('${c.id}')">
          <div class="case-card-header">
            <div>
              <span style="margin-right:6px;">${icon}</span>
              <strong class="case-title">${c.subject_name}</strong>
            </div>
            <span class="badge badge-${(c.risk_level || 'GREEN').toLowerCase()}">
              ${c.risk_level}
            </span>
          </div>

          <div class="case-meta">
            ${c.species ? `${lang === 'mr' ? 'प्रकार:' : lang === 'hi' ? 'प्रजाति:' : 'Species:'} <strong>${c.species}</strong> | ` : ''}
            ${lang === 'mr' ? 'वय:' : lang === 'hi' ? 'उम्र:' : 'Age:'} <strong>${c.age_or_dob || 'N/A'}</strong> |
            📍 <strong>${c.village || 'Kopargaon'}</strong>
          </div>

          <div class="case-condition">
            ${c.primary_condition || 'Screened Case'}
          </div>

          <div class="case-footer">
            <span>📅 ${new Date(c.client_created_at).toLocaleDateString()}</span>
            <span>${tagSynced}${tagReviewed}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // =========================================================================
  // CASE DETAILS MODAL & CLINICAL PRINT SLIP
  // =========================================================================
  async openCaseModal(caseId) {
    const caseData = await window.oneHealthDB.getCase(caseId);
    if (!caseData) return;

    this.activeCase = caseData;
    const modal = document.getElementById('caseModal');
    const modalBody = document.getElementById('caseModalBody');

    const reviews = caseData.reviews || [];
    const payload = caseData.data_payload || {};
    const lang = window.oneHealthI18n.currentLang;

    modalBody.innerHTML = `
      <div class="printable-slip">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid var(--border-color); padding-bottom:12px; margin-bottom:16px;">
          <div>
            <h2 style="font-size:20px; font-weight:800; color:#0f766e;">ONEHEALTH AI - ${lang === 'mr' ? 'वैद्यकीय केस रेकॉर्ड' : lang === 'hi' ? 'क्लिनिकल केस रिकॉर्ड' : 'CLINICAL CASE RECORD'}</h2>
            <p style="font-size:12px; color:var(--text-muted);">${lang === 'mr' ? 'कोपरगाव ग्रामीण आरोग्य व पशुधन नेटवर्क' : lang === 'hi' ? 'कोपरगांव ग्रामीण स्वास्थ्य एवं पशु चिकित्सा नेटवर्क' : 'Kopargaon Rural Health & Veterinary Tele-Triage Network'}</p>
          </div>
          <div style="text-align:right;">
            <span class="badge badge-${(caseData.risk_level || 'GREEN').toLowerCase()}" style="font-size:13px; padding:6px 12px;">
              ${caseData.risk_level} RISK
            </span>
            <div style="font-size:11px; margin-top:4px; color:var(--text-muted);">Case ID: ${caseData.id}</div>
          </div>
        </div>

        <div style="background:#f8fafc; padding:14px; border-radius:8px; margin-bottom:16px;">
          <div class="form-row">
            <div><strong>${lang === 'mr' ? 'नाव:' : lang === 'hi' ? 'नाम:' : 'Subject / Name:'}</strong> ${caseData.subject_name}</div>
            <div><strong>${lang === 'mr' ? 'वय / लिंग:' : lang === 'hi' ? 'उम्र / लिंग:' : 'Age / Gender:'}</strong> ${caseData.age_or_dob || 'N/A'} (${caseData.gender_or_sex || caseData.species || 'N/A'})</div>
          </div>
          <div class="form-row" style="margin-top:6px;">
            <div><strong>${lang === 'mr' ? 'गाव:' : lang === 'hi' ? 'गांव:' : 'Village:'}</strong> ${caseData.village}</div>
            <div><strong>${lang === 'mr' ? 'मोबाईल / पालक:' : lang === 'hi' ? 'फोन / अभिभावक:' : 'Contact / Guardian:'}</strong> ${caseData.contact_phone || 'N/A'} (${caseData.guardian_or_owner || 'Self'})</div>
          </div>
        </div>

        <div style="margin-bottom:16px;">
          <h4 style="font-size:15px; font-weight:700; color:var(--text-main); margin-bottom:4px;">🤖 ${lang === 'mr' ? 'एआय तपासणी अहवाल' : lang === 'hi' ? 'एआई जांच रिपोर्ट' : 'AI Screening Assessment'}</h4>
          <p style="font-size:16px; font-weight:700; color:#0f766e;">${caseData.primary_condition}</p>
          <p style="font-size:13px; margin-top:4px; line-height:1.4;">${caseData.triage_summary}</p>
        </div>

        ${payload.vitals ? `
          <div style="margin-bottom:16px;">
            <h5 style="font-size:13px; font-weight:700; margin-bottom:6px;">Vitals:</h5>
            <div style="font-size:13px; display:flex; gap:12px; flex-wrap:wrap;">
              <span>Temp: <strong>${payload.vitals.temp_f}°F</strong></span>
              <span>BP: <strong>${payload.vitals.bp_systolic}/${payload.vitals.bp_diastolic} mmHg</strong></span>
              <span>Pulse: <strong>${payload.vitals.pulse} bpm</strong></span>
              <span>SpO2: <strong>${payload.vitals.spo2}%</strong></span>
              ${payload.vitals.blood_sugar_mgdl ? `<span>RBS: <strong>${payload.vitals.blood_sugar_mgdl} mg/dL</strong></span>` : ''}
            </div>
          </div>
        ` : ''}

        ${payload.who_scores ? `
          <div style="margin-bottom:16px;">
            <h5 style="font-size:13px; font-weight:700; margin-bottom:6px;">WHO Growth Indicators:</h5>
            <div style="font-size:13px; display:flex; gap:12px; flex-wrap:wrap;">
              <span>WAZ: <strong>${payload.who_scores.waz} SD</strong></span>
              <span>HAZ: <strong>${payload.who_scores.haz} SD</strong></span>
              <span>WHZ: <strong>${payload.who_scores.whz} SD</strong></span>
              <span>MUAC: <strong>${payload.who_scores.muac_cm} cm</strong></span>
            </div>
          </div>
        ` : ''}

        <!-- Doctor / Vet Clinical Reviews -->
        <div style="border-top:1px solid var(--border-color); padding-top:14px; margin-top:16px;">
          <h4 style="font-size:15px; font-weight:700; margin-bottom:10px; color:var(--secondary);">
            👨‍⚕️ ${lang === 'mr' ? 'डॉक्टरांचा सल्ला व औषधोपचार' : lang === 'hi' ? 'डॉक्टर का परामर्श एवं दवाएं' : 'Professional Review & Prescription'}
          </h4>
          ${reviews.length > 0 ? reviews.map(r => `
            <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:12px; margin-bottom:10px;">
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <strong>${r.reviewer_name} (${r.reviewer_role.toUpperCase()})</strong>
                <span style="font-size:11px; color:var(--text-muted);">${new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              <p style="font-size:13px; margin-bottom:6px;"><strong>${lang === 'mr' ? 'निरीक्षण:' : lang === 'hi' ? 'नोट्स:' : 'Notes:'}</strong> ${r.reviewer_notes}</p>
              ${r.prescribed_treatment ? `<div style="font-size:13px; background:#ffffff; padding:8px; border-radius:6px; margin-bottom:6px; white-space:pre-line;"><strong>Rx:</strong>\n${r.prescribed_treatment}</div>` : ''}
              ${r.escalation_instructions ? `<p style="font-size:12px; color:#991b1b;"><strong>${lang === 'mr' ? 'रेफरल सूचना:' : lang === 'hi' ? 'रेफरल निर्देश:' : 'Referral:'}</strong> ${r.escalation_instructions}</p>` : ''}
            </div>
          `).join('') : `
            <p style="font-size:13px; color:var(--text-muted); margin-bottom:14px;">${lang === 'mr' ? 'अद्याप डॉक्टरांचा सल्ला नोंदवला नाही.' : lang === 'hi' ? 'अभी तक कोई डॉक्टर परामर्श दर्ज नहीं हुआ है।' : 'No doctor review submitted yet.'}</p>
          `}

          <!-- Add Review Form -->
          <div style="background:#f8fafc; border:1px solid var(--border-color); border-radius:8px; padding:14px; margin-top:12px;">
            <h5 style="font-size:13px; font-weight:700; margin-bottom:8px;">${lang === 'mr' ? 'सल्ला व औषधे नोंदवा (Rx)' : lang === 'hi' ? 'परामर्श व दवाएं लिखें' : 'Add Clinical Review / Tele-Prescription'}</h5>
            <div class="form-group">
              <input type="text" class="form-control" id="rev_name" placeholder="Dr. Anand Kulkarni" value="${localStorage.getItem('onehealth_reviewer_name') || ''}">
            </div>
            <div class="form-group">
              <textarea class="form-control" id="rev_notes" rows="2" placeholder="${lang === 'mr' ? 'निदान व वैद्यकीय नोंदी...' : lang === 'hi' ? 'निदान व क्लिनिकल नोट्स...' : 'Clinical notes, differential diagnosis confirmation...'}"></textarea>
            </div>
            <div class="form-group">
              <textarea class="form-control" id="rev_treatment" rows="2" placeholder="${lang === 'mr' ? 'औषधांची नावे व प्रमाण (उदा. Tab Paracetamol 650mg TDS x 3 दिवस)' : lang === 'hi' ? 'दवाएं एवं खुराक...' : 'Prescription / Medications / Dosage'}"></textarea>
            </div>
            <button class="btn btn-primary btn-sm" onclick="window.oneHealthApp.submitReview('${caseData.id}')">
              ✍️ ${lang === 'mr' ? 'स्वाक्षरी करून जतन करा' : lang === 'hi' ? 'हस्ताक्षर कर सुरक्षित करें' : 'Submit Review & Sign-Off'}
            </button>
          </div>
        </div>

        <div style="margin-top:20px; display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn btn-primary btn-block" style="background:#0f766e;" onclick="window.oneHealthApp.launchDoctorVideoVisit('${caseData.id}')">
            📹 ${lang === 'mr' ? 'रुग्णाशी थेट व्हिडिओ तपासणी सुरू करा' : lang === 'hi' ? 'मरीज के साथ वीडियो परामर्श शुरू करें' : 'Start Secure Video Visit with Patient'}
          </button>
          <button class="btn btn-outline btn-block" onclick="window.print()">
            🖨️ ${lang === 'mr' ? 'केस स्लिप प्रिंट करा' : lang === 'hi' ? 'केस पर्ची प्रिंट करें' : 'Print Clinical Slip'}
          </button>
        </div>
      </div>
    `;

    modal.classList.add('active');
  }

  closeCaseModal() {
    const modal = document.getElementById('caseModal');
    if (modal) modal.classList.remove('active');
  }

  async submitReview(caseId) {
    const name = document.getElementById('rev_name').value.trim() || 'Medical Officer';
    const notes = document.getElementById('rev_notes').value.trim();
    const treatment = document.getElementById('rev_treatment').value.trim();

    if (!notes) {
      alert(window.oneHealthI18n.currentLang === 'mr' ? 'कृपया वैद्यकीय नोंदी भरा' : 'Please enter clinical notes');
      return;
    }

    localStorage.setItem('onehealth_reviewer_name', name);

    const reviewData = {
      case_id: caseId,
      reviewer_name: name,
      reviewer_role: (this.activeCase && this.activeCase.case_type === 'livestock') ? 'vet' : 'doctor',
      reviewer_notes: notes,
      prescribed_treatment: treatment,
      escalation_instructions: "Follow up in OPD or nearest Primary Health Centre.",
      verified_risk_level: this.activeCase ? this.activeCase.risk_level : 'YELLOW',
      is_urgent_referral: false,
      created_at: new Date().toISOString()
    };

    await window.oneHealthDB.addReviewToCase(caseId, reviewData, true);
    await this.updatePendingSyncCount();

    if (navigator.onLine) {
      window.oneHealthSync.triggerAutoSync(true);
    }

    this.showToast(window.oneHealthI18n.currentLang === 'mr' ? 'सल्ला नोंदवला गेला आहे.' : 'Clinical review recorded & queued.');
    this.openCaseModal(caseId);
  }

  // =========================================================================
  // DOCTOR / VET DASHBOARD — Real Data
  // =========================================================================
  async loadPortalQueue() {
    await this._loadDashboardWelcome();
    await this._loadDashboardStats();
    await this._loadDashboardQueue();
    await this._loadDashboardTimeline();
  }

  _getDashboardGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  async _loadDashboardWelcome() {
    const greeting = document.getElementById('dashGreeting');
    const dateLine = document.getElementById('dashDateLine');
    const roleBadge = document.getElementById('dashRoleBadge');
    const syncBadge = document.getElementById('dashSyncBadge');

    // Personalize with real auth user name
    let doctorName = 'Doctor';
    if (window.oneHealthSupabase && window.oneHealthSupabase.currentUser) {
      doctorName = window.oneHealthSupabase.currentUser.name || window.oneHealthSupabase.currentUser.email || 'Doctor';
    }

    if (greeting) greeting.textContent = `${this._getDashboardGreeting()}, ${doctorName} 👋`;

    if (dateLine) {
      const now = new Date();
      dateLine.textContent = now.toLocaleDateString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
    }

    if (roleBadge) {
      roleBadge.textContent = this.userRole === 'vet' ? '🐄 Veterinary Doctor' : '🩺 Medical Doctor';
    }

    if (syncBadge) {
      if (navigator.onLine) {
        syncBadge.textContent = '🟢 Online — Cloud Sync Active';
        syncBadge.style.background = 'rgba(16,185,129,0.15)';
        syncBadge.style.color = '#065f46';
      } else {
        syncBadge.textContent = '🔴 Offline — Local Mode';
        syncBadge.style.background = 'rgba(239,68,68,0.12)';
        syncBadge.style.color = '#991b1b';
      }
    }
  }

  async _loadDashboardStats() {
    const cases = await window.oneHealthDB.getAllCases();
    const today = new Date().toDateString();

    const todayCases = cases.filter(c => {
      const d = c.client_created_at || c.created_at || '';
      return d && new Date(d).toDateString() === today;
    });

    const critical = cases.filter(c => c.risk_level === 'RED').length;
    const pending  = cases.filter(c => !c.doctor_notes || c.doctor_notes.trim() === '').length;
    const synced   = cases.filter(c => c.sync_status === 'synced').length;

    const animateCount = (el, target) => {
      if (!el) return;
      let current = 0;
      const step = Math.max(1, Math.floor(target / 20));
      const timer = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = current;
        if (current >= target) clearInterval(timer);
      }, 40);
    };

    animateCount(document.getElementById('statTotalToday'), todayCases.length);
    animateCount(document.getElementById('statCritical'),   critical);
    animateCount(document.getElementById('statPending'),    pending);
    animateCount(document.getElementById('statSynced'),     synced);
  }

  async _loadDashboardQueue() {
    const container = document.getElementById('portalQueueContainer');
    if (!container) return;

    const cases = await window.oneHealthDB.getAllCases();
    const role  = this.userRole || 'doctor';

    // Filter by relevant case type
    const filtered = cases.filter(c => {
      if (role === 'vet') return c.case_type === 'livestock';
      return c.case_type === 'human_general' || c.case_type === 'child_development' || !c.case_type;
    });

    // Sort by risk (RED first) then recency
    const weights = { RED: 4, ORANGE: 3, YELLOW: 2, GREEN: 1 };
    filtered.sort((a, b) => {
      const riskDiff = (weights[b.risk_level] || 0) - (weights[a.risk_level] || 0);
      if (riskDiff !== 0) return riskDiff;
      return new Date(b.client_created_at || 0) - new Date(a.client_created_at || 0);
    });

    // Show top 8 in queue
    const queue = filtered.slice(0, 8);

    if (queue.length === 0) {
      container.innerHTML = `
        <div class="dash-empty-state">
          <div style="font-size:40px; margin-bottom:10px;">✅</div>
          <div style="font-weight:700; margin-bottom:4px;">All caught up!</div>
          <div style="font-size:13px; color:var(--text-muted);">No pending cases in your triage queue.</div>
          <button class="btn btn-primary btn-sm" style="margin-top:14px;" onclick="window.oneHealthApp.navigateTo('screen')">
            + Start New Screening
          </button>
        </div>`;
      return;
    }

    const riskColor = { RED: '#ef4444', ORANGE: '#f97316', YELLOW: '#eab308', GREEN: '#22c55e' };
    const riskBg    = { RED: '#fef2f2', ORANGE: '#fff7ed', YELLOW: '#fefce8', GREEN: '#f0fdf4' };

    container.innerHTML = queue.map(c => {
      const timeAgo = this._timeAgo(c.client_created_at || c.created_at);
      const risk = c.risk_level || 'GREEN';
      const hasNotes = c.doctor_notes && c.doctor_notes.trim().length > 0;
      return `
        <div class="dash-queue-card" onclick="window.oneHealthApp.openCaseModal('${c.id}')"
          style="border-left: 4px solid ${riskColor[risk] || '#22c55e'}; background:${riskBg[risk] || '#f0fdf4'};">
          <div class="dash-queue-card-top">
            <div>
              <span class="dash-queue-name">${c.subject_name || 'Unknown Patient'}</span>
              <span class="dash-queue-meta"> · ${c.age_or_dob || 'N/A'} · ${c.village || ''}</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              ${hasNotes ? '<span style="font-size:10px; background:#dcfce7; color:#166534; padding:2px 6px; border-radius:4px; font-weight:700;">Reviewed</span>' : ''}
              <span class="badge badge-${risk.toLowerCase()}">${risk}</span>
            </div>
          </div>
          <div class="dash-queue-condition">${c.primary_condition || 'Awaiting diagnosis'}</div>
          <div class="dash-queue-footer">
            <span>⏱ ${timeAgo}</span>
            <span style="color:var(--primary); font-weight:700; font-size:12px;">Review →</span>
          </div>
        </div>`;
    }).join('');

    if (filtered.length > 8) {
      container.innerHTML += `
        <button class="btn btn-outline btn-sm" style="width:100%; margin-top:10px;"
          onclick="window.oneHealthApp.navigateTo('cases')">
          View all ${filtered.length} cases →
        </button>`;
    }
  }

  async _loadDashboardTimeline() {
    const container = document.getElementById('dashTimeline');
    if (!container) return;

    const cases = await window.oneHealthDB.getAllCases();
    const today = new Date().toDateString();

    const todayCases = cases
      .filter(c => {
        const d = c.client_created_at || c.created_at || '';
        return d && new Date(d).toDateString() === today;
      })
      .sort((a, b) => new Date(b.client_created_at || 0) - new Date(a.client_created_at || 0))
      .slice(0, 6);

    if (todayCases.length === 0) {
      container.innerHTML = `
        <div class="dash-empty-state" style="padding:20px 0;">
          <div style="font-size:24px; margin-bottom:6px;">📭</div>
          <div style="font-size:13px; color:var(--text-muted);">No cases created today</div>
        </div>`;
      return;
    }

    const riskIcon = { RED: '🔴', ORANGE: '🟠', YELLOW: '🟡', GREEN: '🟢' };
    container.innerHTML = todayCases.map(c => {
      const time = c.client_created_at
        ? new Date(c.client_created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        : '—';
      const risk = c.risk_level || 'GREEN';
      return `
        <div class="dash-timeline-item" onclick="window.oneHealthApp.openCaseModal('${c.id}')">
          <div class="dash-timeline-time">${time}</div>
          <div class="dash-timeline-dot">${riskIcon[risk] || '🟢'}</div>
          <div class="dash-timeline-content">
            <div class="dash-timeline-name">${c.subject_name || 'Patient'}</div>
            <div class="dash-timeline-condition">${c.primary_condition || 'Screening'}</div>
          </div>
        </div>`;
    }).join('');
  }

  _timeAgo(dateStr) {
    if (!dateStr) return 'just now';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  // =========================================================================
  // ANALYTICS & SURVEILLANCE
  // =========================================================================
  async loadAnalytics() {
    const container = document.getElementById('analyticsDashboardContainer');
    if (!container) return;

    const cases = await window.oneHealthDB.getAllCases();
    window.oneHealthAnalytics.renderDashboard(cases, container);
  }
}

// Start app on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  window.oneHealthApp = new OneHealthApp();
  window.oneHealthApp.init();
});
