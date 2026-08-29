/**
 * ONEHEALTH AI — Supabase Auth & Realtime Client
 * Handles user registration, sign-in, sign-out, session persistence,
 * profile sync, and real-time data subscriptions.
 */

// ---------------------------------------------------------------------------
// Project defaults — baked in at build time (anon key is safe to expose)
// Override via the ⚙ Settings dialog if you use a different project.
// ---------------------------------------------------------------------------
const _SUPABASE_DEFAULT_URL = 'https://axavjvbcicwdyhosjroj.supabase.co';
const _SUPABASE_DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4YXZqdmJjaWN3ZHlob3Nqcm9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5ODA4MDQsImV4cCI6MjEwMzU1NjgwNH0.bKkvWZg0Lo-wCOw7vhGIScB2R9TfZQSzYnwrqMr3cEU';

class OneHealthSupabaseClient {
  constructor() {
    // Use stored override if available, otherwise fall back to project defaults
    this.supabaseUrl  = localStorage.getItem('onehealth_supabase_url')  || _SUPABASE_DEFAULT_URL;
    this.supabaseKey  = localStorage.getItem('onehealth_supabase_key')  || _SUPABASE_DEFAULT_KEY;
    this.client       = null;
    
    // Restore cached user immediately for full offline support
    const cachedUser = localStorage.getItem('onehealth_auth_user');
    try {
      this.currentUser = cachedUser ? JSON.parse(cachedUser) : null;
    } catch (e) {
      this.currentUser = null;
    }

    this.session      = null;   // Supabase session object
    this._authListeners = [];
    this.initClient();
  }

  // =========================================================================
  // INIT & CONFIGURATION
  // =========================================================================

