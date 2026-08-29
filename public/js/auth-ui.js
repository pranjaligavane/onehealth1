/**
 * ONEHEALTH AI — Auth UI Manager
 * Drives the Sign In / Sign Up modal, header user badge, and Supabase project setup.
 */

class OneHealthAuth {
  constructor() {
    this._activeTab = 'signin';    // 'signin' | 'signup'
    this._signupRole = 'patient';  // 'patient' | 'doctor' | 'vet'
  }

  _handleOverlayClick(event) {
    if (event.target.id === 'authModal') this.closeModal();
  }

  // =========================================================================
  // MODAL CONTROLS
  // =========================================================================

  openModal(tab = 'signin') {
    this._activeTab = tab;
    this._render();
    document.getElementById('authModal').style.display = 'flex';
    // Focus first field
    setTimeout(() => {
      const first = document.querySelector('#authModal input[type="email"]');
      if (first) first.focus();
    }, 100);
  }

  openForRole(role = 'patient') {
    this._activeTab = 'signup';
    this._signupRole = role;
    this.openModal('signup');
  }

  closeModal() {
    // Don't allow closing modal if user is not authenticated (auth gate)
    if (!window.oneHealthSupabase || !window.oneHealthSupabase.isAuthenticated()) {
      // shake the card to signal it cannot be dismissed
      const card = document.getElementById('authModalCard');
      if (card) {
        card.style.animation = 'none';
        card.offsetHeight; // reflow
        card.style.animation = 'shakeError 0.35s ease';
      }
      return;
    }
    const m = document.getElementById('authModal');
    if (m) m.style.display = 'none';
  }

  switchTab(tab) {
    this._activeTab = tab;
    this._render();
  }

  setSignupRole(role) {
    this._signupRole = role;
    this._render();
    // Re-open but keep modal open
  }

  // =========================================================================
  // RENDER
  // =========================================================================

  _render() {
    const body = document.getElementById('authModalBody');
    if (!body) return;

    // Toggle close button visibility based on whether the user is logged in
    const closeBtn = document.getElementById('authModalCloseBtn');
    if (closeBtn) {
      const isAuth = window.oneHealthSupabase && window.oneHealthSupabase.isAuthenticated();
      closeBtn.style.display = isAuth ? 'flex' : 'none';
    }

    const isSignIn = this._activeTab === 'signin';
    const role     = this._signupRole;

    const tabStyle = (active) =>
      `auth-tab-btn ${active ? 'active' : ''}`;

    const roleBtn = (r, icon, label) =>
      `<button type="button" class="role-pill ${role === r ? 'active' : ''}"
         onclick="window.oneHealthAuth.setSignupRole('${r}')">${icon} ${label}</button>`;

    const isDoctor = role === 'doctor' || role === 'vet';

    body.innerHTML = `
      <!-- Tabs -->
      <div class="auth-tabs">
        <button type="button" class="${tabStyle(isSignIn)}"
          onclick="window.oneHealthAuth.switchTab('signin')">Sign In</button>
        <button type="button" class="${tabStyle(!isSignIn)}"
          onclick="window.oneHealthAuth.switchTab('signup')">Sign Up</button>
      </div>

      ${isSignIn ? this._signInForm() : this._signUpForm(role, isDoctor)}
    `;
  }

  _signInForm() {
    return `
      <form id="signInForm" onsubmit="window.oneHealthAuth.handleSignIn(event)" autocomplete="on">
        <div class="auth-form-group">
          <label for="siEmail">Email Address</label>
          <input id="siEmail" type="email" class="auth-input" placeholder="you@example.com"
            autocomplete="email" required />
        </div>
        <div class="auth-form-group">
          <label for="siPassword">Password</label>
          <div class="auth-input-row">
            <input id="siPassword" type="password" class="auth-input" placeholder="••••••••"
              autocomplete="current-password" required />
            <button type="button" class="auth-eye-btn"
              onclick="window.oneHealthAuth.togglePwd('siPassword', this)">👁</button>
          </div>
        </div>
        <div id="siError" class="auth-error" style="display:none;"></div>
        <button type="submit" id="siSubmit" class="auth-submit-btn">
          <span id="siSpinner" class="auth-spinner" style="display:none;"></span>
          Sign In
        </button>
        <p class="auth-switch-text">
          No account?
          <button type="button" class="auth-link-btn"
            onclick="window.oneHealthAuth.switchTab('signup')">Create one</button>
        </p>
      </form>
    `;
  }

