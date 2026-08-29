/**
 * ONEHEALTH AI - Internationalization & Multilingual Support (EN, MR, HI)
 * Tailored for rural Maharashtra (Kopargaon) with full UI, medical, and role terminology.
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
    nav_clinic_profile: "Clinic & Location",
    status_online: "ONLINE",
    status_offline: "OFFLINE MODE",
    sync_now: "Sync Records",
    sync_pending: "Pending Sync",
    btn_start_screening: "Start Screening",
    btn_save_case: "Save & Run AI Screening",
    btn_export_pdf: "Print / Export Summary",
    btn_listen: "Listen to Instructions",
    btn_voice_input: "Voice Dictation",
    btn_switch_role: "Switch Role",

    // Roles
    role_patient: "Patient / Citizen / Health Worker",
    role_doctor: "Medical Doctor (MBBS / MD)",
    role_vet: "Veterinary Doctor (BVSc / Animal Care)",
    role_select_title: "Welcome to ONEHEALTH AI",
    role_select_subtitle: "Please select who is using this device to customize your interface:",

    // Categories
    cat_human: "Human Health",
    cat_human_desc: "General acute & chronic screening, vitals analysis, endemic triage.",
    cat_child: "Child Development",
    cat_child_desc: "0-5 years WHO growth standards, malnutrition (SAM/MAM), milestone delays.",
    cat_livestock: "Livestock & Vet",
    cat_livestock_desc: "Cattle, Buffalo, Goat, Poultry disease triage (LSD, FMD, Mastitis).",

    // Risk levels
    risk_green: "GREEN - Low Risk / Routine",
    risk_yellow: "YELLOW - Moderate Risk / Clinic OPD",
    risk_orange: "ORANGE - Urgent / Doctor Referral",
    risk_red: "RED - CRITICAL EMERGENCY / Escalation",

    // Forms
    lbl_subject_name: "Full Name / Animal Identifier",
    lbl_age: "Age / Date of Birth",
    lbl_gender: "Gender / Sex",
    lbl_village: "Village / Settlement",
    lbl_phone: "Contact Phone Number",
    lbl_guardian: "Guardian / Livestock Owner",
    lbl_vitals: "Vitals & Biometrics",
    lbl_symptoms: "Observed Symptoms",
    lbl_red_flags: "Red Flag Emergency Warning Signs",
    lbl_recommendations: "Clinical Recommendations & Care",
    lbl_doctor_review: "Doctor / Vet Review & Prescription",
    lbl_photo_capture: "Capture / Upload Clinical Photo",

    // Messages
    msg_saved_offline: "Record saved locally in IndexedDB. Will auto-sync when online.",
    msg_synced_success: "Records synchronized successfully with server.",
    msg_emergency_alert: "CRITICAL RISK DETECTED: Immediate referral required!"
  },

  mr: {
    app_title: "वनहेल्थ एआय (OneHealth AI)",
    app_subtitle: "ग्रामीण आरोग्य व पशुधन ऑफलाइन तपासणी प्रणाली (कोपरगाव)",
    nav_home: "मुख्य पृष्ठ",
    nav_cases: "माझ्या नोंदी",
    nav_screen: "नवीन तपासणी",
    nav_doctors: "जवळचे डॉक्टर/पशुवैद्यक",
    nav_portal: "वैद्यकीय कक्ष",
    nav_analytics: "रोग सर्वेक्षण",
    nav_clinic_profile: "दवाखाना व पत्ता",
    status_online: "ऑनलाइन जोडलेले",
    status_offline: "ऑफलाइन मोड (इंटरनेट नाही)",
    sync_now: "डेटा सिंक करा",
    sync_pending: "प्रलंबित सिंक",
    btn_start_screening: "तपासणी सुरू करा",
    btn_save_case: "जतन करा व एआय निदान मिळवा",
    btn_export_pdf: "प्रकरण सारांश प्रिंट करा",
    btn_listen: "माहिती ऐका (आवाज)",
    btn_voice_input: "बोलून नोंदवा (व्हॉइस इनपुट)",
    btn_switch_role: "भूमिका बदला",

    // Roles
    role_patient: "रुग्ण / नागरिक / आशा सेविका",
    role_doctor: "वैद्यकीय डॉक्टर (MBBS / MD)",
    role_vet: "पशुवैद्यकीय डॉक्टर (BVSc / पशुतज्ज्ञ)",
    role_select_title: "वनहेल्थ एआय मध्ये आपले स्वागत आहे",
    role_select_subtitle: "आपल्या गरजेनुसार योग्य विभाग पाहण्यासाठी खालीलपैकी एक पर्याय निवडा:",

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

    // Forms
    lbl_subject_name: "व्यक्तीचे / जनावराचे नाव किंवा टॅग",
    lbl_age: "वय / जन्म वर्ष",
    lbl_gender: "लिंग / प्रकार",
    lbl_village: "गाव / वाडी वस्ती",
    lbl_phone: "मोबाईल नंबर",
    lbl_guardian: "पालक / पशुपालकाचे नाव",
    lbl_vitals: "शारीरिक तपासणी व मोजमापे (ताप, बीपी)",
    lbl_symptoms: "दिसणारी लक्षणे",
    lbl_red_flags: "धोकादायक आणीबाणीची लक्षणे",
    lbl_recommendations: "एआय वैद्यकीय सल्ला व उपचार",
    lbl_doctor_review: "डॉक्टर / पशुवैद्यकीय तपासणी व औषधोपचार",
    lbl_photo_capture: "जखम / त्वचेचा फोटो काढा",

    // Messages
    msg_saved_offline: "माहिती स्थानिक डिव्हाइसमध्ये (IndexedDB) सुरक्षित जतन झाली आहे. इंटरनेट सुरू झाल्यावर आपोआप सिंक होईल.",
    msg_synced_success: "सर्व नोंदी सर्व्हरशी यशस्वीरित्या जोडल्या गेल्या आहेत.",
    msg_emergency_alert: "धोकादायक आणीबाणी आढळली: कृपया तात्काळ ग्रामीण रुग्णालय किंवा डॉक्टरांशी संपर्क साधा!"
  },

  hi: {
    app_title: "वनहेल्थ एआई (OneHealth AI)",
    app_subtitle: "ग्रामीण स्वास्थ्य एवं पशुधन ऑफलाइन जांच प्रणाली",
    nav_home: "होम",
    nav_cases: "मेरे रिकॉर्ड",
    nav_screen: "नई जांच",
    nav_doctors: "नजदीकी डॉक्टर/पशु चिकित्सक",
    nav_portal: "क्लिनिकल पोर्टल",
    nav_analytics: "निगरानी व आंकड़े",
    nav_clinic_profile: "क्लिनिक व पता",
    status_online: "ऑनलाइन",
    status_offline: "ऑफलाइन मोड",
    sync_now: "डेटा सिंक करें",
    sync_pending: "पेंडिंग सिंक",
    btn_start_screening: "जांच शुरू करें",
    btn_save_case: "सुरक्षित करें और एआई परिणाम देखें",
    btn_export_pdf: "केस रिपोर्ट प्रिंट करें",
    btn_listen: "निर्देश सुनें",
    btn_voice_input: "बोलकर दर्ज करें",
    btn_switch_role: "भूमिका बदलें",

    // Roles
    role_patient: "मरीज / नागरिक / आशा कार्यकर्ता",
    role_doctor: "चिकित्सक / डॉक्टर (MBBS / MD)",
    role_vet: "पशु चिकित्सक (BVSc)",
    role_select_title: "वनहेल्थ एआई में आपका स्वागत है",
    role_select_subtitle: "अपने उपयुक्त इंटरफेस का चयन करने के लिए अपनी भूमिका चुनें:",

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

    // Forms
    lbl_subject_name: "मरीज / पशु का नाम या टैग",
    lbl_age: "उम्र",
    lbl_gender: "लिंग",
    lbl_village: "गांव / बस्ती",
    lbl_phone: "मोबाइल नंबर",
    lbl_guardian: "अभिभावक / पशुपालक का नाम",
    lbl_vitals: "शारीरिक माप (तापमान, बीपी, आदि)",
    lbl_symptoms: "लक्षण",
    lbl_red_flags: "आपातकालीन चेतावनी संकेत",
    lbl_recommendations: "सलाह एवं उपचार",
    lbl_doctor_review: "डॉक्टर / पशु चिकित्सक समीक्षा",
    lbl_photo_capture: "लक्षण / त्वचा का फोटो लें",

    // Messages
    msg_saved_offline: "रिकॉर्ड सफलतापूर्वक ऑफलाइन सेव किया गया। इंटरनेट आने पर सिंक होगा।",
    msg_synced_success: "डेटा सर्वर के साथ सफलतापूर्वक सिंक हो गया है।",
    msg_emergency_alert: "आपातकालीन स्थिति: तत्काल नजदीकी अस्पताल ले जाएं!"
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
    return dict[key] || I18N_DICTIONARY['en'][key] || key;
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