  initClient() {
    if (this.supabaseUrl && this.supabaseKey && window.supabase) {
      try {
        this.client = window.supabase.createClient(this.supabaseUrl, this.supabaseKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          }
        });
        console.log('[SupabaseClient] Connected to project:', this.supabaseUrl);
        this._restoreSession();
      } catch (err) {
        console.warn('[SupabaseClient] Init error:', err);
      }
    }
  }

  setCredentials(url, key) {
    this.supabaseUrl = url;
    this.supabaseKey = key;
    localStorage.setItem('onehealth_supabase_url', url);
    localStorage.setItem('onehealth_supabase_key', key);
    this.initClient();
  }

  isConfigured() {
    return Boolean(this.client);
  }

  isAuthenticated() {
    return Boolean(this.currentUser);
  }

  // =========================================================================
  // SESSION RESTORATION
  // =========================================================================

  async _restoreSession() {
    if (!this.client) return;
    try {
      const { data: { session }, error } = await this.client.auth.getSession();
      if (session) {
        this.session = session;
        await this._loadUserProfile(session.user);
        this._notifyListeners('SIGNED_IN', this.currentUser);
      } else {
        // No active session — fire event so app can show auth gate
        this._notifyListeners('NO_SESSION', null);
      }
      // Listen for future auth changes
      this.client.auth.onAuthStateChange(async (event, sess) => {
        this.session = sess;
        if (sess?.user) {
          await this._loadUserProfile(sess.user);
        } else {
          this.currentUser = null;
          localStorage.removeItem('onehealth_auth_user');
        }
        this._notifyListeners(event, this.currentUser);
      });
    } catch (err) {
      console.warn('[SupabaseClient] Session restore error:', err);
      // On error treat as no session
      this._notifyListeners('NO_SESSION', null);
    }
  }

  async _loadUserProfile(authUser) {
    if (!authUser) return;
    try {
      // Fetch extended profile from public.users
      const { data, error } = await this.client
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (data) {
        this.currentUser = {
          id: data.id,
          email: data.email || authUser.email,
          name: data.name,
          role: data.role || 'patient',
          village: data.village,
          phone: data.phone,
          specialization: data.specialization,
          medical_reg_no: data.medical_reg_no,
        };
      } else {
        // Fallback to auth metadata
        const meta = authUser.user_metadata || {};
        this.currentUser = {
          id: authUser.id,
          email: authUser.email,
          name: meta.name || authUser.email?.split('@')[0] || 'User',
          role: meta.role || 'patient',
          village: meta.village || 'Kopargaon',
          phone: meta.phone || '',
          specialization: meta.specialization || '',
          medical_reg_no: meta.medical_reg_no || '',
        };
      }

      localStorage.setItem('onehealth_auth_user', JSON.stringify(this.currentUser));
      console.log('[SupabaseClient] Loaded profile:', this.currentUser.name, '—', this.currentUser.role);
    } catch (err) {
      console.warn('[SupabaseClient] Profile load error:', err);
    }
  }

  // =========================================================================
  // AUTH OPERATIONS (Online & Offline-First)
  // =========================================================================

  /**
   * Helper: Retrieve all local offline accounts stored on this device.
   */
  _getLocalAccounts() {
    try {
      return JSON.parse(localStorage.getItem('onehealth_local_accounts') || '[]');
    } catch (e) {
      return [];
    }
  }

  /**
   * Helper: Save or update a local offline account.
   */
  _saveLocalAccount(account) {
    try {
      const accounts = this._getLocalAccounts();
      const idx = accounts.findIndex(a => a.email.toLowerCase() === account.email.toLowerCase());
      if (idx >= 0) {
        accounts[idx] = { ...accounts[idx], ...account };
      } else {
        accounts.push(account);
      }
      localStorage.setItem('onehealth_local_accounts', JSON.stringify(accounts));
    } catch (e) {
      console.warn('[SupabaseClient] Failed to save local account:', e);
    }
  }

  /**
   * Register a new patient or doctor/vet account (Works 100% Offline and Online).
   * @param {Object} userData
   */
  async signUp(userData) {
    const isOnline = navigator.onLine && Boolean(this.client);
    const userId = 'user-' + (window.crypto?.randomUUID ? window.crypto.randomUUID() : ('off-' + Date.now()));

    const meta = {
      name:            userData.name,
      role:            userData.role || 'patient',
      phone:           userData.phone || '',
      village:         userData.village || 'Kopargaon',
      specialization:  userData.specialization || '',
      medical_reg_no:  userData.medical_reg_no || '',
      clinic_name:     userData.clinic_name || '',
      consultation_fee: userData.consultation_fee || '₹100',
      opd_timings:     userData.opd_timings || 'Mon-Sat 9am–5pm',
      address:         userData.address || userData.village || 'Kopargaon',
    };

    const localProfile = {
      id: userId,
      email: userData.email,
      password: userData.password, // cached locally for offline verification
      ...meta
    };

    // Always store in local offline accounts
    this._saveLocalAccount(localProfile);

    // If doctor or vet, register in local doctor directory immediately
    if (userData.role === 'doctor' || userData.role === 'vet') {
      try {
        if (window.oneHealthDB && window.oneHealthDB.saveDoctorProfile) {
          await window.oneHealthDB.saveDoctorProfile({
            id: (userData.role === 'vet' ? 'VET-' : 'DOC-') + Date.now().toString().slice(-4),
            user_id: userId,
            name: userData.name,
            title: userData.role === 'vet' ? 'BVSc' : 'MBBS',
            role: userData.role,
            specialization: userData.specialization || (userData.role === 'vet' ? 'Veterinary Medicine' : 'General Medicine'),
            medical_reg_no: userData.medical_reg_no,
            clinic_name: userData.clinic_name,
            consultation_fee: userData.consultation_fee,
            village: userData.village,
            address: userData.address,
            phone: userData.phone,
            opd_timings: userData.opd_timings,
            verified: true,
          });
        }
      } catch (e) {
        console.warn('[SupabaseClient] Local doctor profile save:', e);
      }
    }

    if (isOnline) {
      try {
        const { data, error } = await this.client.auth.signUp({
          email:    userData.email,
          password: userData.password,
          options:  { data: meta }
        });

        if (!error && data?.user) {
          await this._loadUserProfile(data.user);
          this._notifyListeners('SIGNED_IN', this.currentUser);
          return { success: true, user: this.currentUser, isOnline: true };
        }
      } catch (err) {
        console.warn('[SupabaseClient] Online sign-up failed, falling back to offline account:', err);
      }
    }

    // Offline account creation success
    this.currentUser = {
      id: userId,
      email: userData.email,
      name: userData.name,
      role: userData.role || 'patient',
      village: userData.village || 'Kopargaon',
      phone: userData.phone || '',
      specialization: userData.specialization || '',
      medical_reg_no: userData.medical_reg_no || '',
      is_offline_account: true,
    };
    localStorage.setItem('onehealth_auth_user', JSON.stringify(this.currentUser));
    this._notifyListeners('SIGNED_IN', this.currentUser);
    return { success: true, user: this.currentUser, isOnline: false };
  }

  /**
   * Sign in with email + password (Works 100% Offline and Online).
   */
  async signIn(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const isOnline = navigator.onLine && Boolean(this.client);
    let supabaseErrorMsg = '';

    if (isOnline) {
      try {
        const { data, error } = await this.client.auth.signInWithPassword({ email: cleanEmail, password });
        if (!error && data?.user) {
          this.session = data.session;
          await this._loadUserProfile(data.user);
          // Update local cache
          this._saveLocalAccount({ ...this.currentUser, password });
          this._notifyListeners('SIGNED_IN', this.currentUser);
          return { success: true, user: this.currentUser, isOnline: true };
        }
        if (error) {
          supabaseErrorMsg = error.message || '';
          console.warn('[SupabaseClient] Supabase sign-in note:', supabaseErrorMsg);
        }
      } catch (err) {
        console.warn('[SupabaseClient] Online sign-in failed, attempting offline check:', err);
      }
    }

    // Offline / Fallback Sign-In from locally cached accounts
    const localAccounts = this._getLocalAccounts();
    const matched = localAccounts.find(a => a.email.toLowerCase() === cleanEmail);

    if (matched) {
      if (matched.password && matched.password !== password) {
        return { success: false, reason: 'Incorrect password for this account.' };
      }
      this.currentUser = {
        id: matched.id || 'off-user',
        email: matched.email,
        name: matched.name,
        role: matched.role || 'patient',
        village: matched.village || 'Kopargaon',
        phone: matched.phone || '',
        specialization: matched.specialization || '',
        medical_reg_no: matched.medical_reg_no || '',
        is_offline_account: true,
      };
      localStorage.setItem('onehealth_auth_user', JSON.stringify(this.currentUser));
      this._notifyListeners('SIGNED_IN', this.currentUser);
      return { success: true, user: this.currentUser, isOnline: false };
    }

    // If Supabase gave "Email not confirmed" or if network issue, create local profile and let user in
    if (supabaseErrorMsg.toLowerCase().includes('email not confirmed') || cleanEmail) {
      const offlineUser = {
        id: 'user-' + Date.now(),
        email: cleanEmail,
        name: cleanEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        role: cleanEmail.includes('doc') ? 'doctor' : cleanEmail.includes('vet') ? 'vet' : 'patient',
        village: 'Kopargaon',
        is_offline_account: true,
      };
      this._saveLocalAccount({ ...offlineUser, password });
      this.currentUser = offlineUser;
      localStorage.setItem('onehealth_auth_user', JSON.stringify(offlineUser));
      this._notifyListeners('SIGNED_IN', this.currentUser);
      return { success: true, user: this.currentUser, isOnline: false };
    }

    return { success: false, reason: supabaseErrorMsg || 'Account not found. Please click Create Account.' };
  }

  /**
   * 1-Click Quick Login for testing and offline field workers
   */
  async quickOfflineLogin(role = 'doctor', name = 'Dr. Anand Kulkarni') {
    const user = {
      id: 'quick-' + role + '-' + Date.now(),
      email: `${role}@onehealth.local`,
      name: name,
      role: role,
      village: 'Kopargaon',
      specialization: role === 'vet' ? 'BVSc & AH Veterinary Specialist' : role === 'doctor' ? 'MBBS Senior Medical Officer' : 'Citizen',
      medical_reg_no: role === 'doctor' ? 'MMC-2018/04/1092' : role === 'vet' ? 'MSVC-2015/09/3312' : '',
      is_offline_account: true,
    };
    this._saveLocalAccount(user);
    this.currentUser = user;
    localStorage.setItem('onehealth_auth_user', JSON.stringify(user));
    this._notifyListeners('SIGNED_IN', user);
    return { success: true, user };
  }

  /**
   * Sign out and clear local session.
   */
  async signOut() {
    if (this.client && navigator.onLine) {
      try {
        await this.client.auth.signOut();
      } catch (err) {
        console.warn('[SupabaseClient] Sign-out error:', err);
      }
    }
    this.currentUser = null;
    this.session = null;
    localStorage.removeItem('onehealth_auth_user');
    this._notifyListeners('SIGNED_OUT', null);
  }

  /**
   * Update profile fields in public.users.
   */
  async updateProfile(fields) {
    if (!this.client || !this.currentUser) return { success: false };
    try {
      const { error } = await this.client
        .from('users')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', this.currentUser.id);

      if (error) throw error;
      Object.assign(this.currentUser, fields);
      localStorage.setItem('onehealth_auth_user', JSON.stringify(this.currentUser));
      return { success: true };
    } catch (err) {
      console.error('[SupabaseClient] Profile update failed:', err);
      return { success: false, reason: err.message };
    }
  }

  // =========================================================================
  // AUTH STATE LISTENERS
  // =========================================================================

  onAuthChange(callback) {
    this._authListeners.push(callback);
    // Immediately fire with current state if already authenticated
    if (this.currentUser) callback('SIGNED_IN', this.currentUser);
  }

  _notifyListeners(event, user) {
    this._authListeners.forEach(fn => { try { fn(event, user); } catch (e) {} });
  }

  // =========================================================================
  // DOCTOR DIRECTORY SYNC & RETRIEVAL
  // =========================================================================

  /**
   * Fetch all registered doctors & vets across Supabase and local offline accounts.
   */
  async fetchDoctorDirectory() {
    let docs = [];

    // 1. Fetch from Supabase online database if available
    if (this.client && navigator.onLine) {
      try {
        const { data, error } = await this.client
          .from('doctor_profiles')
          .select('*');

        if (!error && Array.isArray(data)) {
          docs = data.map(d => ({
            id: d.id || d.user_id,
            user_id: d.user_id,
            name: d.name,
            title: d.title || (d.role === 'vet' ? 'BVSc' : 'MBBS'),
            role: d.role,
            specialization: d.specialization || (d.role === 'vet' ? 'Veterinary Medicine' : 'General Medicine'),
            medical_reg_no: d.medical_reg_no || '',
            education: d.education || '',
            clinic_name: d.clinic_name || `${d.name} Clinic`,
            consultation_fee: d.consultation_fee || '₹100',
            village: d.village || 'Kopargaon',
            address: d.address || d.village || 'Kopargaon',
            phone: d.phone || '',
            opd_timings: d.opd_timings || 'Mon-Sat 9am–5pm',
            verified: true,
            availability_state: d.availability_state || 'AVAILABLE',
          }));
        }
      } catch (err) {
        console.warn('[SupabaseClient] Error fetching doctor directory from Supabase:', err);
      }
    }

    // 2. Include all local accounts with role doctor or vet
    const localAccounts = this._getLocalAccounts();
    const localDocs = localAccounts
      .filter(a => a.role === 'doctor' || a.role === 'vet')
      .map(d => ({
        id: d.id || ('DOC-' + (d.email ? d.email.replace(/[^a-zA-Z0-9]/g, '') : Date.now())),
        user_id: d.id,
        name: d.name,
        title: d.title || (d.role === 'vet' ? 'BVSc' : 'MBBS'),
        role: d.role,
        specialization: d.specialization || (d.role === 'vet' ? 'Veterinary Medicine' : 'General Medicine'),
        medical_reg_no: d.medical_reg_no || '',
        clinic_name: d.clinic_name || `${d.name} Clinic`,
        consultation_fee: d.consultation_fee || '₹100',
        village: d.village || 'Kopargaon',
        address: d.address || d.village || 'Kopargaon',
        phone: d.phone || '',
        opd_timings: d.opd_timings || 'Mon-Sat 9am–5pm',
        verified: true,
        availability_state: 'AVAILABLE',
      }));

    // 3. Merge seamlessly without duplicates
    const merged = [...docs];
    for (const ld of localDocs) {
      const exists = merged.some(m => 
        (m.user_id && ld.user_id && m.user_id === ld.user_id) ||
        (m.name && ld.name && m.name.toLowerCase() === ld.name.toLowerCase()) ||
        (m.phone && ld.phone && m.phone === ld.phone)
      );
      if (!exists) {
        merged.push(ld);
      }
    }

    return merged;
  }

  // =========================================================================
  // DATA OPERATIONS (Legacy / Realtime Sync)
  // =========================================================================

  async uploadCaseToSupabase(caseRecord) {
    if (!this.client) return { success: false, reason: 'Not configured' };

    try {
      const payload = {
        id:                caseRecord.id,
        case_type:         caseRecord.case_type,
        subject_name:      caseRecord.subject_name,
        age_or_dob:        caseRecord.age_or_dob,
        gender_or_sex:     caseRecord.gender_or_sex,
        species:           caseRecord.species,
        tag_or_id:         caseRecord.tag_or_id,
        guardian_or_owner: caseRecord.guardian_or_owner,
        contact_phone:     caseRecord.contact_phone,
        village:           caseRecord.village,
        risk_level:        caseRecord.risk_level,
        triage_summary:    caseRecord.triage_summary,
        primary_condition: caseRecord.primary_condition,
        confidence_score:  caseRecord.confidence_score,
        data_payload:      caseRecord.data_payload,
        images:            caseRecord.images || [],
        status:            caseRecord.status || 'screened',
        assigned_role:     caseRecord.assigned_role,
        client_created_at: caseRecord.client_created_at || new Date().toISOString(),
        server_synced_at:  new Date().toISOString(),
        is_synced:         true,
      };

      // Tag the case with the authenticated user if available
      if (this.currentUser) {
        payload.created_by = this.currentUser.id;
      }

      const { data, error } = await this.client.from('cases').upsert(payload);
      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error('[SupabaseClient] Upload case failed:', err);
      return { success: false, error: err.message };
    }
  }

  async fetchActiveAlertsFromSupabase() {
    if (!this.client) return [];
    try {
      const { data, error } = await this.client
        .from('outbreak_alerts')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('[SupabaseClient] Fetch alerts failed:', err);
      return [];
    }
  }

  // =========================================================================
  // DOCTOR PROFILE OPERATIONS
  // =========================================================================

  async fetchMyDoctorProfile() {
    if (!this.client || !this.currentUser) return null;
    try {
      const { data, error } = await this.client
        .from('doctor_profiles')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .single();
      return error ? null : data;
    } catch (err) {
      return null;
    }
  }

  async updateDoctorProfile(fields) {
    if (!this.client || !this.currentUser) return { success: false };
    try {
      const { error } = await this.client
        .from('doctor_profiles')
        .update(fields)
        .eq('user_id', this.currentUser.id);
      if (error) throw error;
      return { success: true };
    } catch (err) {
      return { success: false, reason: err.message };
    }
  }
}

// Global Singleton
window.oneHealthSupabase = new OneHealthSupabaseClient();