  _signUpForm(role, isDoctor) {
    return `
      <form id="signUpForm" onsubmit="window.oneHealthAuth.handleSignUp(event)" autocomplete="on">

        <!-- Role Selector -->
        <div class="auth-form-group">
          <label>I am a…</label>
          <div class="role-pills">
            ${this._roleBtn('patient', '👤', 'Patient / Citizen')}
            ${this._roleBtn('doctor',  '🩺', 'Medical Doctor')}
            ${this._roleBtn('vet',     '🐄', 'Veterinarian')}
          </div>
        </div>

        <!-- Common Fields -->
        <div class="auth-form-group">
          <label for="suName">Full Name</label>
          <input id="suName" type="text" class="auth-input" placeholder="Dr. Priya Sharma / Ramesh Patil"
            autocomplete="name" required />
        </div>
        <div class="auth-form-group">
          <label for="suEmail">Email Address</label>
          <input id="suEmail" type="email" class="auth-input" placeholder="you@example.com"
            autocomplete="email" required />
        </div>
        <div class="auth-form-group">
          <label for="suPassword">Password <span class="auth-hint">(min 6 chars)</span></label>
          <div class="auth-input-row">
            <input id="suPassword" type="password" class="auth-input" placeholder="Choose a strong password"
              autocomplete="new-password" minlength="6" required />
            <button type="button" class="auth-eye-btn"
              onclick="window.oneHealthAuth.togglePwd('suPassword', this)">👁</button>
          </div>
        </div>
        <div class="auth-fields-row">
          <div class="auth-form-group">
            <label for="suPhone">Phone Number</label>
            <input id="suPhone" type="tel" class="auth-input" placeholder="+91 98765 43210"
              autocomplete="tel" />
          </div>
          <div class="auth-form-group">
            <label for="suVillage">Village / Town</label>
            <input id="suVillage" type="text" class="auth-input" placeholder="Kopargaon"
              value="Kopargaon" autocomplete="address-level2" />
          </div>
        </div>

        ${isDoctor ? this._doctorFields(role) : ''}

        <div id="suError" class="auth-error" style="display:none;"></div>
        <button type="submit" id="suSubmit" class="auth-submit-btn">
          <span id="suSpinner" class="auth-spinner" style="display:none;"></span>
          Create Account
        </button>
        <p class="auth-switch-text">
          Already registered?
          <button type="button" class="auth-link-btn"
            onclick="window.oneHealthAuth.switchTab('signin')">Sign In</button>
        </p>
      </form>
    `;
  }

  _roleBtn(r, icon, label) {
    const active = this._signupRole === r ? 'active' : '';
    return `<button type="button" class="role-pill ${active}"
      onclick="window.oneHealthAuth.setSignupRole('${r}')">${icon} ${label}</button>`;
  }

  _doctorFields(role) {
    const title = role === 'vet' ? 'Veterinary' : 'Medical';
    return `
      <div class="auth-doctor-section">
        <div class="auth-doctor-badge">${role === 'vet' ? '🐄' : '🩺'} ${title} Professional Details</div>

        <div class="auth-fields-row">
          <div class="auth-form-group">
            <label for="suRegNo">${role === 'vet' ? 'VCI' : 'MCI'} Reg. No.</label>
            <input id="suRegNo" type="text" class="auth-input" placeholder="e.g. MH-12345" />
          </div>
          <div class="auth-form-group">
            <label for="suSpec">Specialization</label>
            <input id="suSpec" type="text" class="auth-input"
              placeholder="${role === 'vet' ? 'BVSc Veterinary Officer' : 'MBBS General Physician'}" />
          </div>
        </div>

        <div class="auth-form-group">
          <label for="suClinic">Clinic / Hospital Name</label>
          <input id="suClinic" type="text" class="auth-input" placeholder="Kopargaon Primary Health Center" />
        </div>

        <div class="auth-fields-row">
          <div class="auth-form-group">
            <label for="suFee">Consultation Fee</label>
            <input id="suFee" type="text" class="auth-input" placeholder="₹100" />
          </div>
          <div class="auth-form-group">
            <label for="suOpd">OPD Timings</label>
            <input id="suOpd" type="text" class="auth-input" placeholder="Mon-Sat 9am-5pm" />
          </div>
        </div>

        <div class="auth-form-group">
          <label for="suAddress">Clinic Address</label>
          <input id="suAddress" type="text" class="auth-input" placeholder="Near Bus Stand, Kopargaon" />
        </div>

        <p class="auth-hint-block">
          ℹ Your profile will appear in the Doctor Directory after admin verification.
        </p>
      </div>
    `;
  }

