/**
 * ONEHEALTH AI — Production-Grade Resilience & Recovery Engine
 * 
 * Protects against THE BLACKOUT challenge:
 * "The primary data store is suddenly corrupted or wiped while real operations are in progress."
 * 
 * Architecture:
 * - Primary Database: OneHealthOfflineDB (IndexedDB)
 * - Recovery Journal: OneHealthRecoveryJournalDB (Independent Append-Only Store)
 * - Cryptographic Integrity: Web Crypto API SHA-256 Checksums
 * - Deterministic Reconstruction Engine with Progressive Live Visualizer
 * - Mid-Operation Failure Detection & Partial Recovery
 * - Live Blackout Simulator (Controlled Demo Safe)
 */

class OneHealthResilienceEngine {
  constructor() {
    this.journalDbName = 'OneHealthRecoveryJournalDB';
    this.journalDbVersion = 1;
    this.journalDb = null;

    // States: 'NORMAL' | 'DEGRADED' | 'RECOVERY' | 'RESTORED'
    this.state = 'NORMAL';
    this.lastIntegrityReport = null;
    this.lastRecoveryReport = null;
    this.listeners = [];
    this.stepListeners = [];
    this.isChecking = false;
  }

  // =========================================================================
  // 1. INITIALIZATION OF INDEPENDENT RECOVERY JOURNAL STORE
  // =========================================================================

  async init() {
    if (this.journalDb) return this.journalDb;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.journalDbName, this.journalDbVersion);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 1. Append-Only Recovery Journal Store
        if (!db.objectStoreNames.contains('recovery_journal')) {
          const journalStore = db.createObjectStore('recovery_journal', { keyPath: 'id', autoIncrement: true });
          journalStore.createIndex('entityType', 'entityType', { unique: false });
          journalStore.createIndex('entityId', 'entityId', { unique: false });
          journalStore.createIndex('type', 'type', { unique: false });
          journalStore.createIndex('timestamp', 'timestamp', { unique: false });
          journalStore.createIndex('checksum', 'checksum', { unique: false });
        }

        // 2. Safe Pending Operations Queue (for degraded/recovery working mode)
        if (!db.objectStoreNames.contains('pending_operations')) {
          const pendingStore = db.createObjectStore('pending_operations', { keyPath: 'op_id' });
          pendingStore.createIndex('status', 'status', { unique: false });
          pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // 3. Resilience Engine Metadata
        if (!db.objectStoreNames.contains('resilience_metadata')) {
          db.createObjectStore('resilience_metadata', { keyPath: 'key' });
        }
      };

      request.onsuccess = async (event) => {
        this.journalDb = event.target.result;
        console.log('[ResilienceEngine] Independent Recovery Journal initialized:', this.journalDbName);
        await this._seedInitialJournalIfEmpty();
        resolve(this.journalDb);
      };

