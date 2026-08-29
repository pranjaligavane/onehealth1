/**
 * ONEHEALTH AI - Main Application Controller (Role-Aware Architecture)
 * Supports Patient / Citizen, Medical Doctor (MBBS), and Veterinary Doctor (BVSc).
 * Features autonomous offline AI, local IndexedDB persistence, Doctor Location matching,
 * and seamless PWA workflows.
 */

class OneHealthApp {
  constructor() {
    this.currentView = 'home';
    this.userRole = localStorage.getItem('onehealth_user_role') || null;
    this.selectedScreeningType = 'human_general';
    this.capturedImages = [];
    this.activeCase = null;
    this.allCases = [];
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

    // 5. Apply User Role
    if (!this.userRole) {
      this.userRole = 'patient'; // default to patient view with direct hero choice buttons
    }
    this.applyUserRole(this.userRole, false);

    // 6. Initial Data Load & Pending Sync Count
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
    if (modal) modal.style.display = 'flex';
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
    this.showToast(`Switched to ${role === 'doctor' ? 'Medical Doctor' : role === 'vet' ? 'Veterinary Doctor' : 'Patient / Citizen'} Mode`);
  }

  applyUserRole(role, navigate = true) {
    const roleIcon = document.getElementById('roleBadgeIcon');
    const roleText = document.getElementById('roleBadgeText');
    const subtitle = document.getElementById('headerRoleSubtitle');

    if (role === 'doctor') {
      if (roleIcon) roleIcon.innerText = '🩺';
      if (roleText) roleText.innerText = 'Doctor (MBBS)';
      if (subtitle) subtitle.innerText = 'Doctor Clinical Tele-Station';
    } else if (role === 'vet') {
      if (roleIcon) roleIcon.innerText = '🐄';
      if (roleText) roleText.innerText = 'Vet (BVSc)';
      if (subtitle) subtitle.innerText = 'Veterinary Officer Station';
    } else {
      if (roleIcon) roleIcon.innerText = '👤';
      if (roleText) roleText.innerText = 'Patient / Citizen';
      if (subtitle) subtitle.innerText = 'Rural Health & Vet Network';
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

    if (role === 'doctor') {
      nav.innerHTML = `
        <button class="nav-item" data-view="portal" onclick="window.oneHealthApp.navigateTo('portal')">
          <span class="nav-icon">👨‍⚕️</span>
          <span>Triage Queue</span>
        </button>
        <button class="nav-item" data-view="cases" onclick="window.oneHealthApp.navigateTo('cases')">
          <span class="nav-icon">📂</span>
          <span>All Cases</span>
        </button>
        <button class="nav-item" data-view="clinic_profile" onclick="window.oneHealthApp.navigateTo('clinic_profile')">
          <span class="nav-icon">📍</span>
          <span>My Profile</span>
        </button>
        <button class="nav-item" data-view="analytics" onclick="window.oneHealthApp.navigateTo('analytics')">
          <span class="nav-icon">📊</span>
          <span>Epidemics</span>
        </button>
      `;
    } else if (role === 'vet') {
      nav.innerHTML = `
        <button class="nav-item" data-view="portal" onclick="window.oneHealthApp.navigateTo('portal')">
          <span class="nav-icon">🐄</span>
          <span>Herd Triage</span>
        </button>
        <button class="nav-item" data-view="cases" onclick="window.oneHealthApp.navigateTo('cases')">
          <span class="nav-icon">📂</span>
          <span>Livestock Cases</span>
        </button>
        <button class="nav-item" data-view="clinic_profile" onclick="window.oneHealthApp.navigateTo('clinic_profile')">
          <span class="nav-icon">📍</span>
          <span>Dispensary</span>
        </button>
        <button class="nav-item" data-view="analytics" onclick="window.oneHealthApp.navigateTo('analytics')">
          <span class="nav-icon">📊</span>
          <span>Epizootics</span>
        </button>
      `;
    } else {
      // Patient / Citizen / Health Worker
      nav.innerHTML = `
        <button class="nav-item" data-view="home" onclick="window.oneHealthApp.navigateTo('home')">
          <span class="nav-icon">🏠</span>
          <span data-i18n="nav_home">Home</span>
        </button>
        <button class="nav-item" data-view="screen" onclick="window.oneHealthApp.navigateTo('screen')">
          <span class="nav-icon">➕</span>
          <span data-i18n="nav_screen">Screen</span>
        </button>
        <button class="nav-item" data-view="doctors" onclick="window.oneHealthApp.navigateTo('doctors')">
          <span class="nav-icon">📍</span>
          <span>Find Doctors</span>
        </button>
        <button class="nav-item" data-view="cases" onclick="window.oneHealthApp.navigateTo('cases')">
          <span class="nav-icon">📂</span>
          <span data-i18n="nav_cases">Records</span>
        </button>
        <button class="nav-item" data-view="analytics" onclick="window.oneHealthApp.navigateTo('analytics')">
          <span class="nav-icon">📊</span>
          <span data-i18n="nav_analytics">Alerts</span>
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
        window.oneHealthI18n.setLanguage(e.target.value);
        if (this.currentView === 'screen') this.renderScreeningForm();
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
  // NEARBY DOCTORS & VETS DIRECTORY (Comprehensive Info & Education)
  // =========================================================================
  async loadDoctorsDirectory() {
    const container = document.getElementById('doctorsListContainer');
    if (!container) return;

    const villageFilter = document.getElementById('doctorVillageFilter') ? document.getElementById('doctorVillageFilter').value : '';
    const roleFilter = document.getElementById('doctorRoleFilter') ? document.getElementById('doctorRoleFilter').value : '';
    
    let docs = await window.oneHealthDB.getNearbyDoctors(villageFilter, roleFilter || null);

    if (docs.length === 0) {
      container.innerHTML = `<p class="text-muted" style="text-align:center; padding:30px;">No registered healthcare or veterinary facilities found matching your criteria.</p>`;
      return;
    }

    container.innerHTML = docs.map(doc => {
      const isVet = doc.role === 'vet';
      const icon = isVet ? '🐄' : '🩺';
      const badgeClass = isVet ? 'badge-green' : 'badge-yellow';

      const isFree = (doc.consultation_fee || '').toLowerCase().includes('free');

      return `
        <div class="doctor-card">
          <div class="doc-header">
            <div>
              <div style="display:flex; align-items:center; gap:6px;">
                <span style="font-size:20px;">${icon}</span>
                <strong class="doc-name">${doc.name}</strong>
              </div>
              <div class="doc-title-sub">${doc.title || (isVet ? 'Veterinary Surgeon' : 'Medical Officer')}</div>
            </div>
            <span class="badge ${badgeClass}">${isVet ? 'Veterinary Care' : 'Human Care'}</span>
          </div>

          <!-- Tags: Education, Reg, Experience, Fee -->
          <div class="doc-tags-row">
            <span class="doc-tag exp">🎓 ${doc.education || 'Medical Degree'}</span>
            ${doc.medical_reg_no ? `<span class="doc-tag">📜 Reg: ${doc.medical_reg_no}</span>` : ''}
            ${doc.experience_years ? `<span class="doc-tag exp">⏱️ ${doc.experience_years} Yrs Exp</span>` : ''}
            <span class="doc-tag ${isFree ? 'fee-free' : 'fee-paid'}">💰 ${doc.consultation_fee || 'Standard'}</span>
            <span class="doc-tag">📍 ${doc.village}</span>
          </div>

          <!-- Detailed Info Grid -->
          <div class="doc-info-grid">
            <div class="doc-info-item">
              <strong>🏥 Hospital / Clinic:</strong> ${doc.clinic_name}
            </div>
            <div class="doc-info-item">
              <strong>📍 Address:</strong> ${doc.address}
            </div>
            <div class="doc-info-item">
              <strong>🕒 OPD Timings:</strong> ${doc.opd_timings}
            </div>
            <div class="doc-info-item">
              <strong>🗣️ Languages:</strong> ${doc.languages || 'Marathi, Hindi, English'}
            </div>
            ${doc.specialization ? `
              <div class="doc-info-item" style="grid-column: 1 / -1;">
                <strong>🔬 Specialization:</strong> ${doc.specialization}
              </div>
            ` : ''}
            ${doc.facilities ? `
              <div class="doc-info-item" style="grid-column: 1 / -1;">
                <strong>🛠️ Facilities:</strong> ${doc.facilities}
              </div>
            ` : ''}
          </div>

          <!-- Action Buttons -->
          <div class="doc-actions">
            <a href="tel:${doc.phone.replace(/[^0-9+]/g, '')}" class="btn-call">
              📞 Call ${doc.phone}
            </a>
            ${doc.whatsapp ? `
              <a href="https://wa.me/${doc.whatsapp.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(doc.name)},%20I%20would%20like%20to%20consult%20regarding%20a%20health%20screening." target="_blank" class="btn-whatsapp">
                💬 WhatsApp
              </a>
            ` : ''}
            <button class="btn btn-outline btn-sm" onclick="window.oneHealthApp.referDirectlyToDoctor('${doc.name}', '${doc.role}')">
              📋 Start Screening & Consult
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  referDirectlyToDoctor(doctorName, role) {
    this.showToast(`Consultation request flagged for ${doctorName}. Starting screening...`);
    this.selectedScreeningType = role === 'vet' ? 'livestock' : 'human_general';
    this.navigateTo('screen');
  }

  // =========================================================================
  // DOCTOR / VET CLINIC PROFILE (Location & Full Credentials Setup)
  // =========================================================================
  async loadClinicProfileForm() {
    const roleBadge = document.getElementById('profileRoleBadge');
    if (roleBadge) {
      roleBadge.innerText = this.userRole === 'vet' ? 'Veterinary Officer Profile' : 'Medical Doctor Profile';
    }

    const savedProfile = await window.oneHealthDB.getSetting('doctor_profile_data', null);
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

    const profile = {
      id: `PROF-${Date.now().toString(36).toUpperCase()}`,
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
      phone: document.getElementById('prof_phone').value.trim(),
      whatsapp: document.getElementById('prof_whatsapp').value.trim(),
      opd_timings: document.getElementById('prof_timings').value.trim(),
      languages: document.getElementById('prof_languages').value.trim(),
      facilities: document.getElementById('prof_facilities').value.trim(),
      available: true
    };

    await window.oneHealthDB.saveSetting('doctor_profile_data', profile);
    await window.oneHealthDB.saveDoctor(profile);

    this.showToast('Profile & Location saved! Patients in your area can now discover your practice.');
    this.navigateTo('portal');
  }

  // =========================================================================
  // SCREENING FORM BUILDER & SUBMISSION
  // =========================================================================
  renderScreeningForm() {
    const container = document.getElementById('screeningFormContainer');
    if (!container) return;

    this.capturedImages = [];

    let typeTitle = "Human General Health Screening";
    let icon = "🩺";
    if (this.selectedScreeningType === 'child_development') {
      typeTitle = "Childhood Growth & Milestone Screening (0-5 Yrs)";
      icon = "👶";
    } else if (this.selectedScreeningType === 'livestock') {
      typeTitle = "Livestock & Veterinary Health Screening";
      icon = "🐄";
    }

    container.innerHTML = `
      <div class="card-box">
        <div class="form-title-bar">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:24px;">${icon}</span>
            <h3 class="form-title">${typeTitle}</h3>
          </div>
          <div style="display:flex; gap:6px;">
            <button type="button" class="btn btn-outline btn-sm" onclick="window.oneHealthApp.readFormAloud()">
              🔊 Listen
            </button>
            <select class="form-control" style="width:auto; padding:4px 8px;" id="typeSwitcher" onchange="window.oneHealthApp.switchScreeningType(this.value)">
              <option value="human_general" ${this.selectedScreeningType === 'human_general' ? 'selected' : ''}>Human</option>
              <option value="child_development" ${this.selectedScreeningType === 'child_development' ? 'selected' : ''}>Child Dev</option>
              <option value="livestock" ${this.selectedScreeningType === 'livestock' ? 'selected' : ''}>Livestock</option>
            </select>
          </div>
        </div>

        <form id="activeScreeningForm" onsubmit="window.oneHealthApp.handleScreeningSubmit(event)">
          <!-- Subject Demographics -->
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${this.selectedScreeningType === 'livestock' ? 'Animal Tag / ID / Name *' : 'Patient Full Name *'}</label>
              <input type="text" class="form-control" id="f_subject_name" required placeholder="${this.selectedScreeningType === 'livestock' ? 'e.g., HF Cow #402 / INAPH Tag' : 'e.g., Ramesh Thorat'}">
            </div>
            <div class="form-group">
              <label class="form-label">${this.selectedScreeningType === 'child_development' ? 'Age in Months *' : 'Age / Year of Birth *'}</label>
              <input type="${this.selectedScreeningType === 'child_development' ? 'number' : 'text'}" class="form-control" id="f_age" required placeholder="${this.selectedScreeningType === 'child_development' ? 'e.g., 14' : 'e.g., 42 years'}">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${this.selectedScreeningType === 'livestock' ? 'Species & Breed *' : 'Gender *'}</label>
              ${this.selectedScreeningType === 'livestock' ? `
                <select class="form-control" id="f_species">
                  <option value="Cattle (Crossbred HF/Jersey)">Cattle (Crossbred HF/Jersey)</option>
                  <option value="Cattle (Indigenous Gir/Khillar)">Cattle (Indigenous Gir/Khillar)</option>
                  <option value="Buffalo (Murrah/Jafarabadi)">Buffalo (Murrah/Jafarabadi)</option>
                  <option value="Goat (Osmanabadi/Sirohi)">Goat (Osmanabadi/Sirohi)</option>
                  <option value="Sheep (Deccani/Madgyal)">Sheep (Deccani/Madgyal)</option>
                  <option value="Poultry (Broiler/Desi)">Poultry (Broiler/Desi)</option>
                  <option value="Canine / Pet">Canine / Pet</option>
                </select>
              ` : `
                <select class="form-control" id="f_gender">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              `}
            </div>
            <div class="form-group">
              <label class="form-label">Village / Location *</label>
              <input type="text" class="form-control" id="f_village" required value="Kopargaon" placeholder="e.g. Pohegaon, Dhamori, Kopargaon">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${this.selectedScreeningType === 'livestock' ? 'Livestock Owner Name' : 'Guardian / Relative Name'}</label>
              <input type="text" class="form-control" id="f_guardian" placeholder="e.g. Bhausaheb Vikhe">
            </div>
            <div class="form-group">
              <label class="form-label">Contact Phone</label>
              <input type="tel" class="form-control" id="f_phone" placeholder="e.g. 9822114455">
            </div>
          </div>

          <!-- Dynamic Questions Section -->
          ${this.renderCategorySpecificFields()}

          <!-- Photo Capture & Visual Inspection -->
          <div class="form-group" style="margin-top: 16px;">
            <label class="form-label">📷 Clinical Photo / Lesion Upload (Offline Compressed)</label>
            <input type="file" id="f_camera_input" accept="image/*" class="form-control" onchange="window.oneHealthApp.handleImageCapture(event)">
            <div id="imagePreviewContainer" style="display:flex; gap:10px; margin-top:8px; flex-wrap:wrap;"></div>
          </div>

          <!-- Submit Button -->
          <div style="margin-top: 24px;">
            <button type="submit" class="btn btn-primary btn-block" style="font-size:16px; padding:14px;">
              ⚡ Run Offline AI Screening & Save
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
    if (this.selectedScreeningType === 'human_general') {
      return `
        <h4 style="font-size:14px; font-weight:700; margin:16px 0 8px 0; color:var(--secondary);">🩺 Physical Vitals</h4>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Temperature (°F)</label>
            <input type="number" step="0.1" class="form-control" id="v_temp" placeholder="e.g. 98.6 or 102.5">
          </div>
          <div class="form-group">
            <label class="form-label">Blood Pressure (Systolic / Diastolic)</label>
            <div style="display:flex; gap:6px;">
              <input type="number" class="form-control" id="v_bpsys" placeholder="Sys 120">
              <input type="number" class="form-control" id="v_bpdia" placeholder="Dia 80">
            </div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Pulse (bpm) & SpO2 (%)</label>
            <div style="display:flex; gap:6px;">
              <input type="number" class="form-control" id="v_pulse" placeholder="Pulse 78">
              <input type="number" class="form-control" id="v_spo2" placeholder="SpO2 98%">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Random Blood Sugar (mg/dL)</label>
            <input type="number" class="form-control" id="v_sugar" placeholder="e.g. 110 or 240">
          </div>
        </div>

        <h4 style="font-size:14px; font-weight:700; margin:16px 0 8px 0; color:var(--text-main);">📋 Observed Symptoms</h4>
        <div class="checkbox-grid">
          <label class="checkbox-label"><input type="checkbox" name="symptom" value="fever_chills"> High fever with chills / rigors</label>
          <label class="checkbox-label"><input type="checkbox" name="symptom" value="eye_pain_retroorbital"> Retro-orbital pain (behind eyes)</label>
          <label class="checkbox-label"><input type="checkbox" name="symptom" value="skin_rash_petechiae"> Skin rash or red petechial spots</label>
          <label class="checkbox-label"><input type="checkbox" name="symptom" value="severe_bodyache"> Severe joint / muscular bodyache</label>
          <label class="checkbox-label"><input type="checkbox" name="symptom" value="cough_chronic_2wks"> Chronic cough > 2 weeks</label>
          <label class="checkbox-label"><input type="checkbox" name="symptom" value="night_sweats_weightloss"> Night sweats and weight loss</label>
          <label class="checkbox-label"><input type="checkbox" name="symptom" value="watery_diarrhea"> Frequent watery stools (>3/day)</label>
          <label class="checkbox-label"><input type="checkbox" name="symptom" value="vomiting_nausea"> Persistent vomiting and nausea</label>
          <label class="checkbox-label"><input type="checkbox" name="symptom" value="stepladder_fever"> Step-ladder continuous fever</label>
          <label class="checkbox-label"><input type="checkbox" name="symptom" value="non_healing_ulcer"> Non-healing foot / skin ulcer</label>
        </div>

        <h4 style="font-size:14px; font-weight:700; margin:16px 0 8px 0; color:#991b1b;">🚨 Emergency Red Flags</h4>
        <div class="checkbox-grid">
          <label class="checkbox-label red-flag"><input type="checkbox" name="redflag" value="chest_pain_severe"> Severe crushing chest pain</label>
          <label class="checkbox-label red-flag"><input type="checkbox" name="redflag" value="sudden_weakness_speech"> Sudden face droop / speech slur (FAST Stroke)</label>
          <label class="checkbox-label red-flag"><input type="checkbox" name="redflag" value="severe_breathlessness_rest"> Severe resting breathlessness</label>
          <label class="checkbox-label red-flag"><input type="checkbox" name="redflag" value="altered_consciousness"> Altered sensorium / drowsiness</label>
        </div>
      `;
    } else if (this.selectedScreeningType === 'child_development') {
      return `
        <h4 style="font-size:14px; font-weight:700; margin:16px 0 8px 0; color:var(--secondary);">📏 WHO Anthropometric Measurements</h4>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Weight (kg) *</label>
            <input type="number" step="0.1" class="form-control" id="c_weight" required placeholder="e.g. 7.5">
          </div>
          <div class="form-group">
            <label class="form-label">Length / Height (cm) *</label>
            <input type="number" step="0.1" class="form-control" id="c_height" required placeholder="e.g. 72.0">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">MUAC (Mid-Upper Arm Circumference cm)</label>
            <input type="number" step="0.1" class="form-control" id="c_muac" placeholder="e.g. 11.2 (<11.5=SAM, 11.5-12.5=MAM)">
          </div>
          <div class="form-group">
            <label class="form-label">Bilateral Pitting Edema (Swollen feet)?</label>
            <select class="form-control" id="c_edema">
              <option value="no">No Edema</option>
              <option value="yes">Yes (Bilateral Swelling)</option>
            </select>
          </div>
        </div>

        <h4 style="font-size:14px; font-weight:700; margin:16px 0 8px 0; color:var(--text-main);">🌱 4-Domain Milestone Evaluations</h4>
        <div class="form-group">
          <label class="form-label">1. Gross Motor (Holding neck, sitting, standing, walking for age)</label>
          <select class="form-control" id="m_gross">
            <option value="achieved">Normal / Achieved for age</option>
            <option value="delayed">Delayed / Unable to perform</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">2. Fine Motor (Grasping rattle, transferring objects, pincer grasp)</label>
          <select class="form-control" id="m_fine">
            <option value="achieved">Normal / Achieved for age</option>
            <option value="delayed">Delayed / Unable to perform</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">3. Language & Communication (Babbling, single words, 2-word phrases)</label>
          <select class="form-control" id="m_language">
            <option value="achieved">Normal / Achieved for age</option>
            <option value="delayed">Delayed / Speech concern</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">4. Social & Cognitive (Social smile, eye contact, playing)</label>
          <select class="form-control" id="m_social">
            <option value="achieved">Normal / Achieved for age</option>
            <option value="delayed">Delayed / Lack of responsiveness</option>
          </select>
        </div>
      `;
    } else if (this.selectedScreeningType === 'livestock') {
      return `
        <h4 style="font-size:14px; font-weight:700; margin:16px 0 8px 0; color:var(--secondary);">🩺 Livestock Clinical Signs</h4>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Rectal Temperature (°F)</label>
            <input type="number" step="0.1" class="form-control" id="vet_temp" placeholder="e.g. 101.5 (Normal) or 105.2 (Fever)">
          </div>
          <div class="form-group">
            <label class="form-label">Number of Animals in Herd</label>
            <input type="number" class="form-control" id="vet_herd_size" value="1">
          </div>
        </div>

        <h4 style="font-size:14px; font-weight:700; margin:16px 0 8px 0; color:var(--text-main);">📋 Key Clinical Manifestations</h4>
        <div class="checkbox-grid">
          <label class="checkbox-label"><input type="checkbox" name="vet_symptom" value="skin_nodules_lumps"> Multiple firm skin nodules/lumps (LSD sign)</label>
          <label class="checkbox-label"><input type="checkbox" name="vet_symptom" value="milk_drop_severe"> Sudden severe drop in milk production (>50%)</label>
          <label class="checkbox-label"><input type="checkbox" name="vet_symptom" value="salivation_frothing"> Excessive frothy salivation & lip smacking</label>
          <label class="checkbox-label"><input type="checkbox" name="vet_symptom" value="mouth_tongue_blisters"> Blisters/ulcers in mouth or gums (FMD)</label>
          <label class="checkbox-label"><input type="checkbox" name="vet_symptom" value="hoof_lesions_lameness"> Foot lesions between hooves & lameness</label>
          <label class="checkbox-label"><input type="checkbox" name="vet_symptom" value="hard_swollen_udder"> Swollen, hot, painful udder (Mastitis)</label>
          <label class="checkbox-label"><input type="checkbox" name="vet_symptom" value="clots_blood_in_milk"> Milk with yellow clots, flakes, or blood</label>
          <label class="checkbox-label"><input type="checkbox" name="vet_symptom" value="crepitating_swelling_leg"> Crackling gas swelling on shoulder/thigh (BQ)</label>
          <label class="checkbox-label"><input type="checkbox" name="vet_symptom" value="swollen_throat_dewlap"> Swollen throat / dewlap area with snoring</label>
          <label class="checkbox-label"><input type="checkbox" name="vet_symptom" value="nasal_discharge_foul_diarrhea"> Foul diarrhea & ocular discharge (Goats/PPR)</label>
          <label class="checkbox-label"><input type="checkbox" name="vet_symptom" value="bloody_droppings_birds"> Bloody droppings & drooping wings (Poultry)</label>
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

      payload = { vitals, symptoms, red_flags: redFlags, duration_days: 3 };
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
      data_payload: payload,
      images: this.capturedImages,
      status: (aiResult.risk_level === 'RED' || aiResult.risk_level === 'ORANGE') ? 'escalated' : 'screened',
      assigned_role: this.selectedScreeningType === 'livestock' ? 'vet' : 'doctor',
      client_created_at: new Date().toISOString(),
      is_synced: false,
      reviews: []
    };

    await window.oneHealthDB.saveCase(caseRecord, true);
    await this.updatePendingSyncCount();

    if (navigator.onLine) {
      window.oneHealthSync.triggerAutoSync(true);
    }

    this.renderResultCard(caseRecord, aiResult, village);

    if (aiResult.risk_level === 'RED') {
      window.oneHealthVoice.speak("Warning. Critical emergency risk identified. Please refer to Sub-District Hospital immediately.");
    } else {
      window.oneHealthVoice.speak(`Screening completed. Result: ${aiResult.primary_condition}.`);
    }
  }

  async renderResultCard(caseRecord, aiResult, village) {
    const resultBox = document.getElementById('screeningResultContainer');
    if (!resultBox) return;

    const nearbyDocs = await window.oneHealthDB.getNearbyDoctors(village, caseRecord.assigned_role);
    const topDoc = nearbyDocs.length > 0 ? nearbyDocs[0] : null;

    resultBox.innerHTML = `
      <div class="result-box risk-${aiResult.risk_level}">
        <div class="result-header">
          <span class="badge badge-${aiResult.risk_level.toLowerCase()}">
            ${aiResult.risk_level} RISK (Confidence: ${Math.round(aiResult.confidence_score * 100)}%)
          </span>
          <span style="font-size:12px; font-weight:700;">ID: ${caseRecord.id}</span>
        </div>

        <h3 class="result-title">${aiResult.primary_condition}</h3>
        <p class="result-summary"><strong>Summary:</strong> ${aiResult.triage_summary}</p>

        <h4 style="font-size:14px; font-weight:700; margin-bottom:6px;">📋 Care & Clinical Recommendations:</h4>
        <ul class="recommendations-list">
          ${aiResult.recommendations.map(r => `<li>${r}</li>`).join('')}
        </ul>

        ${topDoc ? `
          <div style="background:rgba(255,255,255,0.9); padding:14px; border-radius:8px; margin:14px 0; border:1px solid #cbd5e1;">
            <div style="font-size:12px; font-weight:800; color:var(--secondary); text-transform:uppercase;">📍 Nearest Doctor in ${village}:</div>
            <strong style="font-size:16px; display:block; color:var(--text-main); margin-top:2px;">${topDoc.name} (${topDoc.education})</strong>
            <div style="font-size:12.5px; color:#475569;">🏥 ${topDoc.clinic_name} | 💰 Fee: <strong>${topDoc.consultation_fee}</strong></div>
            <div style="font-size:12px; color:#64748b;">📍 ${topDoc.address} | 🕒 ${topDoc.opd_timings}</div>
            <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
              <a href="tel:${topDoc.phone.replace(/[^0-9+]/g, '')}" class="btn-call" style="font-size:12px; padding:6px 12px;">
                📞 Call ${topDoc.phone}
              </a>
              <button class="btn btn-outline btn-sm" onclick="window.oneHealthApp.navigateTo('doctors')">
                View All Doctors Near You ➔
              </button>
            </div>
          </div>
        ` : ''}

        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:16px;">
          <button class="btn btn-outline" onclick="window.oneHealthApp.openCaseModal('${caseRecord.id}')">
            📄 View Full Details & Print
          </button>
          <button class="btn btn-primary" onclick="window.oneHealthApp.navigateTo('cases')">
            📂 Go to All Cases
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
      this.showToast('Cases exported successfully as JSON!');
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
      this.showToast(`Imported ${count} cases successfully!`);
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

    if (cases.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:40px 20px; color:var(--text-muted);">
          <span style="font-size:40px;">📭</span>
          <p style="margin-top:10px; font-weight:600;">No screening cases match your search or filter.</p>
          <button class="btn btn-primary btn-sm" style="margin-top:14px;" onclick="window.oneHealthApp.navigateTo('screen')">
            + Start New Screening
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = cases.map(c => {
      const isSynced = c.is_synced;
      let icon = c.case_type === 'human_general' ? '🩺' : c.case_type === 'child_development' ? '👶' : '🐄';

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
            ${c.species ? `Species: <strong>${c.species}</strong> | ` : ''}
            Age: <strong>${c.age_or_dob || 'N/A'}</strong> |
            📍 <strong>${c.village || 'Kopargaon'}</strong>
          </div>

          <div class="case-condition">
            ${c.primary_condition || 'Screened Case'}
          </div>

          <div class="case-footer">
            <span>📅 ${new Date(c.client_created_at).toLocaleDateString()}</span>
            <span>
              ${isSynced ? '🟢 <span style="color:#059669; font-weight:700;">Synced</span>' : '🟠 <span style="color:#ea580c; font-weight:700;">Saved Offline</span>'}
              ${(c.reviews && c.reviews.length > 0) ? ' | 👨‍⚕️ <strong style="color:var(--secondary);">Reviewed</strong>' : ''}
            </span>
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

    modalBody.innerHTML = `
      <div class="printable-slip">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid var(--border-color); padding-bottom:12px; margin-bottom:16px;">
          <div>
            <h2 style="font-size:20px; font-weight:800; color:#0f766e;">ONEHEALTH AI - CLINICAL CASE RECORD</h2>
            <p style="font-size:12px; color:var(--text-muted);">Kopargaon Rural Health & Veterinary Tele-Triage Network</p>
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
            <div><strong>Subject / Name:</strong> ${caseData.subject_name}</div>
            <div><strong>Age / Gender:</strong> ${caseData.age_or_dob || 'N/A'} (${caseData.gender_or_sex || caseData.species || 'N/A'})</div>
          </div>
          <div class="form-row" style="margin-top:6px;">
            <div><strong>Village:</strong> ${caseData.village}</div>
            <div><strong>Contact / Guardian:</strong> ${caseData.contact_phone || 'N/A'} (${caseData.guardian_or_owner || 'Self'})</div>
          </div>
        </div>

        <div style="margin-bottom:16px;">
          <h4 style="font-size:15px; font-weight:700; color:var(--text-main); margin-bottom:4px;">🤖 AI Screening Assessment</h4>
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

        ${(caseData.images && caseData.images.length > 0) ? `
          <div style="margin-bottom:16px;">
            <h5 style="font-size:13px; font-weight:700; margin-bottom:6px;">Clinical Photos:</h5>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              ${caseData.images.map(img => `<img src="${img}" style="width:100px; height:100px; object-fit:cover; border-radius:8px; border:1px solid #cbd5e1;">`).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Doctor / Vet Clinical Reviews -->
        <div style="border-top:1px solid var(--border-color); padding-top:14px; margin-top:16px;">
          <h4 style="font-size:15px; font-weight:700; margin-bottom:10px; color:var(--secondary);">
            👨‍⚕️ Professional Review & Prescription
          </h4>
          ${reviews.length > 0 ? reviews.map(r => `
            <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:12px; margin-bottom:10px;">
              <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <strong>${r.reviewer_name} (${r.reviewer_role.toUpperCase()})</strong>
                <span style="font-size:11px; color:var(--text-muted);">${new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              <p style="font-size:13px; margin-bottom:6px;"><strong>Clinical Notes:</strong> ${r.reviewer_notes}</p>
              ${r.prescribed_treatment ? `<div style="font-size:13px; background:#ffffff; padding:8px; border-radius:6px; margin-bottom:6px; white-space:pre-line;"><strong>Prescribed Rx:</strong>\n${r.prescribed_treatment}</div>` : ''}
              ${r.escalation_instructions ? `<p style="font-size:12px; color:#991b1b;"><strong>Referral / Action:</strong> ${r.escalation_instructions}</p>` : ''}
            </div>
          `).join('') : `
            <p style="font-size:13px; color:var(--text-muted); margin-bottom:14px;">No doctor review submitted yet.</p>
          `}

          <!-- Add Review Form -->
          <div style="background:#f8fafc; border:1px solid var(--border-color); border-radius:8px; padding:14px; margin-top:12px;">
            <h5 style="font-size:13px; font-weight:700; margin-bottom:8px;">Add Clinical Review / Tele-Prescription</h5>
            <div class="form-group">
              <input type="text" class="form-control" id="rev_name" placeholder="Reviewer Name (e.g. Dr. Anand Kulkarni)" value="${localStorage.getItem('onehealth_reviewer_name') || ''}">
            </div>
            <div class="form-group">
              <textarea class="form-control" id="rev_notes" rows="2" placeholder="Clinical notes, differential diagnosis confirmation..."></textarea>
            </div>
            <div class="form-group">
              <textarea class="form-control" id="rev_treatment" rows="2" placeholder="Prescription / Medications / Dosage (e.g. Tab Paracetamol 650mg TDS x 3 days)"></textarea>
            </div>
            <button class="btn btn-primary btn-sm" onclick="window.oneHealthApp.submitReview('${caseData.id}')">
              ✍️ Submit Review & Sign-Off
            </button>
          </div>
        </div>

        <div style="margin-top:20px; display:flex; gap:10px;">
          <button class="btn btn-outline btn-block" onclick="window.print()">
            🖨️ Print Clinical Slip
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
      alert('Please enter clinical notes');
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

    this.showToast('Clinical review recorded & queued.');
    this.openCaseModal(caseId);
  }

  // =========================================================================
  // DOCTOR / VET PORTAL QUEUE
  // =========================================================================
  async loadPortalQueue() {
    const container = document.getElementById('portalQueueContainer');
    if (!container) return;

    const role = this.userRole || 'doctor';
    const cases = await window.oneHealthDB.getAllCases();

    const filtered = cases.filter(c => {
      if (role === 'vet') {
        return c.case_type === 'livestock';
      } else {
        return c.case_type === 'human_general' || c.case_type === 'child_development';
      }
    });

    const weights = { RED: 4, ORANGE: 3, YELLOW: 2, GREEN: 1 };
    filtered.sort((a, b) => (weights[b.risk_level] || 0) - (weights[a.risk_level] || 0));

    if (filtered.length === 0) {
      container.innerHTML = `<p class="text-muted" style="text-align:center; padding:30px;">No pending cases in your triage queue.</p>`;
      return;
    }

    container.innerHTML = filtered.map(c => `
      <div class="case-card" onclick="window.oneHealthApp.openCaseModal('${c.id}')">
        <div class="case-card-header">
          <div>
            <strong>${c.subject_name}</strong>
            <span style="font-size:11px; color:var(--text-muted);"> (${c.age_or_dob || 'N/A'})</span>
          </div>
          <span class="badge badge-${(c.risk_level || 'GREEN').toLowerCase()}">${c.risk_level}</span>
        </div>
        <div class="case-condition">${c.primary_condition}</div>
        <div class="case-footer">
          <span>📍 ${c.village}</span>
          <span class="cat-btn" style="padding:4px 8px; font-size:11px;">Review Case ➔</span>
        </div>
      </div>
    `).join('');
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