  // =========================================================================
  // FORM HANDLERS
  // =========================================================================

  async handleSignIn(event) {
    event.preventDefault();
    const email    = document.getElementById('siEmail').value.trim();
    const password = document.getElementById('siPassword').value;
    const errEl    = document.getElementById('siError');
    const spinner  = document.getElementById('siSpinner');
    const btn      = document.getElementById('siSubmit');

    this._setLoading(btn, spinner, true);
    errEl.style.display = 'none';

    if (!window.oneHealthSupabase.isConfigured()) {
      this._showError(errEl, 'Supabase not configured. Please set project credentials first (⚙ button).');
      this._setLoading(btn, spinner, false);
      return;
    }

    const result = await window.oneHealthSupabase.signIn(email, password);
    this._setLoading(btn, spinner, false);

    if (result.success) {
      this.closeModal();
      this._onLoginSuccess(result.user);
    } else {
      this._showError(errEl, result.reason || 'Login failed. Please try again.');
    }
  }

  async handleSignUp(event) {
    event.preventDefault();
    const errEl   = document.getElementById('suError');
    const spinner = document.getElementById('suSpinner');
    const btn     = document.getElementById('suSubmit');

    const email    = document.getElementById('suEmail').value.trim();
    const password = document.getElementById('suPassword').value;
    const name     = document.getElementById('suName').value.trim();
    const phone    = document.getElementById('suPhone')?.value.trim()   || '';
    const village  = document.getElementById('suVillage')?.value.trim() || 'Kopargaon';
    const role     = this._signupRole;

    const isDoctor = role === 'doctor' || role === 'vet';

    const userData = {
      email, password, name, phone, village, role,
      ...(isDoctor ? {
        specialization:   document.getElementById('suSpec')?.value.trim()    || '',
        medical_reg_no:   document.getElementById('suRegNo')?.value.trim()   || '',
        clinic_name:      document.getElementById('suClinic')?.value.trim()  || `${name} Clinic`,
        consultation_fee: document.getElementById('suFee')?.value.trim()     || '₹100',
        opd_timings:      document.getElementById('suOpd')?.value.trim()     || 'Mon-Sat 9am-5pm',
        address:          document.getElementById('suAddress')?.value.trim() || village,
      } : {})
    };

    if (!email || !password || !name) {
      this._showError(errEl, 'Please fill in all required fields.');
      return;
    }
    if (password.length < 6) {
      this._showError(errEl, 'Password must be at least 6 characters.');
      return;
    }

    this._setLoading(btn, spinner, true);
    errEl.style.display = 'none';

    if (!window.oneHealthSupabase.isConfigured()) {
      this._showError(errEl, 'Supabase not configured. Please set project credentials first (⚙ button).');
      this._setLoading(btn, spinner, false);
      return;
    }

    const result = await window.oneHealthSupabase.signUp(userData);
    this._setLoading(btn, spinner, false);

    if (result.success) {
      this.closeModal();
      this._onLoginSuccess(result.user);
      if (isDoctor) {
        setTimeout(() => {
          if (window.oneHealthApp) {
            window.oneHealthApp.showToast('🎉 Account created! Your doctor profile is pending admin verification.');
          }
        }, 500);
      }
    } else {
      this._showError(errEl, result.reason || 'Registration failed. Please try again.');
    }
  }

  _onLoginSuccess(user) {
    if (!user) return;
    // Set role in app
    if (window.oneHealthApp) {
      window.oneHealthApp.setUserRoleFromAuth(user.role, user);
      window.oneHealthApp.showToast(`✅ Welcome, ${user.name}!`);
    }
    this._updateHeaderUI(user);
  }

