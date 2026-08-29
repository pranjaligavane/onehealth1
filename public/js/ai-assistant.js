/**
 * ONEHEALTH AI - Autonomous Offline AI Assistant (Client-Side Conversational Agent)
 * Operates 100% on-device without cloud AI APIs.
 *
 * Responsibilities:
 * 1. Symptom parsing & natural language understanding (English, Marathi, Hindi).
 * 2. Identifies missing crucial information (age, duration, vitals, red flags).
 * 3. Categorizes screening domain (Human General, Child Growth, Livestock Health).
 * 4. Recommends medical / veterinary specialties.
 * 5. Uses strictly non-diagnostic, supportive phrasing ("Possible risk identified",
 *    "AI-assisted screening indicates...", "Professional evaluation is recommended").
 * 6. Finds matching doctors / veterinarians from the offline IndexedDB directory.
 */

class OneHealthAIAssistant {
  constructor() {
    this.chatHistory = [];
    this.activeSymptomContext = {
      detectedSymptoms: [],
      category: null,
      specialty: null,
      age: null,
      durationDays: null,
      village: null,
      riskLevel: null
    };

    // Keyword & Synonyms Dictionary across EN, MR, HI
    this.symptomLexicon = [
      // Fevers & Infections
      { key: "fever_chills", terms: ["fever", "chills", "ताप", "थंडी", "बुखार", "ठंड", "shivering", "feverish", "pyrexia"], category: "human_general", specialty: "General Medicine" },
      { key: "eye_pain_retroorbital", terms: ["eye pain", "pain behind eyes", "retro orbital", "डोळे दुखणे", "डोळ्यांच्या मागे वेदना", "आंखों में दर्द"], category: "human_general", specialty: "General Medicine" },
      { key: "skin_rash_petechiae", terms: ["rash", "red spots", "petechiae", "पुरळ", "लाल डाग", "त्वचेवर पुरळ", "चकत्ते", "दाने"], category: "human_general", specialty: "Dermatology / Medicine" },
      { key: "severe_bodyache", terms: ["bodyache", "body pain", "joint pain", "अंगदुखी", "सांधेदुखी", "बदन दर्द", "जोड़ों का दर्द"], category: "human_general", specialty: "General Medicine" },
      { key: "cough_chronic_2wks", terms: ["cough", "dry cough", "wet cough", "खोकला", "उबळ", "खांसी", "कफ"], category: "human_general", specialty: "Pulmonology / Medicine" },
      { key: "night_sweats_weightloss", terms: ["night sweats", "weight loss", "रात्री घाम", "वजन घटणे", "रात में पसीना", "वजन कम"], category: "human_general", specialty: "Pulmonology / Medicine" },
      { key: "watery_diarrhea", terms: ["diarrhea", "loose motion", "watery stools", "जुलाब", "हगवण", "दस्त", "पेट खराब"], category: "human_general", specialty: "Gastroenterology / Medicine" },
      { key: "vomiting_nausea", terms: ["vomit", "vomiting", "nausea", "उलटी", "मळमळ", "उल्टी", "जी मिचलाना"], category: "human_general", specialty: "General Medicine" },
      { key: "non_healing_ulcer", terms: ["ulcer", "foot sore", "wound not healing", "न भरणारी जखम", "अल्सर", "घाव"], category: "human_general", specialty: "General Surgery / Diabetology" },

      // Emergency Red Flags
      { key: "chest_pain_severe", terms: ["chest pain", "heart pain", "crushing pain", "छातीत दुखणे", "छातीत भरून येणे", "सीने में दर्द", "हार्ट"], category: "human_general", specialty: "Cardiology / Emergency Care", isEmergency: true },
      { key: "sudden_weakness_speech", terms: ["face droop", "slurred speech", "stroke", "paralysis", "पक्षाघात", "तोंड वाकडे", "लकवा", "स्ट्रोक"], category: "human_general", specialty: "Neurology / Emergency Care", isEmergency: true },
      { key: "severe_breathlessness_rest", terms: ["breathlessness", "difficulty breathing", "shortness of breath", "दम लागणे", "श्वास घेण्यास त्रास", "सांस फूलना"], category: "human_general", specialty: "Pulmonology / Emergency Care", isEmergency: true },

      // Child Growth & Malnutrition
      { key: "child_malnutrition", terms: ["child weight", "not growing", "thin arms", "swollen feet", "बाळाचे वजन", "वाढ खुंटणे", "मुलाचे पोषण", "बच्चे का वजन", "कुपोषण"], category: "child_development", specialty: "Pediatrics" },
      { key: "child_milestone_delay", terms: ["not walking", "not speaking", "delayed milestone", "बाळ बोलत नाही", "चालत नाही", "बच्चा बोल नहीं रहा", "चल नहीं रहा"], category: "child_development", specialty: "Pediatrics" },

      // Livestock & Animal Health
      { key: "livestock_skin_nodules", terms: ["cow lumps", "skin nodules", "lumpy", "गाय फोड", "गाठी", "लम्पी", "गायों में दाने", "पशु गांठ"], category: "livestock", specialty: "Veterinary Medicine" },
      { key: "livestock_milk_drop", terms: ["milk drop", "no milk", "दुध कमी", "दूध कम", "दूध गिरना"], category: "livestock", specialty: "Veterinary Medicine" },
      { key: "livestock_mastitis", terms: ["swollen udder", "blood in milk", "mastitis", "कास सुजणे", "मस्तान", "कास गरम", "थनैला", "थन में सूजन"], category: "livestock", specialty: "Veterinary Surgery" },
      { key: "livestock_fmd", terms: ["mouth blisters", "hoof sores", "salivation", "लाळ्या खुरकूत", "लाळ गळणे", "खुरपका", "मुंहपका"], category: "livestock", specialty: "Veterinary Medicine" }
    ];
  }

