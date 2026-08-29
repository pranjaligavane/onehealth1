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
    this.currentUser  = null;   // { id, email, name, role, ... }
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
  // AUTH OPERATIONS
  // =========================================================================

  /**
   * Register a new patient or doctor/vet account.
   * @param {Object} userData — { email, password, name, role, phone, village,
   *                             specialization, medical_reg_no, clinic_name,
   *                             consultation_fee, opd_timings, address }
   */
  async signUp(userData) {
    if (!this.client) return { success: false, reason: 'Supabase not configured. Please set up your project credentials.' };

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

    try {
      const { data, error } = await this.client.auth.signUp({
        email:    userData.email,
        password: userData.password,
        options:  { data: meta }
      });

      if (error) throw error;

      // Immediately update profile
      if (data.user) {
        await this._loadUserProfile(data.user);
      }

      return { success: true, user: this.currentUser, data };
    } catch (err) {
      console.error('[SupabaseClient] Sign-up failed:', err);
      return { success: false, reason: err.message || 'Registration failed' };
    }
  }

  /**
   * Sign in with email + password.
   */
  async signIn(email, password) {
    if (!this.client) return { success: false, reason: 'Supabase not configured' };

    try {
      const { data, error } = await this.client.auth.signInWithPassword({ email, password });
      if (error) throw error;

      this.session = data.session;
      await this._loadUserProfile(data.user);
      return { success: true, user: this.currentUser };
    } catch (err) {
      console.error('[SupabaseClient] Sign-in failed:', err);
      return { success: false, reason: err.message || 'Login failed. Check your email & password.' };
    }
  }

  /**
   * Sign out and clear local session.
   */
  async signOut() {
    if (!this.client) return;
    try {
      await this.client.auth.signOut();
    } catch (err) {
      console.warn('[SupabaseClient] Sign-out error:', err);
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