  _updateHeaderUI(user) {
    const badge = document.getElementById('authUserBadge');
    const login = document.getElementById('btnAuthLogin');
    const name  = document.getElementById('authUserName');
    const icon  = document.getElementById('authUserIcon');

    if (!user) {
      if (badge) badge.style.display = 'none';
      if (login) login.style.display = 'flex';
      return;
    }

    if (badge) badge.style.display = 'flex';
    if (login) login.style.display = 'none';
    if (name)  name.innerText  = user.name?.split(' ')[0] || user.email?.split('@')[0] || 'User';
    if (icon)  icon.innerText  = user.role === 'doctor' ? '🩺' : user.role === 'vet' ? '🐄' : '👤';
  }

  // =========================================================================
  // SUPABASE SETTINGS MODAL
  // =========================================================================

  openSettings() {
    const url = localStorage.getItem('onehealth_supabase_url') || '';
    const key = localStorage.getItem('onehealth_supabase_key') || '';
    document.getElementById('sbUrlInput').value = url;
    document.getElementById('sbKeyInput').value = key;
    document.getElementById('supabaseSettingsModal').style.display = 'flex';
  }

  closeSettings() {
    document.getElementById('supabaseSettingsModal').style.display = 'none';
  }

  saveSettings() {
    const url = document.getElementById('sbUrlInput').value.trim();
    const key = document.getElementById('sbKeyInput').value.trim();
    if (!url || !key) {
      alert('Please enter both Supabase Project URL and Anon Key.');
      return;
    }
    window.oneHealthSupabase.setCredentials(url, key);
    this.closeSettings();
    if (window.oneHealthApp) window.oneHealthApp.showToast('✅ Supabase credentials saved');
  }

  // =========================================================================
  // SIGN OUT
  // =========================================================================

  async signOut() {
    await window.oneHealthSupabase.signOut();
    this._updateHeaderUI(null);
    if (window.oneHealthApp) {
      window.oneHealthApp.currentAuthUser = null;
      localStorage.removeItem('onehealth_user_role');
      localStorage.removeItem('onehealth_auth_user');
      window.oneHealthApp.navigateTo('welcome');
      window.oneHealthApp.showToast('Signed out successfully');
    }
  }

  // =========================================================================
  // HELPERS
  // =========================================================================

  togglePwd(inputId, btn) {
    const inp = document.getElementById(inputId);
    if (!inp) return;
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    btn.innerText = show ? '🙈' : '👁';
  }

  _showError(el, msg) {
    el.innerText = msg;
    el.style.display = 'block';
  }

  _setLoading(btn, spinner, loading) {
    btn.disabled = loading;
    if (spinner) spinner.style.display = loading ? 'inline-block' : 'none';
  }

  // =========================================================================
  // INIT — called once on DOMContentLoaded
  // =========================================================================

  init() {
    // Register for auth state changes from Supabase / offline client
    window.oneHealthSupabase.onAuthChange((event, user) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && user) {
        const m = document.getElementById('authModal');
        if (m) m.style.display = 'none';
        this._updateHeaderUI(user);
        if (window.oneHealthApp) {
          window.oneHealthApp.setUserRoleFromAuth(user.role, user);
          window.oneHealthApp.showToast(`Welcome, ${user.name || 'User'} 👋`);
        }
      } else if (event === 'SIGNED_OUT' || event === 'NO_SESSION') {
        this._updateHeaderUI(null);
        if (window.oneHealthApp && !window.oneHealthSupabase.isAuthenticated()) {
          window.oneHealthApp.navigateTo('welcome');
        }
      }
    });

    // Check for cached session immediately (instant UI, before async Supabase resolves)
    const cached = localStorage.getItem('onehealth_auth_user');
    if (cached) {
      try {
        const user = JSON.parse(cached);
        this._updateHeaderUI(user);
        if (window.oneHealthApp) {
          window.oneHealthApp.setUserRoleFromAuth(user.role, user);
        }
      } catch (e) {
        localStorage.removeItem('onehealth_auth_user');
      }
    } else {
      if (window.oneHealthApp) {
        window.oneHealthApp.navigateTo('welcome');
      }
    }

    // Initial render so modal body is ready
    setTimeout(() => this._render(), 0);
  }
}

window.oneHealthAuth = new OneHealthAuth();