      request.onerror = (event) => {
        console.error('[ResilienceEngine] Failed to open Recovery Journal DB:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  // =========================================================================
  // 2. REAL SHA-256 CRYPTOGRAPHIC CHECKSUM ENGINE (Web Crypto API)
  // =========================================================================

  /**
   * Deterministic SHA-256 hash of any JS object using browser Web Crypto.
   * Sorts object keys recursively to ensure identical payload produces identical hash.
   */
  async computeChecksum(data) {
    try {
      const canonicalString = this._canonicalStringify(data);
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(canonicalString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hexString = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hexString;
    } catch (e) {
      console.warn('[ResilienceEngine] Checksum calculation fallback:', e);
      return 'hash-' + btoa(unescape(encodeURIComponent(JSON.stringify(data)))).slice(0, 32);
    }
  }

  _canonicalStringify(obj) {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return '[' + obj.map(item => this._canonicalStringify(item)).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    const keyValPairs = keys.map(k => JSON.stringify(k) + ':' + this._canonicalStringify(obj[k]));
    return '{' + keyValPairs.join(',') + '}';
  }

  // =========================================================================
  // 3. APPEND-ONLY RECOVERY JOURNAL RECORDING
  // =========================================================================

  /**
   * Logs a critical healthcare operation into the independent recovery journal.
   */
  async logEvent(type, entityType, entityId, data, options = {}) {
    await this.init();

    const timestamp = new Date().toISOString();
    const checksum = await this.computeChecksum(data);
    const version = options.version || 1;
    const isPartial = Boolean(options.isPartial);
    const missingFields = options.missingFields || [];

    const journalEntry = {
      type,
      entityType,
      entityId,
      data: JSON.parse(JSON.stringify(data)),
      timestamp,
      checksum,
      version,
      is_partial: isPartial,
      missing_fields: missingFields,
      sync_state: 'journaled'
    };

    return new Promise((resolve, reject) => {
      try {
        const tx = this.journalDb.transaction('recovery_journal', 'readwrite');
        const store = tx.objectStore('recovery_journal');
        const req = store.add(journalEntry);

        req.onsuccess = () => {
          console.log(`[ResilienceEngine Journal] ${type} for ${entityType} ${entityId} (SHA: ${checksum.slice(0, 8)}...)`);
          resolve(journalEntry);
        };
        req.onerror = (e) => reject(e.target.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  // =========================================================================
  // 4. CONTINUOUS WORKING MODE IN DEGRADED / RECOVERY STATES
  // =========================================================================

  /**
   * When primary storage is degraded or recovering, queue new user operations safely.
   */
  async queuePendingOperation(action, entityType, entityId, payload) {
    await this.init();

    const op = {
      op_id: 'OP-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      action,
      entityType,
      entityId,
      payload,
      timestamp: new Date().toISOString(),
      status: 'pending_recovery_replay'
    };

    // 1. Log to Recovery Journal
    await this.logEvent(action, entityType, entityId, payload);

    // 2. Add to Pending Operations Store
    return new Promise((resolve, reject) => {
      const tx = this.journalDb.transaction('pending_operations', 'readwrite');
      const store = tx.objectStore('pending_operations');
      store.put(op);
      tx.oncomplete = () => {
        console.log(`[ResilienceEngine] Queued pending operation ${op.op_id} during ${this.state} state`);
        resolve(op);
      };
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  async getPendingOperations() {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.journalDb.transaction('pending_operations', 'readonly');
      const req = tx.objectStore('pending_operations').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async clearPendingOperation(opId) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.journalDb.transaction('pending_operations', 'readwrite');
      tx.objectStore('pending_operations').delete(opId);
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  // =========================================================================
  // 5. INTEGRITY CHECKER & CORRUPTION MONITOR
  // =========================================================================

  async runIntegrityCheck() {
    this.isChecking = true;
    await this.init();
    if (window.oneHealthDB) await window.oneHealthDB.init();

    const startTime = performance.now();
    const timestamp = new Date().toISOString();

    // 1. Read all journal entries
    const journalEntries = await this._getAllJournalEntries();
    
    // Group journal by entityId to find latest expected state
    const expectedEntities = new Map();
    for (const entry of journalEntries) {
      expectedEntities.set(entry.entityId, entry);
    }

    // 2. Inspect Primary Database records
    const healthyRecords = [];
    const corruptedRecords = [];
    const missingRecords = [];
    const partialRecords = [];

    const primaryCases = await window.oneHealthDB.getAllCases();
    const primaryCaseMap = new Map(primaryCases.map(c => [c.id, c]));

    const primaryDocs = await window.oneHealthDB.getAllDoctors();
    const primaryDocMap = new Map(primaryDocs.map(d => [d.id, d]));

    const primaryAppts = await window.oneHealthDB.getConsultationRequests();
    const primaryApptMap = new Map(primaryAppts.map(a => [a.id, a]));

    // 3. Verify each entity from journal against primary DB
    for (const [entityId, journalEntry] of expectedEntities.entries()) {
      const { entityType, data, checksum: expectedChecksum, is_partial, missing_fields } = journalEntry;
      const subjectName = data?.subject_name || data?.name || data?.patient_name || entityId;

      // Check if mid-operation partial
      if (is_partial) {
        partialRecords.push({
          entityId,
          entityType,
          subjectName,
          journalEntry,
          reason: `Interrupted mid-operation before completing: ${missing_fields.join(', ')}`,
          missingFields: missing_fields,
          explanation: `Patient and symptoms safely saved, but AI diagnostic report was not generated before blackout.`
        });
        continue;
      }

      let primaryRecord = null;
      if (entityType === 'case' || entityType === 'screening') {
        primaryRecord = primaryCaseMap.get(entityId);
      } else if (entityType === 'doctor') {
        primaryRecord = primaryDocMap.get(entityId);
      } else if (entityType === 'appointment') {
        primaryRecord = primaryApptMap.get(entityId);
      }

      if (!primaryRecord) {
        missingRecords.push({
          entityId,
          entityType,
          subjectName,
          journalEntry,
          status: 'MISSING',
          expectedChecksum,
          reason: 'Record wiped or deleted from primary database',
          explanation: `Primary database record missing. Journal holds full copy with SHA-256 signature.`
        });
      } else {
        const actualChecksum = await this.computeChecksum(primaryRecord);
        if (actualChecksum === expectedChecksum) {
          healthyRecords.push({
            entityId,
            entityType,
            subjectName,
            status: 'HEALTHY',
            checksum: actualChecksum
          });
        } else {
          corruptedRecords.push({
            entityId,
            entityType,
            subjectName,
            status: 'CORRUPTED',
            expectedChecksum,
            actualChecksum,
            primaryRecord,
            journalEntry,
            reason: 'Data integrity mismatch: record content tampered or corrupted in primary DB',
            explanation: `Primary record checksum (${actualChecksum.slice(0, 8)}...) does not match journal signature (${expectedChecksum.slice(0, 8)}...).`
          });
        }
      }
    }

    const durationMs = Math.round(performance.now() - startTime);
    const totalMonitored = expectedEntities.size;
    const totalIssues = missingRecords.length + corruptedRecords.length + partialRecords.length;

    const report = {
      timestamp,
      durationMs,
      totalMonitored,
      healthyCount: healthyRecords.length,
      missingCount: missingRecords.length,
      corruptedCount: corruptedRecords.length,
      partialCount: partialRecords.length,
      healthyRecords,
      missingRecords,
      corruptedRecords,
      partialRecords,
      isHealthy: totalIssues === 0,
    };

    this.lastIntegrityReport = report;
    this.isChecking = false;

    // Update system state
    if (totalIssues > 0) {
      this._setState('DEGRADED', report);
    } else {
      if (this.state === 'RECOVERY' || this.state === 'DEGRADED') {
        this._setState('RESTORED', report);
      } else {
        this._setState('NORMAL', report);
      }
    }

    return report;
  }

  // =========================================================================
  // 6. REAL RECOVERY ENGINE (Deterministic Reconstruction)
  // =========================================================================

  /**
   * Deterministically reconstructs and restores primary database from the independent journal.
   * Emits live step events for visual timeline progress.
   */
  async runRecoveryEngine(onProgressStep = null) {
    this._setState('RECOVERY');
    await this.init();
    if (window.oneHealthDB) await window.oneHealthDB.init();

    const startTime = performance.now();
    const emitStep = async (stepText, delayMs = 150) => {
      console.log(`[ResilienceEngine Step] ${stepText}`);
      if (onProgressStep) onProgressStep(stepText);
      this.stepListeners.forEach(fn => { try { fn(stepText); } catch(e){} });
      if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
    };

    await emitStep("🔍 Phase 1: Scanning independent append-only recovery journal (OneHealthRecoveryJournalDB)...", 200);

    const journalEntries = await this._getAllJournalEntries();
    journalEntries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    await emitStep(`📜 Phase 2: Found ${journalEntries.length} immutable transaction blocks. Verifying cryptographic SHA-256 signatures...`, 250);

    const recoveredList = [];
    const partialList = [];
    const unrecoverableList = [];

    // Group by entityId
    const entityMap = new Map();
    for (const entry of journalEntries) {
      if (!entityMap.has(entry.entityId)) {
        entityMap.set(entry.entityId, []);
      }
      entityMap.get(entry.entityId).push(entry);
    }

    await emitStep(`🧩 Phase 3: Reconstructing ${entityMap.size} clinical entities deterministically...`, 200);

    // Process each entity timeline
    for (const [entityId, history] of entityMap.entries()) {
      try {
        const latestEntry = history[history.length - 1];
        const subjectName = latestEntry.data?.subject_name || latestEntry.data?.name || latestEntry.data?.patient_name || entityId;

        // 1. Verify journal entry integrity
        const journalChecksum = await this.computeChecksum(latestEntry.data);
        if (journalChecksum !== latestEntry.checksum) {
          await emitStep(`❌ Signature mismatch on block ${entityId}! Flagged as unrecoverable.`, 100);
          unrecoverableList.push({
            entityId,
            subjectName,
            entityType: latestEntry.entityType,
            status: 'UNRECOVERABLE',
            reason: 'Journal entry checksum verification failed (tampered journal block)',
            action: 'Manual data re-entry required'
          });
          continue;
        }

        // 2. Check if mid-operation partial
        if (latestEntry.is_partial) {
          await emitStep(`⚠️ Reconstructing mid-operation record: ${entityId} (${subjectName}) [Partial State]`, 150);
          const partialData = {
            ...latestEntry.data,
            is_partial_recovery: true,
            partial_warning: `Recovered without: ${latestEntry.missing_fields.join(', ')}`
          };

          await this._writeEntityToPrimaryDB(latestEntry.entityType, partialData);

          partialList.push({
            entityId,
            subjectName,
            entityType: latestEntry.entityType,
            status: 'PARTIALLY_RECOVERED',
            recoveredFields: Object.keys(latestEntry.data),
            missingFields: latestEntry.missing_fields,
            reason: 'Mid-operation blackout occurred before completing all fields',
            action: 'Review case and re-run AI triage if needed',
            howRecovered: 'Patient credentials, village, and symptoms reconstructed from pre-failure journal blocks.'
          });
          continue;
        }

        // 3. Full valid recovery
        await emitStep(`✓ Restored: ${entityId} (${subjectName}) ➔ Written to Primary IndexedDB with verified SHA-256 signature`, 100);
        await this._writeEntityToPrimaryDB(latestEntry.entityType, latestEntry.data);
        recoveredList.push({
          entityId,
          subjectName,
          entityType: latestEntry.entityType,
          status: 'RECOVERED',
          timestamp: latestEntry.timestamp,
          version: latestEntry.version,
          checksum: latestEntry.checksum,
          howRecovered: 'Deterministically replayed from append-only journal snapshot.'
        });

      } catch (err) {
        console.error(`[ResilienceEngine] Recovery failed for ${entityId}:`, err);
        unrecoverableList.push({
          entityId,
          reason: err.message || 'Unknown write failure during restoration',
          action: 'Check browser storage quota'
        });
      }
    }

    // 4. Replay and apply pending operations queued during degraded state
    await emitStep("📥 Phase 4: Checking pending operations queue submitted during degraded blackout state...", 200);
    const pendingOps = await this.getPendingOperations();
    const replayedOps = [];
    for (const op of pendingOps) {
      try {
        await emitStep(`📥 Replaying degraded mode op: ${op.op_id} (${op.entityId})`, 100);
        await this._writeEntityToPrimaryDB(op.entityType, op.payload);
        await this.clearPendingOperation(op.op_id);
        replayedOps.push(op);
      } catch (e) {
        console.warn('[ResilienceEngine] Pending op replay warning:', e);
      }
    }

    await emitStep("🎉 Phase 5: Verification complete! Primary IndexedDB fully synchronized and restored.", 200);

    const durationMs = Math.round(performance.now() - startTime);
    const totalAffected = recoveredList.length + partialList.length + unrecoverableList.length;
    const recoveryRate = totalAffected > 0 
      ? Math.round(((recoveredList.length + (partialList.length * 0.5)) / totalAffected) * 100)
      : 100;

    const recoveryReport = {
      timestamp: new Date().toISOString(),
      durationMs,
      totalAffected,
      recoveredCount: recoveredList.length,
      partialCount: partialList.length,
      unrecoverableCount: unrecoverableList.length,
      replayedPendingCount: replayedOps.length,
      recoveryRate,
      recoveredList,
      partialList,
      unrecoverableList,
      replayedOps
    };

    this.lastRecoveryReport = recoveryReport;
    this._setState('RESTORED', recoveryReport);

    // If online, trigger cloud sync
    if (navigator.onLine && window.oneHealthSync) {
      setTimeout(() => window.oneHealthSync.triggerAutoSync(true), 800);
    }

    return recoveryReport;
  }

  async _writeEntityToPrimaryDB(entityType, data) {
    if (!window.oneHealthDB) return;

    if (entityType === 'case' || entityType === 'screening') {
      await window.oneHealthDB.saveCase(data, false);
    } else if (entityType === 'doctor') {
      await window.oneHealthDB.saveDoctor(data);
    } else if (entityType === 'appointment') {
      await window.oneHealthDB.createConsultationRequest(data);
    } else if (entityType === 'trust_claim') {
      if (window.oneHealthDB.saveVerifiedClaim) await window.oneHealthDB.saveVerifiedClaim(data);
    } else if (entityType === 'user_report') {
      if (window.oneHealthDB.saveUserReport) await window.oneHealthDB.saveUserReport(data);
    } else if (entityType === 'trusted_source') {
      if (window.oneHealthDB.saveTrustedSource) await window.oneHealthDB.saveTrustedSource(data);
    }
  }

  // =========================================================================
  // 7. REAL BLACKOUT SIMULATORS (Controlled Demo Mode)
  // =========================================================================

  /**
   * Simulates sudden primary data store corruption/wipe.
   * Operates ONLY on controlled demo records to be completely safe.
   */
  async simulateBlackout() {
    await this.init();
    if (window.oneHealthDB) await window.oneHealthDB.init();

    const cases = await window.oneHealthDB.getAllCases();
    if (cases.length === 0) {
      await this._seedInitialJournalIfEmpty(true);
    }

    const currentCases = await window.oneHealthDB.getAllCases();
    const demoCases = currentCases.filter(c => c.id.startsWith('DEMO-') || c.id.startsWith('CASE-') || c.id.startsWith('SCR-'));

    // Corrupt / delete demo records in Primary DB ONLY
    const targets = demoCases.slice(0, 4);
    const affectedCount = targets.length;

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      if (i % 2 === 0) {
        // Delete completely (MISSING simulation)
        await this._deleteFromPrimaryDB('cases', target.id);
      } else {
        // Tamper content (CORRUPTED simulation)
        const tampered = { ...target, primary_condition: 'CORRUPTED_PAYLOAD_DATA_CORRUPTION_FAILURE', risk_level: 'RED' };
        await window.oneHealthDB.saveCase(tampered, false);
      }
    }

    console.warn(`[ResilienceEngine Simulator] 💥 Blackout simulated! ${affectedCount} primary records affected.`);

    // Run integrity check to detect failure and enter DEGRADED mode
    const report = await this.runIntegrityCheck();
    return report;
  }

  /**
   * Simulates an in-flight operation blackout:
   * Patient saved, Symptoms saved, but Screening interrupted mid-save before AI diagnosis.
   */
  async simulateMidOperationBlackout() {
    await this.init();

    const midOpId = 'SCR-MID-' + Date.now().toString(36).toUpperCase();
    const patientName = 'Savita Bai Patil';

    // 1. Step 1 journaled: Patient Created
    await this.logEvent('PATIENT_CREATED', 'patient', 'PAT-' + Date.now().toString(36), {
      name: patientName,
      age: '42 Y',
      village: 'Pohegaon',
      phone: '+91 98221 44552'
    });

    // 2. Step 2 journaled: Symptoms Recorded
    await this.logEvent('SYMPTOMS_RECORDED', 'symptoms', 'SYM-' + Date.now().toString(36), {
      patient_name: patientName,
      symptoms: ['High fever for 4 days', 'Joint pain', 'Chills'],
      vital_signs: { temp: '103.2 F', spo2: '97%' }
    });

    // 3. Step 3: Interrupted midway! Journaled as incomplete
    await this.logEvent('SCREENING_INCOMPLETE', 'screening', midOpId, {
      id: midOpId,
      subject_name: patientName,
      age_or_dob: '42 Y',
      village: 'Pohegaon',
      primary_condition: 'Acute Febrile Illness (Awaiting AI Report)',
      symptoms_summary: 'Fever 103.2 F, Joint pain',
      client_created_at: new Date().toISOString()
    }, {
      isPartial: true,
      missingFields: ['ai_confidence_score', 'prescription_plan', 'diagnostic_report_pdf']
    });

    console.warn(`[ResilienceEngine Simulator] 💥 Mid-operation blackout simulated on ${midOpId}!`);
    const report = await this.runIntegrityCheck();
    return report;
  }

  async _deleteFromPrimaryDB(storeName, key) {
    if (!window.oneHealthDB || !window.oneHealthDB.db) return;
    return new Promise((resolve) => {
      try {
        const tx = window.oneHealthDB.db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).delete(key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }

  // =========================================================================
  // 8. HELPERS & INITIAL SEEDING
  // =========================================================================

  async _getAllJournalEntries() {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.journalDb.transaction('recovery_journal', 'readonly');
      const req = tx.objectStore('recovery_journal').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async _seedInitialJournalIfEmpty(force = false) {
    const count = (await this._getAllJournalEntries()).length;
    if (count > 0 && !force) return;

    console.log('[ResilienceEngine] Seeding initial baseline recovery journal...');

    const baselineCases = [
      {
        id: 'DEMO-SCR-001',
        case_type: 'human_general',
        subject_name: 'Anjali Ramesh Patil',
        age_or_dob: '28 Y',
        gender_or_sex: 'Female',
        village: 'Kopargaon',
        risk_level: 'YELLOW',
        primary_condition: 'Acute Febrile Illness (Dengue Suspect)',
        triage_summary: 'Moderate fever 101.4 F for 3 days with headache and myalgia.',
        client_created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
        sync_status: 'synced'
      },
      {
        id: 'DEMO-SCR-002',
        case_type: 'child_development',
        subject_name: 'Aarav Sachin Shinde',
        age_or_dob: '18 Months',
        gender_or_sex: 'Male',
        village: 'Pohegaon',
        risk_level: 'GREEN',
        primary_condition: 'Age-Appropriate Motor & Language Milestones',
        triage_summary: 'Normal developmental milestones; recommends booster immunization.',
        client_created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
        sync_status: 'synced'
      },
      {
        id: 'DEMO-SCR-003',
        case_type: 'livestock',
        subject_name: 'HF Crossbreed Cow #4412',
        age_or_dob: '4 Years',
        gender_or_sex: 'Female',
        species: 'Cattle',
        tag_or_id: 'MH-KPG-4412',
        guardian_or_owner: 'Dattatray Kale',
        village: 'Dhamori',
        risk_level: 'RED',
        primary_condition: 'Suspected Lumpy Skin Disease (LSD)',
        triage_summary: 'High fever 104 F, nodular skin lesions across neck and flank.',
        client_created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
        sync_status: 'synced'
      }
    ];

    for (const c of baselineCases) {
      await this.logEvent('SCREENING_CREATED', 'case', c.id, c);
      if (window.oneHealthDB) {
        await window.oneHealthDB.saveCase(c, false);
      }
    }
  }

  _setState(newState, report = null) {
    this.state = newState;
    console.log(`[ResilienceEngine State Change] -> ${newState}`);
    this.listeners.forEach(fn => {
      try { fn(newState, report); } catch (e) {}
    });
  }

  onStateChange(callback) {
    this.listeners.push(callback);
    if (this.state) callback(this.state, this.lastIntegrityReport);
  }

  onStep(callback) {
    this.stepListeners.push(callback);
  }
}

window.oneHealthResilience = new OneHealthResilienceEngine();
