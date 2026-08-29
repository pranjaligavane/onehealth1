/**
 * ONEHEALTH AI - Offline IndexedDB Database Layer & Self-Contained Seeder
 * Operates 100% client-side with comprehensive doctor profiles (Education, Fee, Area, Reg #, Timings).
 */

class OneHealthDB {
  constructor() {
    this.dbName = 'OneHealthOfflineDB';
    this.version = 4;
    this.db = null;
  }

  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 1. Cases Store
        if (!db.objectStoreNames.contains('cases')) {
          const caseStore = db.createObjectStore('cases', { keyPath: 'id' });
          caseStore.createIndex('case_type', 'case_type', { unique: false });
          caseStore.createIndex('risk_level', 'risk_level', { unique: false });
          caseStore.createIndex('village', 'village', { unique: false });
          caseStore.createIndex('is_synced', 'is_synced', { unique: false });
          caseStore.createIndex('client_created_at', 'client_created_at', { unique: false });
        }

        // 2. Sync Queue Store
        if (!db.objectStoreNames.contains('sync_queue')) {
          const queueStore = db.createObjectStore('sync_queue', { keyPath: 'queue_id', autoIncrement: true });
          queueStore.createIndex('status', 'status', { unique: false });
          queueStore.createIndex('entity_id', 'entity_id', { unique: false });
        }

        // 3. Media / Images Store
        if (!db.objectStoreNames.contains('media_blobs')) {
          db.createObjectStore('media_blobs', { keyPath: 'id' });
        }

        // 4. Outbreak Alerts Store
        if (!db.objectStoreNames.contains('alerts')) {
          db.createObjectStore('alerts', { keyPath: 'id' });
        }

