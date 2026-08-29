/**
 * ONEHEALTH AI - Optional Client-Side Supabase Realtime Sync Driver
 * Enables direct bidirectional synchronization between browser IndexedDB and Supabase PostgreSQL.
 */

class OneHealthSupabaseClient {
  constructor() {
    this.supabaseUrl = localStorage.getItem('onehealth_supabase_url') || null;
    this.supabaseKey = localStorage.getItem('onehealth_supabase_key') || null;
    this.client = null;
    this.initClient();
  }

  initClient() {
    if (this.supabaseUrl && this.supabaseKey && window.supabase) {
      try {
        this.client = window.supabase.createClient(this.supabaseUrl, this.supabaseKey);
        console.log('[SupabaseClient] Connected to project:', this.supabaseUrl);
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

  async uploadCaseToSupabase(caseRecord) {
    if (!this.client) return { success: false, reason: "Not configured" };

    try {
      const { data, error } = await this.client
        .from('cases')
        .upsert({
          id: caseRecord.id,
          case_type: caseRecord.case_type,
          subject_name: caseRecord.subject_name,
          age_or_dob: caseRecord.age_or_dob,
          gender_or_sex: caseRecord.gender_or_sex,
          species: caseRecord.species,
          tag_or_id: caseRecord.tag_or_id,
          guardian_or_owner: caseRecord.guardian_or_owner,
          contact_phone: caseRecord.contact_phone,
          village: caseRecord.village,
          risk_level: caseRecord.risk_level,
          triage_summary: caseRecord.triage_summary,
          primary_condition: caseRecord.primary_condition,
          confidence_score: caseRecord.confidence_score,
          data_payload: caseRecord.data_payload,
          images: caseRecord.images || [],
          status: caseRecord.status || 'screened',
          assigned_role: caseRecord.assigned_role,
          client_created_at: caseRecord.client_created_at || new Date().toISOString(),
          server_synced_at: new Date().toISOString(),
          is_synced: true
        });

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
}

// Global Singleton
window.oneHealthSupabase = new OneHealthSupabaseClient();
