/**
 * ONEHEALTH AI - Comprehensive Multilingual Translation Engine (EN, MR, HI)
 * Complete coverage across all views, dynamic templates, forms, hero, directory, and modals.
 */

const I18N_DICTIONARY = {
  en: {
    app_title: "ONEHEALTH AI",
    app_subtitle: "Offline-First Rural Healthcare & Veterinary Screening",
    nav_home: "Home",
    nav_cases: "My Records",
    nav_screen: "Screening",
    nav_doctors: "Nearby Doctors",
    nav_portal: "Clinical Station",
    nav_analytics: "Surveillance",
    nav_clinic_profile: "My Profile",
    status_online: "ONLINE",
    status_offline: "OFFLINE MODE",
    sync_now: "Sync Records",
    sync_pending: "Pending Sync",
    btn_start_screening: "Start Screening",
    btn_track_growth: "Track Growth",
    btn_screen_herd: "Screen Herd",
    btn_save_case: "Save & Run AI Screening",
    btn_export_pdf: "Print / Export Summary",
    btn_listen: "Listen (Voice)",
    btn_voice_input: "Voice Dictation",
    btn_switch_role: "Switch Role",

    // Hero Section
    hero_badge: "OFFLINE-FIRST TELEMEDICINE & VETERINARY CARE",
    hero_title: "Healthcare that keeps working when the network doesn't.",
    hero_desc: "ONEHEALTH AI lets patients, community health workers, doctors, and veterinarians in low-connectivity rural areas keep screening, consulting, prescribing, and recording care offline — then synchronizes everything the moment a connection returns.",
    btn_get_started_patient: "Get started as a patient",
    btn_im_doctor: "I'm a medical doctor",
    btn_im_vet: "I'm a veterinarian",
    hero_feat_1: "100% Offline AI Triage & Vitals Analysis",
    hero_feat_2: "WHO Growth & Child Malnutrition Tracking",
    hero_feat_3: "Livestock & Herd Epidemic Defense",
    hero_feat_4: "Doctor Directory & Tele-Prescriptions",

    patient_banner_title: "📍 Need a Doctor or Vet in your Area?",
    patient_banner_desc: "View education, consultation fee, OPD timings, and call verified doctors in Kopargaon, Pohegaon, Dhamori, & nearby villages.",
    btn_find_nearby_docs: "Find Nearby Doctors ➔",

    // Roles
    role_patient: "Patient / Citizen",
    role_doctor: "Doctor (MBBS)",
    role_vet: "Vet (BVSc)",
    role_select_title: "Welcome to ONEHEALTH AI",
    role_select_subtitle: "Please select who is using this device to customize your interface:",
    role_patient_title: "Patient / Citizen / Health Worker",
    role_patient_desc: "Screen family or livestock, check symptoms offline, view past medical/animal records, and find doctors near your village.",
    role_doctor_title: "Medical Doctor (MBBS / MD)",
    role_doctor_desc: "Review escalated human & child cases, verify risk, write e-prescriptions, and publish your clinic & fee profile.",
    role_vet_title: "Veterinary Doctor (BVSc / Animal Care)",
    role_vet_desc: "Review livestock disease reports (LSD, FMD, Mastitis), issue quarantine orders, and publish dispensary location.",

    // Categories
    cat_human: "Human Health",
    cat_human_desc: "General acute & chronic screening, vitals analysis, endemic fever triage.",
    cat_child: "Child Development",
    cat_child_desc: "0-5 years WHO growth standards, malnutrition (SAM/MAM), milestone delays.",
    cat_livestock: "Livestock & Vet",
    cat_livestock_desc: "Cattle, Buffalo, Goat, Poultry disease triage (LSD, FMD, Mastitis).",

    // Risk levels
    risk_green: "GREEN - Low Risk / Routine",
    risk_yellow: "YELLOW - Moderate Risk / Clinic OPD",
    risk_orange: "ORANGE - Urgent / Doctor Referral",
    risk_red: "RED - CRITICAL EMERGENCY / Escalation",

    // Forms & Fields
    lbl_subject_name_human: "Patient Full Name *",
    lbl_subject_name_vet: "Animal Tag / ID / Name *",
    lbl_age_human: "Age / Year of Birth *",
    lbl_age_child: "Age in Months *",
    lbl_gender: "Gender *",
    lbl_species: "Species & Breed *",
    lbl_village: "Village / Settlement *",
    lbl_phone: "Contact Phone Number",
    lbl_guardian_human: "Guardian / Relative Name",
    lbl_guardian_vet: "Livestock Owner Name",
    lbl_vitals: "Physical Vitals",
    lbl_symptoms: "Observed Symptoms",
    lbl_red_flags: "Emergency Red Flags",
    lbl_photo_capture: "Clinical Photo / Lesion Upload (Offline Compressed)",
    btn_run_screening: "Run Offline AI Screening & Save",

    // Directory
    dir_title: "Doctors & Vets in Your Area",
    dir_subtitle: "Verified medical doctors and veterinary dispensaries with complete education details, consultation fees, OPD timings, and contact numbers.",
    all_villages: "All Villages (Kopargaon Taluka)",
    all_specialists: "All Specialists",
    human_docs_only: "Human Doctors (MBBS/MD)",
    vets_only: "Veterinary Surgeons (BVSc)",
    btn_call_doc: "Call",
    btn_whatsapp_doc: "WhatsApp",
    btn_consult_doc: "Start Screening & Consult",

    // Records
    records_title: "Case Records",
    search_cases_placeholder: "Search by name, tag ID, village, or condition...",
    all_sectors: "All Sectors (Human & Animal)",
    all_risk_tiers: "All Risk Tiers",
    btn_export: "Export",
    btn_import: "Import",
    btn_new_case: "New",

    // Clinical Portal
    portal_title: "Clinical Station",
    portal_desc: "High-priority tele-triage queue for verified clinical diagnosis, prescription sign-off, and hospital referrals.",
    btn_update_my_profile: "Update My Profile & Location",

    // Profile Form
    prof_form_title: "Doctor / Vet Registration & Location Profile",
    prof_form_desc: "Patients in Kopargaon and surrounding villages will discover your clinic, check consultation fees, education, and timings, and request tele-consultations.",
    lbl_prof_name: "Full Name & Honorific *",
    lbl_prof_title: "Professional Title / Designation *",
    lbl_prof_reg: "Medical / Veterinary Council Reg. No. *",
    lbl_prof_edu: "Education Degrees & College *",
    lbl_prof_exp: "Clinical Experience (Years) *",
    lbl_prof_spec: "Key Specialization / Expertise *",
    lbl_prof_fee: "Consultation Fee & Policy *",
    lbl_prof_clinic: "Hospital / Clinic / Dispensary Name *",
    lbl_prof_area: "Village / Town / Area *",
    lbl_prof_pincode: "Postal PIN Code *",
    lbl_prof_addr: "Full Street Address & Landmark *",
    lbl_prof_phone: "Primary Consultation Phone Number *",
    lbl_prof_whatsapp: "Emergency / WhatsApp Number",
    lbl_prof_timings: "OPD Timings & Days *",
    lbl_prof_languages: "Languages Spoken *",
    lbl_prof_facilities: "Available Facilities & Diagnostic Services",
    btn_save_profile: "Save & Publish Doctor Profile",

    // Messages & Alerts
    msg_saved_offline: "Record saved locally in IndexedDB. Will auto-sync when online.",
    msg_synced_success: "Records synchronized successfully with server.",
    msg_emergency_alert: "CRITICAL RISK DETECTED: Immediate referral required!",
    surveillance_title: "Active Outbreak & Disease Surveillance Alerts"
  },

  mr: {
    app_title: "वनहेल्थ एआय (OneHealth AI)",
    app_subtitle: "ग्रामीण आरोग्य व पशुधन ऑफलाइन तपासणी प्रणाली (कोपरगाव)",
    nav_home: "मुख्य पृष्ठ",
    nav_cases: "माझ्या नोंदी",
    nav_screen: "नवीन तपासणी",
    nav_doctors: "जवळचे डॉक्टर",
    nav_portal: "वैद्यकीय कक्ष",
    nav_analytics: "रोग सर्वेक्षण",
    nav_clinic_profile: "माझे प्रोफाइल",
    status_online: "ऑनलाइन जोडलेले",
    status_offline: "ऑफलाइन मोड (इंटरनेट नाही)",
    sync_now: "डेटा सिंक करा",
    sync_pending: "प्रलंबित सिंक",
    btn_start_screening: "तपासणी सुरू करा",
    btn_track_growth: "वाढ तपासा",
    btn_screen_herd: "जनावरे तपासा",
    btn_save_case: "जतन करा व एआय निदान मिळवा",
    btn_export_pdf: "प्रकरण सारांश प्रिंट करा",
    btn_listen: "माहिती ऐका (आवाज)",
    btn_voice_input: "बोलून नोंदवा (व्हॉइस)",
    btn_switch_role: "भूमिका बदला",

    // Hero Section
    hero_badge: "ऑफलाइन-प्रथम ग्रामीण टेलिमेडिसिन व पशुवैद्यकीय काळजी",
    hero_title: "इंटरनेट नसले तरी अखंड सुरू राहणारी आरोग्य सेवा.",
    hero_desc: "वनहेल्थ एआय ग्रामीण भागातील रुग्ण, आशा सेविका, डॉक्टर आणि पशुवैद्यकांना इंटरनेटशिवाय तपासणी, सल्ला आणि उपचार नोंदवण्यास सक्षम करते - आणि इंटरनेट सुरू होताच सर्व माहिती सिंक करते.",
    btn_get_started_patient: "रुग्ण / नागरिक म्हणून सुरू करा",
    btn_im_doctor: "मी वैद्यकीय डॉक्टर आहे",
    btn_im_vet: "मी पशुवैद्यकीय डॉक्टर आहे",
    hero_feat_1: "१००% ऑफलाइन एआय तपासणी व मोजमापे",
    hero_feat_2: "WHO वाढ तक्ता व बाल कुपोषण तपासणी",
    hero_feat_3: "जनावरांचे आजार व साथीच्या रोगांचे नियंत्रण",
    hero_feat_4: "जवळचे डॉक्टर व डिजिटल औषधोपचार",

    patient_banner_title: "📍 आपल्या परिसरातील डॉक्टर किंवा पशुवैद्यक हवे आहेत का?",
    patient_banner_desc: "कोपरगाव, पोहेगाव, धामोरी व परिसरातील डॉक्टरांचे शिक्षण, फी, वेळ तपासा व थेट संपर्क साधा.",
    btn_find_nearby_docs: "जवळचे डॉक्टर शोधा ➔",

    // Roles
    role_patient: "रुग्ण / नागरिक",
    role_doctor: "डॉक्टर (MBBS)",
    role_vet: "पशुवैद्यक (BVSc)",
    role_select_title: "वनहेल्थ एआय मध्ये आपले स्वागत आहे",
    role_select_subtitle: "आपल्या गरजेनुसार योग्य विभाग पाहण्यासाठी खालीलपैकी एक पर्याय निवडा:",
    role_patient_title: "रुग्ण / नागरिक / आशा सेविका",
    role_patient_desc: "कुटुंबाची किंवा जनावरांची तपासणी करा, लक्षणे तपासा आणि जवळचे डॉक्टर शोधा.",
    role_doctor_title: "वैद्यकीय डॉक्टर (MBBS / MD)",
    role_doctor_desc: "गंभीर रुग्ण तपासा, जोखीम निश्चित करा, ई-प्रिस्क्रिप्शन लिहा आणि दवाखान्याची माहिती अपडेट करा.",
    role_vet_title: "पशुवैद्यकीय डॉक्टर (BVSc / पशुतज्ज्ञ)",
    role_vet_desc: "जनावरांचे आजार (लम्पी, लाळ्या खुरकूत, मस्तान) तपासा, क्वारंटाईन आदेश द्या व सल्ला नोंदवा.",

    // Categories
    cat_human: "मानवी आरोग्य तपासणी",
    cat_human_desc: "ताप, रक्तदाब, मधुमेह, संसर्गजन्य आजार व आणीबाणी तपासणी.",
    cat_child: "बाल विकास व पोषण (०-५ वर्षे)",
    cat_child_desc: "WHO वाढ तक्ता, कुपोषण (सॅम/मॅम) आणि विकासात्मक टप्पे तपासणी.",
    cat_livestock: "पशुधन व जनावरांचे आरोग्य",
    cat_livestock_desc: "गाय, म्हैस, शेळी, कुक्कुटपालन आजार (लम्पी, लाळ्या खुरकूत, मस्तान).",

    // Risk levels
    risk_green: "हिरवा (GREEN) - कमी धोका / सामान्य",
    risk_yellow: "पिवळा (YELLOW) - मध्यम धोका / प्राथमिक उपचार",
    risk_orange: "केशरी (ORANGE) - गंभीर / तज्ज्ञ डॉक्टर रेफरल",
    risk_red: "लाल (RED) - अत्यंत आणीबाणी / तातडीने हलवा",

    // Forms & Fields
    lbl_subject_name_human: "रुग्णाचे पूर्ण नाव *",
    lbl_subject_name_vet: "जनावराचे नाव / टॅग नंबर *",
    lbl_age_human: "वय / जन्म वर्ष *",
    lbl_age_child: "वय (महिन्यांमध्ये) *",
    lbl_gender: "लिंग *",
    lbl_species: "जनावराची जात व प्रकार *",
    lbl_village: "गाव / वाडी वस्ती *",
    lbl_phone: "मोबाईल नंबर",
    lbl_guardian_human: "पालक / नातेवाईकाचे नाव",
    lbl_guardian_vet: "पशुपालकाचे नाव",
    lbl_vitals: "शारीरिक तपासणी व मोजमापे",
    lbl_symptoms: "दिसणारी लक्षणे",
    lbl_red_flags: "धोकादायक आणीबाणीची लक्षणे",
    lbl_photo_capture: "जखम / त्वचेचा फोटो काढा (ऑफलाइन संकुचित)",
    btn_run_screening: "जतन करा व एआय तपासणी करा",

    // Directory
    dir_title: "आपल्या परिसरातील डॉक्टर व पशुवैद्यक",
    dir_subtitle: "शिक्षण, तपासणी फी, दवाखान्याची वेळ आणि मोबाईल नंबरसह पडताळणी केलेले अधिकृत डॉक्टर.",
    all_villages: "सर्व गावे (कोपरगाव तालुका)",
    all_specialists: "सर्व तज्ज्ञ",
    human_docs_only: "मानवी डॉक्टर (MBBS/MD)",
    vets_only: "पशुवैद्यकीय डॉक्टर (BVSc)",
    btn_call_doc: "कॉल करा",
    btn_whatsapp_doc: "व्हॉट्सॲप",
    btn_consult_doc: "तपासणी सुरू करा व सल्ला घ्या",

    // Records
    records_title: "नोंदवलेली प्रकरणे",
    search_cases_placeholder: "नाव, टॅग, गाव किंवा आजाराने शोधा...",
    all_sectors: "सर्व विभाग (मानव व पशु)",
    all_risk_tiers: "सर्व जोखीम स्तर",
    btn_export: "डाउनलोड",
    btn_import: "अपलोड",
    btn_new_case: "नवीन",

    // Clinical Portal
    portal_title: "वैद्यकीय तपासणी कक्ष",
    portal_desc: "गंभीर रुग्णांची तातडीची यादी, निदान पडताळणी, औषधोपचार आणि रेफरल व्यवस्थापन.",
    btn_update_my_profile: "माझे प्रोफाइल व पत्ता अपडेट करा",

    // Profile Form
    prof_form_title: "डॉक्टर / पशुवैद्यक नोंदणी व दवाखान्याचा पत्ता",
    prof_form_desc: "कोपरगाव व परिसरातील रुग्णांना आपल्या दवाखान्याची माहिती, फी, शिक्षण व वेळ दिसेल.",
    lbl_prof_name: "डॉक्टरांचे पूर्ण नाव *",
    lbl_prof_title: "पद / पदवी *",
    lbl_prof_reg: "मेडिकल / व्हेटर्नरी कौन्सिल नोंदणी क्र. *",
    lbl_prof_edu: "शिक्षण (पदव्या व कॉलेज) *",
    lbl_prof_exp: "वैद्यकीय अनुभव (वर्षे) *",
    lbl_prof_spec: "विशेष तज्ज्ञता *",
    lbl_prof_fee: "तपासणी फी (उदा. मोफत / ₹५० / ₹१००) *",
    lbl_prof_clinic: "दवाखाना / रुग्णालयाचे नाव *",
    lbl_prof_area: "गाव / शहर / परिसर *",
    lbl_prof_pincode: "पिन कोड *",
    lbl_prof_addr: "पूर्ण पत्ता व लँडमार्क *",
    lbl_prof_phone: "तपासणीसाठी संपर्क नंबर *",
    lbl_prof_whatsapp: "व्हॉट्सॲप नंबर",
    lbl_prof_timings: "दवाखान्याची वेळ व दिवस *",
    lbl_prof_languages: "माहित असलेल्या भाषा *",
    lbl_prof_facilities: "उपलब्ध सुविधा (उदा. बेड, ऑक्सिजन, ईसीजी, ड्रेसिंग)",
    btn_save_profile: "प्रोफाइल जतन करा व प्रकाशित करा",

    // Messages & Alerts
    msg_saved_offline: "माहिती स्थानिक डिव्हाइसमध्ये (IndexedDB) सुरक्षित जतन झाली आहे. इंटरनेट सुरू झाल्यावर आपोआप सिंक होईल.",
    msg_synced_success: "सर्व नोंदी सर्व्हरशी यशस्वीरित्या जोडल्या गेल्या आहेत.",
    msg_emergency_alert: "धोकादायक आणीबाणी आढळली: कृपया तात्काळ ग्रामीण रुग्णालय किंवा डॉक्टरांशी संपर्क साधा!",
    surveillance_title: "सक्रिय साथीचे रोग व सर्वेक्षण सूचना"
  },

  hi: {
    app_title: "वनहेल्थ एआई (OneHealth AI)",
    app_subtitle: "ग्रामीण स्वास्थ्य एवं पशुधन ऑफलाइन जांच प्रणाली",
    nav_home: "होम",
    nav_cases: "मेरे रिकॉर्ड",
    nav_screen: "नई जांच",
    nav_doctors: "नजदीकी डॉक्टर",
    nav_portal: "क्लिनिकल पोर्टल",
    nav_analytics: "निगरानी व आंकड़े",
    nav_clinic_profile: "मेरी प्रोफाइल",
    status_online: "ऑनलाइन",
    status_offline: "ऑफलाइन मोड",
    sync_now: "डेटा सिंक करें",
    sync_pending: "पेंडिंग सिंक",
    btn_start_screening: "जांच शुरू करें",
    btn_track_growth: "ग्रोथ ट्रैक करें",
    btn_screen_herd: "पशु जांचें",
    btn_save_case: "सुरक्षित करें और एआई परिणाम देखें",
    btn_export_pdf: "केस रिपोर्ट प्रिंट करें",
    btn_listen: "निर्देश सुनें",
    btn_voice_input: "बोलकर दर्ज करें",
    btn_switch_role: "भूमिका बदलें",

    // Hero Section
    hero_badge: "ऑफलाइन-फर्स्ट ग्रामीण टेलीमेडिसिन एवं पशु चिकित्सा",
    hero_title: "स्वास्थ्य सेवा जो नेटवर्क न होने पर भी काम करती रहे।",
    hero_desc: "वनहेल्थ एआई ग्रामीण क्षेत्रों में मरीजों, स्वास्थ्य कार्यकर्ताओं, डॉक्टरों और पशु चिकित्सकों को बिना इंटरनेट के जांच, परामर्श और उपचार रिकॉर्ड करने की सुविधा देता है - फिर कनेक्शन मिलते ही सब सिंक करता है।",
    btn_get_started_patient: "मरीज / नागरिक के रूप में शुरू करें",
    btn_im_doctor: "मैं एक मेडिकल डॉक्टर हूँ",
    btn_im_vet: "मैं एक पशु चिकित्सक हूँ",
    hero_feat_1: "100% ऑफलाइन एआई जांच एवं शारीरिक माप",
    hero_feat_2: "WHO ग्रोथ चार्ट व बाल कुपोषण जांच",
    hero_feat_3: "पशुधन रोग एवं महामारी नियंत्रण",
    hero_feat_4: "डॉक्टर डायरेक्टरी एवं ई-प्रिस्क्रिप्शन",

    patient_banner_title: "📍 क्या आपको अपने क्षेत्र में डॉक्टर या पशु चिकित्सक की आवश्यकता है?",
    patient_banner_desc: "कोपरगांव, पोहेगांव, धामोरी व आसपास के डॉक्टरों की शिक्षा, फीस, समय देखें और सीधे संपर्क करें।",
    btn_find_nearby_docs: "नजदीकी डॉक्टर खोजें ➔",

    // Roles
    role_patient: "मरीज / नागरिक",
    role_doctor: "डॉक्टर (MBBS)",
    role_vet: "पशु चिकित्सक (BVSc)",
    role_select_title: "वनहेल्थ एआई में आपका स्वागत है",
    role_select_subtitle: "अपने उपयुक्त इंटरफेस का चयन करने के लिए अपनी भूमिका चुनें:",
    role_patient_title: "मरीज / नागरिक / आशा कार्यकर्ता",
    role_patient_desc: "परिवार या पशुधन की जांच करें, लक्षण देखें और नजदीकी डॉक्टर खोजें।",
    role_doctor_title: "चिकित्सक / डॉक्टर (MBBS / MD)",
    role_doctor_desc: "गंभीर मरीजों की समीक्षा करें, ई-प्रिस्क्रिप्शन लिखें और अपने क्लिनिक की जानकारी अपडेट करें।",
    role_vet_title: "पशु चिकित्सक (BVSc / पशु विशेषज्ञ)",
    role_vet_desc: "पशु रोगों (लंपी, खुरपका, थनैला) की समीक्षा करें, क्वारंटाइन निर्देश दें।",

    // Categories
    cat_human: "मानव स्वास्थ्य जांच",
    cat_human_desc: "बुखार, ब्लड प्रेशर, शुगर, संक्रमण और आपातकालीन जांच।",
    cat_child: "बाल विकास एवं पोषण",
    cat_child_desc: "WHO ग्रोथ चार्ट, कुपोषण (SAM/MAM) और विकास के चरण।",
    cat_livestock: "पशुधन स्वास्थ्य जांच",
    cat_livestock_desc: "गाय, भैंस, बकरी, मुर्गी रोग (लंपी, खुरपका-मुंहपका, थनैला)।",

    // Risk levels
    risk_green: "हरा (GREEN) - सामान्य / कम जोखिम",
    risk_yellow: "पीला (YELLOW) - मध्यम जोखिम / क्लिनिक परामर्श",
    risk_orange: "नारंगी (ORANGE) - गंभीर / डॉक्टर रेफरल",
    risk_red: "लाल (RED) - अति गंभीर / आपातकालीन रेफरल",

    // Forms & Fields
    lbl_subject_name_human: "मरीज का पूरा नाम *",
    lbl_subject_name_vet: "पशु का नाम / टैग नंबर *",
    lbl_age_human: "उम्र / जन्म वर्ष *",
    lbl_age_child: "उम्र (महीनों में) *",
    lbl_gender: "लिंग *",
    lbl_species: "पशु की नस्ल व प्रकार *",
    lbl_village: "गांव / बस्ती *",
    lbl_phone: "मोबाइल नंबर",
    lbl_guardian_human: "अभिभावक / रिश्तेदार का नाम",
    lbl_guardian_vet: "पशुपालक का नाम",
    lbl_vitals: "शारीरिक माप",
    lbl_symptoms: "दिखाई देने वाले लक्षण",
    lbl_red_flags: "आपातकालीन चेतावनी संकेत",
    lbl_photo_capture: "लक्षण / त्वचा का फोटो लें (ऑफलाइन कंप्रेस्ड)",
    btn_run_screening: "सुरक्षित करें और एआई जांच करें",

    // Directory
    dir_title: "आपके क्षेत्र के डॉक्टर एवं पशु चिकित्सक",
    dir_subtitle: "शिक्षा, परामर्श शुल्क, क्लिनिक समय और फोन नंबर के साथ सत्यापित अधिकृत डॉक्टर।",
    all_villages: "सभी गांव (कोपरगांव तहसील)",
    all_specialists: "सभी विशेषज्ञ",
    human_docs_only: "मानव डॉक्टर (MBBS/MD)",
    vets_only: "पशु चिकित्सक (BVSc)",
    btn_call_doc: "कॉल करें",
    btn_whatsapp_doc: "व्हाट्सएप",
    btn_consult_doc: "जांच शुरू करें और परामर्श लें",

    // Records
    records_title: "केस रिकॉर्ड",
    search_cases_placeholder: "नाम, टैग, गांव या बीमारी से खोजें...",
    all_sectors: "सभी विभाग (मानव एवं पशु)",
    all_risk_tiers: "सभी जोखिम स्तर",
    btn_export: "एक्सपोर्ट",
    btn_import: "इम्पोर्ट",
    btn_new_case: "नया",

    // Clinical Portal
    portal_title: "क्लिनिकल पोर्टल",
    portal_desc: "गंभीर मरीजों की प्राथमिकता सूची, निदान सत्यापन, दवाएं और रेफरल प्रबंधन।",
    btn_update_my_profile: "मेरी प्रोफाइल व पता अपडेट करें",

    // Profile Form
    prof_form_title: "डॉक्टर / पशु चिकित्सक पंजीकरण व क्लिनिक का पता",
    prof_form_desc: "कोपरगांव और आसपास के मरीजों को आपके क्लिनिक की जानकारी, फीस, शिक्षा और समय दिखेगा।",
    lbl_prof_name: "डॉक्टर का पूरा नाम *",
    lbl_prof_title: "पदवी / विशेषज्ञता *",
    lbl_prof_reg: "मेडिकल / वेटरनरी काउंसिल पंजीकरण सं. *",
    lbl_prof_edu: "शिक्षा (डिग्री और कॉलेज) *",
    lbl_prof_exp: "चिकित्सा अनुभव (वर्ष) *",
    lbl_prof_spec: "विशेष विशेषज्ञता *",
    lbl_prof_fee: "परामर्श शुल्क (उदा. निःशुल्क / ₹50 / ₹100) *",
    lbl_prof_clinic: "अस्पताल / क्लिनिक / औषधालय का नाम *",
    lbl_prof_area: "गांव / शहर / क्षेत्र *",
    lbl_prof_pincode: "पिन कोड *",
    lbl_prof_addr: "पूरा पता एवं लैंडमार्क *",
    lbl_prof_phone: "परामर्श के लिए फोन नंबर *",
    lbl_prof_whatsapp: "व्हाट्सएप नंबर",
    lbl_prof_timings: "ओपीडी समय एवं दिन *",
    lbl_prof_languages: "बोली जाने वाली भाषाएं *",
    lbl_prof_facilities: "उपलब्ध सुविधाएं (उदा. बेड, ऑक्सीजन, ईसीजी, ड्रेसिंग)",
    btn_save_profile: "प्रोफाइल सेव करें और प्रकाशित करें",

    // Messages & Alerts
    msg_saved_offline: "रिकॉर्ड सफलतापूर्वक ऑफलाइन सेव किया गया। इंटरनेट आने पर सिंक होगा।",
    msg_synced_success: "डेटा सर्वर के साथ सफलतापूर्वक सिंक हो गया है।",
    msg_emergency_alert: "आपातकालीन स्थिति: तत्काल नजदीकी अस्पताल ले जाएं!",
    surveillance_title: "सक्रिय महामारी एवं निगरानी अलर्ट"
  }
};

class OneHealthI18n {
  constructor() {
    this.currentLang = localStorage.getItem('onehealth_lang') || 'en';
  }

  setLanguage(lang) {
    if (I18N_DICTIONARY[lang]) {
      this.currentLang = lang;
      localStorage.setItem('onehealth_lang', lang);
      this.applyTranslations();
    }
  }

  t(key) {
    const dict = I18N_DICTIONARY[this.currentLang] || I18N_DICTIONARY['en'];
    return dict[key] || (I18N_DICTIONARY['en'] ? I18N_DICTIONARY['en'][key] : null) || key;
  }

  applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (key && this.t(key)) {
        el.innerText = this.t(key);
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key && this.t(key)) {
        el.setAttribute('placeholder', this.t(key));
      }
    });

    document.documentElement.lang = this.currentLang;
  }
}

window.oneHealthI18n = new OneHealthI18n();