        // 5. Settings Store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        // 6. Doctors & Vets Directory Store
        if (!db.objectStoreNames.contains('doctors_directory')) {
          const docStore = db.createObjectStore('doctors_directory', { keyPath: 'id' });
          docStore.createIndex('role', 'role', { unique: false });
          docStore.createIndex('village', 'village', { unique: false });
          docStore.createIndex('specialization', 'specialization', { unique: false });
        }
      };

      request.onsuccess = async (event) => {
        this.db = event.target.result;
        console.log('[IndexedDB] Initialized successfully:', this.dbName);
        await this.checkAndSeedInitialData();
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('[IndexedDB] Open error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  // --- AUTOMATIC CLIENT-SIDE SEEDING ---
  async checkAndSeedInitialData() {
    const docs = await this.getAllDoctors();
    if (docs.length === 0) {
      console.log('[IndexedDB] Seeding Doctors & Vets Directory with full Education, Fee & Location info...');
      const initialDoctors = [
        {
          id: "DOC-001",
          role: "doctor",
          name: "Dr. Anand Kulkarni",
          title: "Senior Medical Officer & Physician",
          medical_reg_no: "MMC-2011/05/1842",
          education: "MBBS (BJ Medical College Pune), MD (General Medicine)",
          experience_years: 14,
          specialization: "General Medicine & Acute Fevers",
          consultation_fee: "Free (Govt PHC) / ₹50 OPD",
          clinic_name: "Kopargaon Sub-District Hospital & Tele-Care OPD",
          village: "Kopargaon",
          address: "Station Road, Near Tehsil Office & Bus Stand, Kopargaon - 423601",
          pincode: "423601",
          phone: "+91 98230 55441",
          whatsapp: "+91 98230 55441",
          opd_timings: "Mon-Sat: 9:00 AM - 1:30 PM, 5:00 PM - 8:30 PM (Emergency 24/7)",
          languages: "Marathi (मराठी), Hindi, English",
          facilities: "In-patient Beds, Emergency Oxygen, ECG, Random Blood Sugar, Fever Ward, Dressing",
          coordinates: { lat: 19.8824, lng: 74.4789 },
          available: true
        },
        {
          id: "DOC-002",
          role: "doctor",
          name: "Dr. Suniti Deshmukh",
          title: "Pediatrician & Child Health Specialist",
          medical_reg_no: "MMC-2015/08/3920",
          education: "MBBS (GMC Aurangabad), DCH (Diploma in Child Health)",
          experience_years: 9,
          specialization: "Child Growth, Malnutrition (SAM/MAM) & Immunization",
          consultation_fee: "₹100 (Subsidized for Rural Families)",
          clinic_name: "Matoshree Children Clinic & NRC Care",
          village: "Pohegaon",
          address: "Main Market Square, Pohegaon Road, Kopargaon Taluka",
          pincode: "423605",
          phone: "+91 98221 44332",
          whatsapp: "+91 98221 44332",
          opd_timings: "Mon-Sat: 10:00 AM - 2:00 PM, 6:00 PM - 9:00 PM",
          languages: "Marathi (मराठी), Hindi, English",
          facilities: "Baby Warmer, Phototherapy, Growth Monitoring, Nebulization, RUTF Nutrition Counseling",
          coordinates: { lat: 19.8912, lng: 74.4623 },
          available: true
        },
        {
          id: "DOC-003",
          role: "doctor",
          name: "Dr. Vikram Jadhav",
          title: "Rural Medical Officer & Emergency Physician",
          medical_reg_no: "MMC-2018/11/5120",
          education: "MBBS (MUHS Nashik), Fellowship in Emergency Medicine (FEM)",
          experience_years: 6,
          specialization: "Primary Emergency Care, Diabetes & Hypertension",
          consultation_fee: "Free (National Health Mission / PHC)",
          clinic_name: "Primary Health Centre (PHC) Dhamori",
          village: "Dhamori",
          address: "Near Gram Panchayat Bhavan, PO Dhamori, Taluka Kopargaon",
          pincode: "423604",
          phone: "+91 98235 66778",
          whatsapp: "+91 98235 66778",
          opd_timings: "9:00 AM - 4:00 PM (Emergency 24x7)",
          languages: "Marathi (मराठी), Hindi",
          facilities: "Labor Room, Free Generic Pharmacy, Rapid Dengue/Malaria Tests, IV Infusion",
          coordinates: { lat: 19.8654, lng: 74.4921 },
          available: true
        },
        {
          id: "VET-001",
          role: "vet",
          name: "Dr. Ramesh Patil",
          title: "Taluka Livestock Development Officer & Surgeon",
          medical_reg_no: "MSVC-2009/4412",
          education: "BVSc & AH (Bombay Veterinary College), MVSc (Surgery)",
          experience_years: 15,
          specialization: "Bovine Diseases, Lumpy Skin, Mastitis & Livestock Surgery",
          consultation_fee: "Free Govt Service / ₹20-40 Medicine Subsidized",
          clinic_name: "Taluka Veterinary Dispensary (पशुवैद्यकीय दवाखाना)",
          village: "Kopargaon",
          address: "Opposite APMC Krishi Utpanna Bajar Samiti, Kopargaon - 423601",
          pincode: "423601",
          phone: "+91 98230 77889",
          whatsapp: "+91 98230 77889",
          opd_timings: "8:00 AM - 1:00 PM, 4:00 PM - 7:00 PM (Emergency on-call)",
          languages: "Marathi (मराठी), Hindi, English",
          facilities: "Cattle Crush, Artificial Insemination, CMT Mastitis Rapid Test, Wound Debridement, Vaccine Bank",
          coordinates: { lat: 19.8790, lng: 74.4720 },
          available: true
        },
        {
          id: "VET-002",
          role: "vet",
          name: "Dr. Nitin Shinde",
          title: "Veterinary Officer (Rural Mobile Clinic)",
          medical_reg_no: "MSVC-2016/7821",
          education: "BVSc & AH (MAFSU Nagpur)",
          experience_years: 8,
          specialization: "Dairy Cattle Health, Goat/Sheep Diseases (PPR), Vaccination",
          consultation_fee: "Free (Govt Dairy Scheme) / ₹50 Field Visit",
          clinic_name: "Rural Veterinary First-Aid Centre Pohegaon",
          village: "Pohegaon",
          address: "Dairy Cooperative Society Compound, Pohegaon Phata",
          pincode: "423605",
          phone: "+91 98229 88334",
          whatsapp: "+91 98229 88334",
          opd_timings: "8:30 AM - 12:30 PM (Doorstep Farm Visits 2:00 PM - 6:30 PM)",
          languages: "Marathi (मराठी), Hindi",
          facilities: "Deworming, FMD/LSD Vaccination, Tick Repellent Spray, Udder Infusion, Post-mortem Triage",
          coordinates: { lat: 19.8945, lng: 74.4680 },
          available: true
        }
      ];
      for (const d of initialDoctors) {
        await this.saveDoctor(d);
      }
    }

    const cases = await this.getAllCases();
    if (cases.length === 0) {
      console.log('[IndexedDB] Seeding initial case records...');
      const initialAlerts = [
        {
          id: 1,
          title: "Lumpy Skin Disease (LSD) Alert in Dairy Cattle",
          disease: "Lumpy Skin Disease",
          target_group: "Cattle / Buffalo",
          village: "Kopargaon & Rahata Belt",
          severity: "CRITICAL",
          description: "Clustered reports of cutaneous nodules, high fever, and severe milk yield drop in crossbred cattle.",
          precautions: "Isolate infected animals immediately, spray neem/anti-tick repellents, restrict cattle movement.",
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          title: "Seasonal Dengue & Viral Pyrexia Surge",
          disease: "Dengue / Vector-borne Fever",
          target_group: "Human (All Ages)",
          village: "Kopargaon Town & Wards 4-7",
          severity: "WARNING",
          description: "Rising cases of sudden high grade fever with retro-orbital pain and severe bodyache.",
          precautions: "Eliminate standing water in containers, use mosquito nets, monitor hydration with ORS.",
          created_at: new Date().toISOString()
        },
        {
          id: 3,
          title: "Childhood Acute Waterborne Gastroenteritis",
          disease: "Acute Watery Diarrhoea",
          target_group: "Children (0-5 Years)",
          village: "Dhamori & Pohegaon",
          severity: "WARNING",
          description: "Spike in dehydration cases among under-5 children following water contamination.",
          precautions: "Boil drinking water, administer Zinc syrup (20mg daily) and WHO-ORS at onset of loose stools.",
          created_at: new Date().toISOString()
        }
      ];
      await this.saveAlerts(initialAlerts);

      const initialCases = [
        {
          id: "CASE-HUM-001",
          case_type: "human_general",
          subject_name: "Rameshwar Thorat",
          age_or_dob: "42 years",
          gender_or_sex: "Male",
          species: "Human",
          tag_or_id: "Aadhaar-8821",
          guardian_or_owner: "Self",
          contact_phone: "9822114455",
          village: "Pohegaon",
          risk_level: "ORANGE",
          triage_summary: "High fever (103.2°F) for 5 days with chills, severe retro-orbital headache, petechial rash on forearms. Suspected Dengue / Arboviral Fever.",
          primary_condition: "Suspected Dengue / Arboviral Fever",
          confidence_score: 0.91,
          data_payload: {
            vitals: { temp_f: 103.2, bp_systolic: 100, bp_diastolic: 68, pulse: 104, spo2: 96, blood_sugar_mgdl: 110 },
            symptoms: ["fever_chills", "eye_pain_retroorbital", "skin_rash_petechiae", "severe_bodyache"]
          },
          status: "escalated",
          assigned_role: "doctor",
          client_created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
          is_synced: true,
          reviews: []
        },
        {
          id: "CASE-CHD-001",
          case_type: "child_development",
          subject_name: "Aarav Ganesh Shelke",
          age_or_dob: "14 months",
          gender_or_sex: "Male",
          species: "Human",
          tag_or_id: "MCTS-90214",
          guardian_or_owner: "Mother: Meena Shelke",
          contact_phone: "9823556677",
          village: "Dhamori",
          risk_level: "RED",
          triage_summary: "Severe Acute Malnutrition (SAM) with Gross Motor Delay. MUAC 11.2 cm (< 11.5 cm = SAM). WAZ: -3.4 SD.",
          primary_condition: "Severe Acute Malnutrition (SAM)",
          confidence_score: 0.95,
          data_payload: {
            age_months: 14, weight_kg: 6.1, height_cm: 71, muac_cm: 11.2, edema: "no",
            who_scores: { waz: -3.4, haz: -2.6, whz: -3.2, muac_cm: 11.2 }
          },
          status: "escalated",
          assigned_role: "doctor",
          client_created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
          is_synced: true,
          reviews: []
        },
        {
          id: "CASE-VET-001",
          case_type: "livestock",
          subject_name: "Crossbred HF Cow #402",
          age_or_dob: "4 years",
          gender_or_sex: "Female",
          species: "Cattle (Crossbred HF/Jersey)",
          tag_or_id: "INAPH-9021841",
          guardian_or_owner: "Farmer: Bhausaheb Vikhe",
          contact_phone: "9823334411",
          village: "Pohegaon",
          risk_level: "RED",
          triage_summary: "Circumscribed cutaneous nodules with fever (105.4°F) and milk yield crash characteristic of Lumpy Skin Disease (LSD).",
          primary_condition: "Lumpy Skin Disease (LSD) - Capripoxvirus",
          confidence_score: 0.94,
          data_payload: {
            species: "Cattle", rectal_temp_f: 105.4, herd_size: 12,
            symptoms: ["skin_nodules_lumps", "milk_drop_severe", "swollen_lymph_nodes"]
          },
          status: "escalated",
          assigned_role: "vet",
          client_created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
          is_synced: true,
          reviews: []
        }
      ];

      for (const c of initialCases) {
        await this.saveCase(c, false);
      }
    }
  }

  // --- DOCTORS & VETS DIRECTORY OPERATIONS ---

  async saveDoctor(docData) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('doctors_directory', 'readwrite');
      tx.objectStore('doctors_directory').put(docData);
      tx.oncomplete = () => resolve(docData);
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  async getAllDoctors(roleFilter = null) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('doctors_directory', 'readonly');
      const req = tx.objectStore('doctors_directory').getAll();
      req.onsuccess = () => {
        let list = req.result || [];
        if (roleFilter) {
          list = list.filter(d => d.role === roleFilter);
        }
        resolve(list);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async getNearbyDoctors(userVillage, roleFilter = null) {
    const all = await this.getAllDoctors(roleFilter);
    if (!userVillage) return all;

    const target = userVillage.toLowerCase().trim();
    return all.sort((a, b) => {
      const aMatch = a.village && a.village.toLowerCase().includes(target) ? 1 : 0;
      const bMatch = b.village && b.village.toLowerCase().includes(target) ? 1 : 0;
      return bMatch - aMatch;
    });
  }

  // --- CASE OPERATIONS ---

  async saveCase(caseData, enqueueForSync = true) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['cases', 'sync_queue'], 'readwrite');
      const caseStore = tx.objectStore('cases');
      const queueStore = tx.objectStore('sync_queue');

      if (!caseData.client_created_at) {
        caseData.client_created_at = new Date().toISOString();
      }
      if (caseData.is_synced === undefined) {
        caseData.is_synced = true;
      }
      if (!caseData.reviews) {
        caseData.reviews = [];
      }

      caseStore.put(caseData);

      if (enqueueForSync) {
        queueStore.add({
          action: 'SAVE_CASE',
          entity_id: caseData.id,
          payload: caseData,
          status: 'pending',
          created_at: new Date().toISOString()
        });
      }

      tx.oncomplete = () => resolve(caseData);
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  async getCase(id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('cases', 'readonly');
      const store = tx.objectStore('cases');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async getAllCases() {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('cases', 'readonly');
      const store = tx.objectStore('cases');
      const req = store.getAll();
      req.onsuccess = () => {
        const list = req.result || [];
        list.sort((a, b) => new Date(b.client_created_at) - new Date(a.client_created_at));
        resolve(list);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async addReviewToCase(caseId, reviewData, enqueueForSync = true) {
    await this.init();
    const caseItem = await this.getCase(caseId);
    if (!caseItem) throw new Error('Case not found in IndexedDB');

    if (!caseItem.reviews) caseItem.reviews = [];
    reviewData.created_at = reviewData.created_at || new Date().toISOString();
    caseItem.reviews.push(reviewData);

    caseItem.status = reviewData.is_urgent_referral ? 'escalated' : 'reviewed';
    if (reviewData.verified_risk_level) {
      caseItem.risk_level = reviewData.verified_risk_level;
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['cases', 'sync_queue'], 'readwrite');
      tx.objectStore('cases').put(caseItem);

      if (enqueueForSync) {
        tx.objectStore('sync_queue').add({
          action: 'SAVE_REVIEW',
          entity_id: caseId,
          payload: reviewData,
          status: 'pending',
          created_at: new Date().toISOString()
        });
      }

      tx.oncomplete = () => resolve(caseItem);
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  // --- EXPORT & IMPORT ---

  async exportAllDataAsJSON() {
    const cases = await this.getAllCases();
    const alerts = await this.getAlerts();
    const docs = await this.getAllDoctors();
    return {
      exported_at: new Date().toISOString(),
      app: "ONEHEALTH_AI_STANDALONE",
      total_cases: cases.length,
      cases: cases,
      alerts: alerts,
      doctors: docs
    };
  }

  async importDataFromJSON(jsonData) {
    if (!jsonData || !jsonData.cases || !Array.isArray(jsonData.cases)) {
      throw new Error("Invalid ONEHEALTH backup file format.");
    }
    let imported = 0;
    for (const c of jsonData.cases) {
      await this.saveCase(c, false);
      imported++;
    }
    if (jsonData.alerts && Array.isArray(jsonData.alerts)) {
      await this.saveAlerts(jsonData.alerts);
    }
    if (jsonData.doctors && Array.isArray(jsonData.doctors)) {
      for (const d of jsonData.doctors) {
        await this.saveDoctor(d);
      }
    }
    return imported;
  }

  // --- SYNC QUEUE OPERATIONS ---

  async getPendingSyncItems() {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('sync_queue', 'readonly');
      const store = tx.objectStore('sync_queue');
      const req = store.getAll();
      req.onsuccess = () => {
        const items = (req.result || []).filter(item => item.status === 'pending');
        resolve(items);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async markSyncItemsCompleted(queueIds, serverCaseUpdates = []) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['cases', 'sync_queue'], 'readwrite');
      const queueStore = tx.objectStore('sync_queue');
      const caseStore = tx.objectStore('cases');

      for (const qId of queueIds) {
        queueStore.delete(qId);
      }

      for (const sCase of serverCaseUpdates) {
        sCase.is_synced = true;
        caseStore.put(sCase);
      }

      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  async countPendingSync() {
    const items = await this.getPendingSyncItems();
    return items.length;
  }

  // --- MEDIA BLOB STORAGE ---

  async saveMedia(id, base64OrBlob) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('media_blobs', 'readwrite');
      tx.objectStore('media_blobs').put({ id, data: base64OrBlob, saved_at: new Date().toISOString() });
      tx.oncomplete = () => resolve(id);
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  async getMedia(id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('media_blobs', 'readonly');
      const req = tx.objectStore('media_blobs').get(id);
      req.onsuccess = () => resolve(req.result ? req.result.data : null);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  // --- SETTINGS & ALERTS ---

  async saveSetting(key, value) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('settings', 'readwrite');
      tx.objectStore('settings').put({ key, value });
      tx.oncomplete = () => resolve(value);
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  async getSetting(key, defaultValue = null) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('settings', 'readonly');
      const req = tx.objectStore('settings').get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : defaultValue);
      req.onerror = () => resolve(defaultValue);
    });
  }

  async saveAlerts(alertsList) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('alerts', 'readwrite');
      const store = tx.objectStore('alerts');
      store.clear();
      for (const a of alertsList) {
        store.put(a);
      }
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  async getAlerts() {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('alerts', 'readonly');
      const req = tx.objectStore('alerts').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }
}

// Export singleton
window.oneHealthDB = new OneHealthDB();