  /**
   * Process incoming user natural language message offline
   */
  async processUserMessage(userText) {
    if (!userText || !userText.trim()) return null;

    const query = userText.toLowerCase().trim();
    const lang = window.oneHealthI18n ? window.oneHealthI18n.currentLang : 'en';

    // 1. Detect symptoms & matched categories from lexicon
    const matchedSymptoms = [];
    let detectedCategory = null;
    let detectedSpecialty = null;
    let hasEmergency = false;

    for (const entry of this.symptomLexicon) {
      for (const term of entry.terms) {
        if (query.includes(term.toLowerCase())) {
          matchedSymptoms.push(entry.key);
          if (entry.category) detectedCategory = entry.category;
          if (entry.specialty) detectedSpecialty = entry.specialty;
          if (entry.isEmergency) hasEmergency = true;
          break;
        }
      }
    }

    // 2. Parse numbers (e.g. age or duration)
    const numMatches = query.match(/\d+/g);
    let potentialAge = null;
    let potentialDuration = null;
    if (numMatches && numMatches.length > 0) {
      if (query.includes("day") || query.includes("दिवस") || query.includes("दिन")) {
        potentialDuration = parseInt(numMatches[0]);
      } else if (query.includes("year") || query.includes("वर्ष") || query.includes("साल") || query.includes("month") || query.includes("महिने")) {
        potentialAge = parseInt(numMatches[0]);
      }
    }

    // Update context
    if (matchedSymptoms.length > 0) {
      this.activeSymptomContext.detectedSymptoms = Array.from(new Set([...this.activeSymptomContext.detectedSymptoms, ...matchedSymptoms]));
    }
    if (detectedCategory) this.activeSymptomContext.category = detectedCategory;
    if (detectedSpecialty) this.activeSymptomContext.specialty = detectedSpecialty;
    if (potentialAge) this.activeSymptomContext.age = potentialAge;
    if (potentialDuration) this.activeSymptomContext.durationDays = potentialDuration;

    // 3. Generate structured, ethical response
    let reply = "";
    let suggestedAction = null;
    let matchingDoctors = [];

    if (hasEmergency) {
      // Critical Red Flag Response
      reply = this.formatEmergencyResponse(lang, detectedSpecialty);
      suggestedAction = { type: "emergency_triage", category: detectedCategory || "human_general" };
      matchingDoctors = await this.getRelevantDoctors(detectedSpecialty, "doctor");
    } else if (matchedSymptoms.length > 0) {
      // Symptoms Found
      reply = this.formatSymptomGuidanceResponse(lang, matchedSymptoms, detectedCategory, detectedSpecialty, potentialAge, potentialDuration);
      suggestedAction = { type: "start_screening", category: detectedCategory || "human_general" };
      matchingDoctors = await this.getRelevantDoctors(detectedSpecialty, detectedCategory === 'livestock' ? 'vet' : 'doctor');
    } else if (query.includes("doctor") || query.includes("डॉक्टर") || query.includes("दवाखाना") || query.includes("hospital") || query.includes("clinic") || query.includes("पशुवैद्यक")) {
      // Doctor Search Query
      const isVet = query.includes("vet") || query.includes("पशु") || query.includes("जनावर") || query.includes("गाय") || query.includes("animal");
      matchingDoctors = await this.getRelevantDoctors(null, isVet ? "vet" : "doctor");
      reply = this.formatDoctorDirectoryResponse(lang, matchingDoctors, isVet);
      suggestedAction = { type: "view_directory" };
    } else if (query.includes("hello") || query.includes("hi") || query.includes("नमस्ते") || query.includes("नमस्कार") || query.includes("help") || query.includes("मदत")) {
      // Greeting & Overview
      reply = this.formatGreetingResponse(lang);
    } else {
      // General Supportive Guidance
      reply = this.formatGeneralGuidanceResponse(lang);
      suggestedAction = { type: "choose_category" };
    }

    const responseObj = {
      text: reply,
      symptomsDetected: matchedSymptoms,
      suggestedCategory: detectedCategory,
      suggestedSpecialty: detectedSpecialty,
      matchingDoctors: matchingDoctors,
      suggestedAction: suggestedAction,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    this.chatHistory.push({ sender: 'user', text: userText });
    this.chatHistory.push({ sender: 'assistant', data: responseObj });

    return responseObj;
  }

  // --- LOCAL ETHICAL RESPONSE BUILDERS ---

  formatEmergencyResponse(lang, specialty) {
    if (lang === 'mr') {
      return `⚠️ **धोकादायक आणीबाणी लक्षण आढळले आहे!**\n\n` +
        `एआय-सहाय्यक विश्लेषणानुसार तात्काळ **तातडीच्या वैद्यकीय मूल्यांकनाची (Emergency Care)** शिफारस केली जाते.\n\n` +
        `• कृपया वेळ न घालवता जवळच्या **ग्रामीण रुग्णालय (Sub-District Hospital)** किंवा अतिदक्षता विभागात संपर्क साधा.\n` +
        `• खालील प्रमाणित डॉक्टरांशी तात्काळ संपर्क करू शकता:`;
    } else if (lang === 'hi') {
      return `⚠️ **आपातकालीन संकेत पाया गया है!**\n\n` +
        `एआई-सहायक विश्लेषण के अनुसार तुरंत **आपातकालीन चिकित्सा (Emergency Care)** की सिफारिश की जाती है।\n\n` +
        `• कृपया नजदीकी **उप-जिला अस्पताल** या डॉक्टर से तुरंत संपर्क करें।\n` +
        `• आप नीचे दिए गए उपलब्ध डॉक्टर से सीधा संपर्क कर सकते हैं:`;
    } else {
      return `⚠️ **Critical Red-Flag Emergency Pattern Detected.**\n\n` +
        `AI-assisted screening indicates an immediate requirement for **professional emergency evaluation**.\n\n` +
        `• Please proceed to the nearest Sub-District Hospital or emergency medical center without delay.\n` +
        `• Recommended Specialty: **${specialty || 'Emergency Medicine'}**.\n` +
        `• You may also contact one of the verified local doctors listed below:`;
    }
  }

  formatSymptomGuidanceResponse(lang, symptoms, category, specialty, age, duration) {
    const symCount = symptoms.length;
    const catName = category === 'child_development' ? 'Childhood Development' : category === 'livestock' ? 'Livestock Health' : 'Human General Health';

    if (lang === 'mr') {
      return `मी आपल्या **${symCount} लक्षणांची नोंद** घेतली आहे.\n\n` +
        `तपासणी अचूक होण्यासाठी कृपया खालील माहिती भरा:\n` +
        `• रुग्णाचे / जनावराचे अचूक वय\n` +
        `• ताप असल्यास किती °F आहे आणि किती दिवसांपासून सुरू आहे\n` +
        `• श्वास घेण्यास अडचण किंवा इतर त्रास आहे का\n\n` +
        `💡 **एआय सल्ला:** ही लक्षणे **${catName}** तपासणी विभागात मोडतात. संभाव्य जोखीम मूल्यांकन करण्यासाठी खालील बटण दाबून स्थानिक एआय तपासणी पूर्ण करा.`;
    } else if (lang === 'hi') {
      return `मैंने आपके द्वारा बताए गए **${symCount} लक्षणों** को नोट कर लिया है।\n\n` +
        `सटीक जांच के लिए कृपया निम्नलिखित जानकारी दर्ज करें:\n` +
        `• मरीज / पशु की आयु\n` +
        `• बुखार का तापमान (°F) और कितने दिनों से है\n` +
        `• सांस लेने में तकलीफ या अन्य कोई गंभीर संकेत\n\n` +
        `💡 **एआई सहायता:** अनुशंसित जांच श्रेणी: **${catName}**। संपूर्ण जोखिम स्तर जानने के लिए नीचे दिए गए बटन से जांच शुरू करें।`;
    } else {
      return `I've recorded **${symCount} symptom indicator(s)** from your description.\n\n` +
        `For a complete on-device screening, please provide:\n` +
        `• Patient/Subject age ${age ? `(noted ~${age})` : ''}\n` +
        `• Measured temperature & vitals, if available\n` +
        `• Duration of symptoms ${duration ? `(noted ~${duration} days)` : ''}\n` +
        `• Presence of difficulty breathing or weakness\n\n` +
        `💡 **Recommended Next Step:** AI-assisted screening in **${catName}** (${specialty || 'General Care'}). Professional clinical evaluation may be appropriate based on the full assessment.`;
    }
  }

  formatDoctorDirectoryResponse(lang, doctors, isVet) {
    const count = doctors.length;
    const typeLabel = isVet ? (lang === 'mr' ? 'पशुवैद्यकीय डॉक्टर' : lang === 'hi' ? 'पशु चिकित्सक' : 'veterinarians') : (lang === 'mr' ? 'वैद्यकीय डॉक्टर' : lang === 'hi' ? 'डॉक्टर' : 'medical doctors');

    if (lang === 'mr') {
      return `आपल्या ऑफलाइन डेटाबेसमध्ये कोपरगाव व परिसरातील **${count} ${typeLabel}** उपलब्ध आहेत. आपण थेट कॉल करू शकता किंवा दवाखान्याचा पत्ता पाहू शकता:`;
    } else if (lang === 'hi') {
      return `आपके ऑफलाइन डायरेक्टरी में कोपरगांव व आसपास के **${count} ${typeLabel}** उपलब्ध हैं। आप सीधे संपर्क कर सकते हैं:`;
    } else {
      return `Found **${count} verified ${typeLabel}** cached in your offline directory for Kopargaon and surrounding villages:`;
    }
  }

  formatGreetingResponse(lang) {
    if (lang === 'mr') {
      return `नमस्कार! मी **वनहेल्थ ऑफलाइन एआय सहाय्यक** आहे.\n\n` +
        `इंटरनेट नसतानाही मी आपल्याला मदत करू शकतो:\n` +
        `1. मानवी आजार, ताप व लक्षणांचे मार्गदर्शन\n` +
        `2. लहान मुलांची वाढ व कुपोषण (WHO तक्ता)\n` +
        `3. जनावरांचे आजार (लम्पी, लाळ्या खुरकूत, मस्तान)\n` +
        `4. कोपरगाव परिसरातील जवळचे डॉक्टर व दवाखाने शोधणे\n\n` +
        `आपली लक्षणे किंवा समस्या खाली टाइप करा:`;
    } else if (lang === 'hi') {
      return `नमस्ते! मैं **वनहेल्थ ऑफलाइन एआई सहायक** हूँ।\n\n` +
        `इंटरनेट न होने पर भी मैं आपकी सहायता कर सकता हूँ:\n` +
        `1. मानव स्वास्थ्य एवं बुखार जांच\n` +
        `2. बाल विकास एवं पोषण (WHO चार्ट)\n` +
        `3. पशुधन स्वास्थ्य एवं संक्रामक रोग\n` +
        `4. नजदीकी डॉक्टरों एवं पशु चिकित्सकों की जानकारी\n\n` +
        `कृपया अपने लक्षण या प्रश्न नीचे लिखें:`;
    } else {
      return `Hello! I am your **ONEHEALTH Offline AI Assistant**.\n\n` +
        `I function 100% locally on your device without internet access to help you:\n` +
        `• Describe and structure symptoms for clinical evaluation\n` +
        `• Suggest appropriate screening modules (Human, Child Growth, Livestock)\n` +
        `• Identify concerning patterns and red-flag warning signs\n` +
        `• Recommend medical specialties & find verified local doctors\n\n` +
        `How can I assist you today? Feel free to describe any symptoms.`;
    }
  }

  formatGeneralGuidanceResponse(lang) {
    if (lang === 'mr') {
      return `कृपया आपल्या आजाराची किंवा त्रासाची लक्षणे थोडक्यात सांगा (उदा. "३ दिवसांपासून ताप आणि खोकला आहे" किंवा "गायिच्या त्वचेवर गाठी आल्या आहेत"). मी आपल्याला योग्य तपासणी व डॉक्टरांचा सल्ला मिळवून देण्यास मदत करेन.`;
    } else if (lang === 'hi') {
      return `कृपया अपने लक्षण संक्षेप में बताएं (उदा. "3 दिन से बुखार और सिरदर्द है" या "पशु के दूध में कमी आई है")। मैं आपको सही जांच और डॉक्टर तक पहुंचने में मदद करूँगा।`;
    } else {
      return `Please describe the symptoms or condition you're experiencing (e.g. "fever and headache for 2 days" or "dairy cattle with skin nodules"). I will guide you to the appropriate screening category and matching local specialist.`;
    }
  }

  async getRelevantDoctors(specialty, roleFilter) {
    if (!window.oneHealthDB) return [];
    const allDocs = await window.oneHealthDB.getAllDoctors(roleFilter || null);
    if (!specialty) return allDocs.slice(0, 3);

    const specQuery = specialty.toLowerCase();
    const matched = allDocs.filter(d => {
      const matchSpecialty = (d.specialization && d.specialization.toLowerCase().includes(specQuery)) ||
                             (d.title && d.title.toLowerCase().includes(specQuery));
      return matchSpecialty;
    });

    return (matched.length > 0 ? matched : allDocs).slice(0, 3);
  }
}

// Global Singleton
window.oneHealthAIAssistant = new OneHealthAIAssistant();
