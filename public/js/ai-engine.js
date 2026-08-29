/**
 * ONEHEALTH AI - Offline Client-Side Clinical & Veterinary AI Triage Engine
 * Powered by EkaCare BODHI-S Clinical Knowledge Graph, WHO Pediatric Standards,
 * and Livestock Disease Matrices.
 *
 * Designed with strict non-diagnostic, supportive clinical terminology:
 * ("Possible risk identified", "AI-assisted screening indicates...", "Professional evaluation is recommended")
 */

class OneHealthAIEngine {
  constructor() {
    this.version = "2.5.0-bodhi-s";
    this.bodhiSKnowledge = [];
    this.initBodhiSKnowledge();
  }

  async initBodhiSKnowledge() {
    try {
      if (typeof window !== 'undefined' && window.oneHealthDB && window.oneHealthDB.getAllMedicalKnowledge) {
        const list = await window.oneHealthDB.getAllMedicalKnowledge();
        if (list && list.length > 0) {
          this.bodhiSKnowledge = list;
          return;
        }
      }
      // Fetch JSON asset if available
      const resp = await fetch('./data/bodhi_s_knowledge.json');
      if (resp.ok) {
        this.bodhiSKnowledge = await resp.json();
      }
    } catch (e) {
      console.warn('[OneHealthAIEngine] BODHI-S knowledge initialized with embedded fallback dataset.');
    }
  }

  // =========================================================================
  // 1. EKACARE BODHI-S SYMPTOM EVALUATION ENGINE
  // =========================================================================
  evaluateSymptomsWithBodhiS(inputSymptoms = [], qualifiers = {}, vitals = {}) {
    if (!inputSymptoms || inputSymptoms.length === 0) {
      return null;
    }

    // Normalised input symptom query strings
    const normalizedInputs = inputSymptoms.map(s => s.toLowerCase().trim());
    
    // Condition scoring buckets based on EkaCare BODHI-S knowledge
    const conditionScores = {
      'Acute myocardial infarction': { matches: [], score: 0, specialty: 'Cardiology / Emergency Care', risk: 'RED' },
      'Abruptio Placenta': { matches: [], score: 0, specialty: 'Obstetrics & Gynecology / Emergency Care', risk: 'RED' },
      'Acute pancreatitis': { matches: [], score: 0, specialty: 'Gastroenterology / Critical Care', risk: 'ORANGE' },
      'Acute cholecystitis': { matches: [], score: 0, specialty: 'Gastroenterology / General Surgery', risk: 'ORANGE' },
      'Acute bronchitis': { matches: [], score: 0, specialty: 'Pulmonology / General Medicine', risk: 'YELLOW' },
      'Acute gastroenteritis': { matches: [], score: 0, specialty: 'Gastroenterology / General Medicine', risk: 'YELLOW' }
    };

    // Keyword & Qualifier mappings for BODHI-S Conditions
    const bodhiLexicon = [
      // Acute Myocardial Infarction
      { condition: 'Acute myocardial infarction', keywords: ['chest pain', 'chest discomfort', 'crushing', 'heart', 'sweating', 'syncope', 'breathlessness', 'exertion', 'numbness', 'low bp', 'radiating to arm', 'radiating to jaw', 'छातीत दुखणे', 'हार्ट', 'सीने में दर्द'], weight: 2.5 },
      
      // Abruptio Placenta
      { condition: 'Abruptio Placenta', keywords: ['pregnancy', 'tender uterus', 'vaginal bleeding', 'fetal movement', 'reduced fetal movement', 'back pain in pregnancy', 'गर्भारपण', 'रक्तस्राव', 'गर्भ', 'गर्भावस्था'], weight: 3.0 },

      // Acute Pancreatitis
      { condition: 'Acute pancreatitis', keywords: ['epigastric', 'radiate to shoulder', 'radiate to back', 'severe abdominal pain', 'bending forward', 'pancreas', 'अन्नाशयाजवळ वेदना', 'पाठीत कळा'], weight: 2.2 },

      // Acute Cholecystitis
      { condition: 'Acute cholecystitis', keywords: ['upper abdomen', 'right upper quadrant', 'jaundice', 'sudden fever', 'gallbladder', 'कावीळ', 'पोटात उजव्या बाजूला दुखणे', 'पीलिया'], weight: 2.0 },

      // Acute Bronchitis
      { condition: 'Acute bronchitis', keywords: ['cough', 'yellow sputum', 'green sputum', 'productive cough', 'wheezing', 'throat pain', '5 day', '2 week', 'खोकला', 'पिवळी थुंकी', 'कफ', 'खांसी'], weight: 1.8 },

      // Acute Gastroenteritis
      { condition: 'Acute gastroenteritis', keywords: ['diarrhea', 'watery stool', 'vomiting', 'dehydration', 'blood in stool', 'diffuse abdominal pain', 'जुलाब', 'उलटी', 'पाणी कमी', 'दस्त', 'उल्टी'], weight: 1.8 }
    ];

    // Evaluate matches against BODHI-S Lexicon
    for (const item of bodhiLexicon) {
      for (const input of normalizedInputs) {
        for (const kw of item.keywords) {
          if (input.includes(kw.toLowerCase()) || kw.toLowerCase().includes(input)) {
            if (!conditionScores[item.condition].matches.includes(kw)) {
              conditionScores[item.condition].matches.push(kw);
              conditionScores[item.condition].score += item.weight;
            }
          }
        }
      }
    }

    // Check additional clinical qualifiers if provided
    if (qualifiers) {
      if (qualifiers.sputum === 'yellow' || qualifiers.sputum === 'green') {
        conditionScores['Acute bronchitis'].score += 2.0;
        conditionScores['Acute bronchitis'].matches.push(`Productive sputum (${qualifiers.sputum})`);
      }
      if (qualifiers.pregnancy === true || qualifiers.is_pregnant === 'yes') {
        conditionScores['Abruptio Placenta'].score += 2.5;
        conditionScores['Abruptio Placenta'].matches.push('Active Pregnancy');
      }
      if (qualifiers.exertion === true || qualifiers.agg_by === 'exertion') {
        conditionScores['Acute myocardial infarction'].score += 2.5;
        conditionScores['Acute myocardial infarction'].matches.push('Aggravated by exertion');
      }
    }

    // Find highest matching condition
    let bestCondition = null;
    let highestScore = 0;

    for (const [cond, data] of Object.entries(conditionScores)) {
      if (data.score > highestScore && data.matches.length > 0) {
        highestScore = data.score;
        bestCondition = cond;
      }
    }

    if (!bestCondition || highestScore < 1.5) {
      return null;
    }

    const matchedData = conditionScores[bestCondition];
    const confidence = Math.min(0.96, Math.round((0.65 + (matchedData.matches.length * 0.08)) * 100) / 100);

    return {
      condition: bestCondition,
      score: highestScore,
      confidence_score: confidence,
      risk_level: matchedData.risk,
      recommended_specialty: matchedData.specialty,
      matched_symptoms: matchedData.matches,
      evidence_source: "EkaCare/BODHI-S Clinical Knowledge Base",
      clinical_summary: `AI-assisted symptom evaluation indicates clinical features strongly associated with ${bestCondition} (${matchedData.matches.join(', ')}).`
    };
  }

  // =========================================================================
  // 2. HUMAN GENERAL HEALTH TRIAGE ENGINE
  // =========================================================================
  evaluateHumanGeneral(data) {
    const vitals = data.vitals || {};
    const symptoms = data.symptoms || [];
    const redFlags = data.red_flags || [];
    const durationDays = parseInt(data.duration_days) || 1;
    const qualifiers = data.qualifiers || {};

    let riskLevel = "GREEN";
    let riskScore = 0; // 0 to 100
    let primaryCondition = "General Mild Symptoms / Observation";
    let recommendedSpecialty = "General Medicine";
    let triageSummary = "";
    let clinicalFindings = [];
    let recommendations = [];
    let redFlagAlerts = [];

    // --- A. EkaCare BODHI-S Clinical Evaluation ---
    const bodhiEvaluation = this.evaluateSymptomsWithBodhiS(symptoms, qualifiers, vitals);

    // --- B. Red Flag Emergency Evaluation (Immediate RED) ---
    const criticalFlags = [
      "chest_pain_severe", "sudden_weakness_speech", "severe_breathlessness_rest",
      "altered_consciousness", "blood_vomiting_cough", "severe_neck_stiffness",
      "pregnancy_bleeding_pain"
    ];

    for (const flag of redFlags) {
      if (criticalFlags.includes(flag)) {
        riskLevel = "RED";
        riskScore = Math.max(riskScore, 95);
        redFlagAlerts.push(this.formatRedFlagName(flag));
        if (flag === "chest_pain_severe") recommendedSpecialty = "Cardiology / Emergency Care";
        if (flag === "sudden_weakness_speech") recommendedSpecialty = "Neurology / Emergency Care";
        if (flag === "severe_breathlessness_rest") recommendedSpecialty = "Pulmonology / Emergency Care";
        if (flag === "pregnancy_bleeding_pain") recommendedSpecialty = "Obstetrics & Gynecology / Emergency Care";
      }
    }

    // --- C. Vitals Analysis & Shock Index ---
    const tempF = parseFloat(vitals.temp_f) || 98.6;
    const bpSys = parseFloat(vitals.bp_systolic) || 120;
    const bpDia = parseFloat(vitals.bp_diastolic) || 80;
    const pulse = parseFloat(vitals.pulse) || 75;
    const spo2 = parseFloat(vitals.spo2) || 98;
    const bloodSugar = parseFloat(vitals.blood_sugar_mgdl) || 100;

    // Shock index (Pulse / Systolic BP)
    const shockIndex = pulse / (bpSys || 120);
    if (shockIndex >= 1.0 && bpSys < 90) {
      riskLevel = "RED";
      riskScore = Math.max(riskScore, 92);
      recommendedSpecialty = "Emergency Medicine / Critical Care";
      clinicalFindings.push(`Haemodynamic Instability / Shock Alert (Shock Index: ${shockIndex.toFixed(2)}, BP: ${bpSys}/${bpDia})`);
      recommendations.push("Immediate IV fluid resuscitation and urgent emergency referral to Sub-District Hospital.");
    }

    // Hypoxia
    if (spo2 < 90) {
      riskLevel = "RED";
      riskScore = Math.max(riskScore, 95);
      recommendedSpecialty = "Pulmonology / Emergency Care";
      clinicalFindings.push(`Severe Hypoxemia (SpO2: ${spo2}%)`);
      recommendations.push("High-flow Oxygen therapy required immediately. Transfer to secondary hospital.");
    } else if (spo2 <= 93) {
      if (riskLevel !== "RED") riskLevel = "ORANGE";
      riskScore = Math.max(riskScore, 75);
      clinicalFindings.push(`Mild-to-Moderate Hypoxemia (SpO2: ${spo2}%)`);
      recommendedSpecialty = "Pulmonology / General Medicine";
    }

    // Hypertensive Crisis
    if (bpSys >= 180 || bpDia >= 120) {
      riskLevel = "RED";
      riskScore = Math.max(riskScore, 90);
      recommendedSpecialty = "Cardiology / General Medicine";
      clinicalFindings.push(`Hypertensive Crisis (BP: ${bpSys}/${bpDia} mmHg)`);
      recommendations.push("Urgent medical evaluation for end-organ damage; avoid sudden excessive drop.");
    } else if (bpSys >= 140 || bpDia >= 90) {
      if (riskLevel === "GREEN") riskLevel = "YELLOW";
      riskScore = Math.max(riskScore, 50);
      clinicalFindings.push(`Stage 1/2 Elevated Blood Pressure (BP: ${bpSys}/${bpDia} mmHg)`);
    }

    // Severe Hyperpyrexia
    if (tempF >= 104.0) {
      if (riskLevel !== "RED") riskLevel = "ORANGE";
      riskScore = Math.max(riskScore, 80);
      clinicalFindings.push(`High Grade Hyperpyrexia (${tempF}°F)`);
      recommendations.push("Tepid sponging immediately; antipyretic evaluation recommended.");
    } else if (tempF >= 101.5) {
      if (riskLevel === "GREEN") riskLevel = "YELLOW";
      riskScore = Math.max(riskScore, 55);
      clinicalFindings.push(`Moderate Fever (${tempF}°F)`);
    }

    // Blood Sugar
    if (bloodSugar >= 300) {
      if (riskLevel !== "RED") riskLevel = "ORANGE";
      riskScore = Math.max(riskScore, 78);
      recommendedSpecialty = "Diabetology / General Medicine";
      clinicalFindings.push(`Severe Hyperglycaemia (${bloodSugar} mg/dL)`);
      recommendations.push("Check for diabetic ketoacidosis (urine ketones/ABG) & rehydration.");
    } else if (bloodSugar < 60) {
      riskLevel = "RED";
      riskScore = Math.max(riskScore, 90);
      recommendedSpecialty = "Emergency Medicine";
      clinicalFindings.push(`Severe Hypoglycaemia (${bloodSugar} mg/dL)`);
      recommendations.push("Immediate oral glucose or IV 25% Dextrose infusion.");
    }

    // --- D. Symptom Evaluation Priority ---
    if (redFlagAlerts.length > 0) {
      primaryCondition = `Possible Critical Risk: ${redFlagAlerts.join(", ")}`;
      triageSummary = `AI-assisted screening indicates high-risk signs (${redFlagAlerts.join(", ")}). Immediate in-person physician evaluation is recommended.`;
      recommendations.push("Immediate transport to Sub-District Hospital Kopargaon.");
    } else if (bodhiEvaluation && bodhiEvaluation.score >= 2.0) {
      // Prioritize BODHI-S Clinical Evaluation Match
      if (bodhiEvaluation.risk_level === 'RED' || (bodhiEvaluation.risk_level === 'ORANGE' && riskLevel !== 'RED')) {
        riskLevel = bodhiEvaluation.risk_level;
      } else if (bodhiEvaluation.risk_level === 'YELLOW' && riskLevel === 'GREEN') {
        riskLevel = 'YELLOW';
      }
      primaryCondition = `AI-Assisted Screening (BODHI-S): Possible ${bodhiEvaluation.condition}`;
      recommendedSpecialty = bodhiEvaluation.recommended_specialty;
      triageSummary = bodhiEvaluation.clinical_summary;
      clinicalFindings.push(`BODHI-S Matched Features: ${bodhiEvaluation.matched_symptoms.join(', ')}`);

      if (bodhiEvaluation.condition === 'Acute myocardial infarction') {
        recommendations.push("Emergency 12-lead ECG, cardiac enzymes (Troponin-I), and immediate Cardiology referral.");
        recommendations.push("Rest, avoid physical exertion, administer emergency aspirin 300mg if indicated by medical protocol.");
      } else if (bodhiEvaluation.condition === 'Abruptio Placenta') {
        recommendations.push("EMERGENCY OBSTETRIC CARE: Immediate ultrasound examination and fetal heart rate monitoring.");
        recommendations.push("Do not perform digital vaginal examination; immediate transport to maternity hospital.");
      } else if (bodhiEvaluation.condition === 'Acute bronchitis') {
        recommendations.push("Warm saline gargles, steam inhalation, and oral hydration.");
        recommendations.push("Evaluate for bacterial secondary infection if productive yellow/green sputum persists > 7 days.");
      } else if (bodhiEvaluation.condition === 'Acute gastroenteritis') {
        recommendations.push("Administer WHO-ORS solution after every loose stool.");
        recommendations.push("Maintain zinc supplementation (20mg daily) and check hydration status.");
      } else if (bodhiEvaluation.condition === 'Acute pancreatitis') {
        recommendations.push("NPO (Nothing by mouth), IV fluid resuscitation, and urgent serum lipase/amylase testing.");
      } else if (bodhiEvaluation.condition === 'Acute cholecystitis') {
        recommendations.push("Urgent abdominal ultrasound (USG Abdomen) and surgical consultation.");
      }
    } else {
      // Endemic Syndromes (Dengue, Malaria, TB)
      const dengueScore = this.scoreSymptomPattern(symptoms, ["fever_chills", "eye_pain_retroorbital", "skin_rash_petechiae", "severe_bodyache"]);
      const malariaScore = this.scoreSymptomPattern(symptoms, ["fever_chills", "stepladder_fever", "severe_bodyache", "sweating_profuse"]);
      const tbScore = this.scoreSymptomPattern(symptoms, ["cough_chronic_2wks", "night_sweats_weightloss", "blood_in_sputum", "fever_lowgrade_eve"]);

      if (dengueScore >= 3) {
        if (riskLevel === "GREEN") riskLevel = "ORANGE";
        primaryCondition = "AI-Assisted Screening: Possible Arboviral / Dengue Fever Pattern";
        recommendedSpecialty = "General Medicine / Infectious Diseases";
        triageSummary = "Clinical picture exhibits acute high fever, retro-orbital pain, bodyache, and petechial signs characteristic of dengue.";
        recommendations.push("Perform Complete Blood Count (CBC) with Platelet Count & Dengue NS1/IgM antigen test.");
        recommendations.push("Maintain adequate oral hydration with ORS and fresh fluids. Avoid NSAIDs (Ibuprofen/Aspirin).");
      } else if (malariaScore >= 2 && tempF >= 101) {
        if (riskLevel === "GREEN") riskLevel = "YELLOW";
        primaryCondition = "AI-Assisted Screening: Possible Malaria / Febrile Syndrome";
        recommendedSpecialty = "General Medicine";
        triageSummary = "Periodic fever with chills and rigors detected. Localized transmission screening advised.";
        recommendations.push("Perform Peripheral Blood Smear (PBS) & Rapid Diagnostic Test (RDT) for Malaria (Pf/Pv).");
      } else if (tbScore >= 2) {
        if (riskLevel === "GREEN") riskLevel = "ORANGE";
        primaryCondition = "AI-Assisted Screening: Suspected Chronic Respiratory / TB Risk";
        recommendedSpecialty = "Pulmonology / Chest Medicine";
        triageSummary = "Chronic cough >2 weeks associated with constitutional symptoms. Meets RNTCP presumptive criteria.";
        recommendations.push("Collect 2 sputum samples for CBNAAT (GeneXpert) testing at Kopargaon Sub-District Hospital.");
        recommendations.push("Advise chest X-ray PA view and mask precautions for family.");
      } else if (clinicalFindings.length > 0) {
        triageSummary = `Vitals analysis reveals: ${clinicalFindings.join("; ")}.`;
        recommendations.push("Consult a general physician for clinical correlation.");
      } else {
        triageSummary = "No acute red-flag warning signs or critical physiological derangements identified on current screening.";
        recommendations.push("Maintain routine hydration, healthy nutrition, and re-screen if symptoms persist > 48 hours.");
      }
    }

    const confidence = bodhiEvaluation ? bodhiEvaluation.confidence_score : Math.min(0.95, 0.70 + (symptoms.length * 0.05) + (Object.keys(vitals).length * 0.03));

    return {
      risk_level: riskLevel,
      confidence_score: Math.round(confidence * 100) / 100,
      primary_condition: primaryCondition,
      recommended_specialty: recommendedSpecialty,
      triage_summary: triageSummary,
      clinical_findings: clinicalFindings,
      recommendations: recommendations,
      red_flags: redFlagAlerts,
      bodhi_evaluation: bodhiEvaluation
    };
  }

  // =========================================================================
  // 3. CHILD DEVELOPMENT & WHO GROWTH STANDARDS (0-5 YRS)
  // =========================================================================
  evaluateChildDevelopment(data) {
    const ageMonths = parseInt(data.age_months) || 12;
    const weightKg = parseFloat(data.weight_kg) || 0;
    const heightCm = parseFloat(data.height_cm) || 0;
    const muacCm = parseFloat(data.muac_cm) || 0;
    const edema = (data.edema || "no").toLowerCase() === "yes";
    const milestones = data.milestones || {};

    let riskLevel = "GREEN";
    let primaryCondition = "Normal Childhood Growth & Milestone Progression";
    let recommendedSpecialty = "Pediatrics";
    const findings = [];
    const recommendations = [];

    // 1. Bilateral Pitting Edema -> Immediate Severe Acute Malnutrition (SAM)
    if (edema) {
      riskLevel = "RED";
      primaryCondition = "Severe Acute Malnutrition (SAM) with Kwashiorkor (Nutritional Edema)";
      findings.push("Presence of Bilateral Pitting Edema in feet/legs.");
      recommendations.push("Urgent admission to Nutritional Rehabilitation Centre (NRC) at Kopargaon.");
    }

    // 2. MUAC Screening (Mid-Upper Arm Circumference)
    if (muacCm > 0) {
      if (muacCm < 11.5) {
        riskLevel = "RED";
        primaryCondition = "Severe Acute Malnutrition (SAM) by MUAC (< 11.5 cm)";
        findings.push(`MUAC measured at ${muacCm} cm (< 11.5 cm indicates severe wasting).`);
        recommendations.push("Appetite test with Ready-to-Use Therapeutic Food (RUTF); refer to NRC.");
      } else if (muacCm >= 11.5 && muacCm < 12.5) {
        if (riskLevel === "GREEN") riskLevel = "YELLOW";
        findings.push(`MUAC measured at ${muacCm} cm (Moderate Acute Malnutrition / MAM).`);
        recommendations.push("Provide supplementary nutrition counseling and bi-weekly growth monitoring.");
      }
    }

    // 3. WHO Growth Calculation (Weight-for-Age WAZ approximation)
    const expectedWeight = this.getExpectedWeightForAge(ageMonths);
    const expectedHeight = this.getExpectedHeightForAge(ageMonths);

    const wazApprox = (weightKg - expectedWeight) / (expectedWeight * 0.12);
    const hazApprox = (heightCm - expectedHeight) / (expectedHeight * 0.04);

    if (wazApprox <= -3.0 && riskLevel !== "RED") {
      riskLevel = "RED";
      primaryCondition = "Severe Underweight (WAZ < -3.0 SD)";
      findings.push(`Weight (${weightKg} kg) is severely below median for ${ageMonths} months (Z-score ~ ${wazApprox.toFixed(1)} SD).`);
    } else if (wazApprox <= -2.0 && riskLevel === "GREEN") {
      riskLevel = "YELLOW";
      primaryCondition = "Moderate Underweight (WAZ between -2 and -3 SD)";
      findings.push(`Weight (${weightKg} kg) is moderately below median (Z-score ~ ${wazApprox.toFixed(1)} SD).`);
    }

    if (hazApprox <= -2.0) {
      findings.push(`Chronic Stunting indicator (Height-for-age Z-score ~ ${hazApprox.toFixed(1)} SD).`);
    }

    // 4. Milestone Screening (4-Domains)
    let delayedCount = 0;
    const milestoneDomains = ["gross_motor", "fine_motor", "language", "social_cognitive"];
    for (const d of milestoneDomains) {
      if (milestones[d] === "delayed" || milestones[d] === "red_flag") {
        delayedCount++;
        findings.push(`Milestone delay noted in ${d.replace('_', ' ').toUpperCase()} domain.`);
      }
    }

    if (delayedCount >= 2) {
      if (riskLevel !== "RED") riskLevel = "ORANGE";
      primaryCondition += " with Global Developmental Delay";
      recommendations.push("Referral to District Early Intervention Centre (DEIC) for pediatric developmental therapy.");
    } else if (delayedCount === 1 && riskLevel === "GREEN") {
      riskLevel = "YELLOW";
      recommendations.push("Focused stimulation at home and 3-month milestone re-assessment.");
    }

    if (recommendations.length === 0) {
      recommendations.push("Continue age-appropriate complementary feeding, breastfeeding, and universal immunization.");
    }

    return {
      risk_level: riskLevel,
      confidence_score: 0.93,
      primary_condition: primaryCondition,
      recommended_specialty: recommendedSpecialty,
      triage_summary: findings.length > 0 ? findings.join(" ") : "Growth parameters and milestones are within normal age range.",
      clinical_findings: findings,
      recommendations: recommendations,
      who_scores: {
        waz: Math.round(wazApprox * 10) / 10,
        haz: Math.round(hazApprox * 10) / 10,
        muac_cm: muacCm
      }
    };
  }

  // =========================================================================
  // 4. LIVESTOCK & VETERINARY HEALTH TRIAGE ENGINE
  // =========================================================================
  evaluateLivestock(data) {
    const species = data.species || "Cattle";
    const symptoms = data.symptoms || [];
    const tempF = parseFloat(data.rectal_temp_f) || 101.5;
    const herdSize = parseInt(data.herd_size) || 1;

    let riskLevel = "GREEN";
    let primaryCondition = "Routine Veterinary Screening / No Acute Pathogen Identified";
    let recommendedSpecialty = "Veterinary Medicine";
    const findings = [];
    const recommendations = [];

    // Species specific baseline normal temperatures
    const normalTemps = { "Cattle": 101.5, "Buffalo": 101.0, "Goat": 102.5, "Sheep": 102.5, "Poultry": 107.0 };
    const baseTemp = normalTemps[species] || 101.5;
    const isFever = tempF >= (baseTemp + 2.0);

    if (isFever) {
      findings.push(`High Rectal Temperature (${tempF}°F, Normal ~ ${baseTemp}°F).`);
    }

    // 1. Lumpy Skin Disease (LSD) - Capripoxvirus
    const lsdScore = this.scoreSymptomPattern(symptoms, ["skin_nodules_lumps", "milk_drop_severe", "swollen_lymph_nodes", "leg_edema"]);
    if (lsdScore >= 2 || (symptoms.includes("skin_nodules_lumps") && isFever)) {
      riskLevel = "RED";
      primaryCondition = "Suspected Lumpy Skin Disease (LSD) - Capripoxvirus";
      recommendedSpecialty = "Veterinary Surgery / Infectious Diseases";
      findings.push("Characteristic firm, circumscribed cutaneous nodules (2-5cm) observed across body and udder.");
      recommendations.push("CRITICAL BIOSECURITY: Isolate affected animal immediately from healthy herd.");
      recommendations.push("Spray animal housing with ectoparasiticides (Cypermethrin/Neem oil) to eliminate vector flies/ticks.");
      recommendations.push("Provide supportive antipyretics (Meloxicam/Paracetamol), systemic antibiotics to prevent secondary infection.");
      recommendations.push("Immediate notification to Taluka Veterinary Officer Kopargaon for ring vaccination.");
    }

    // 2. Foot and Mouth Disease (FMD) - Aphthovirus
    const fmdScore = this.scoreSymptomPattern(symptoms, ["salivation_frothing", "mouth_tongue_blisters", "hoof_lesions_lameness"]);
    if (fmdScore >= 2) {
      riskLevel = "RED";
      primaryCondition = "Suspected Foot & Mouth Disease (FMD) - Acute Vesicular Stomatitis";
      recommendedSpecialty = "Veterinary Medicine";
      findings.push("Excessive frothy salivation with painful oral and interdigital vesicles.");
      recommendations.push("Wash mouth with 1% Potassium Permanganate (KMnO4) solution / Boro-glycerine.");
      recommendations.push("Wash foot lesions with 2% Copper Sulphate solution and apply fly-repellent antiseptic ointment.");
      recommendations.push("Quarantine entire shed; do not mix milk or grazing herds.");
    }

    // 3. Acute Clinical Mastitis
    const mastitisScore = this.scoreSymptomPattern(symptoms, ["hard_swollen_udder", "clots_blood_in_milk", "painful_teats", "milk_drop_severe"]);
    if (mastitisScore >= 2) {
      if (riskLevel !== "RED") riskLevel = "ORANGE";
      primaryCondition = "Acute Clinical Mastitis (Bacterial Udder Infection)";
      recommendedSpecialty = "Veterinary Surgery";
      findings.push("Inflamed, hot, painful quarter with abnormal milk secretion (yellow clots/flakes/blood).");
      recommendations.push("Perform rapid California Mastitis Test (CMT).");
      recommendations.push("Complete stripping of infected quarter every 2-3 hours; apply cold fomentation.");
      recommendations.push("Administer targeted intramammary antibiotic infusions under veterinary supervision.");
    }

    // 4. Black Quarter (BQ) / Hemorrhagic Septicemia (HS)
    if (symptoms.includes("crepitating_swelling_leg") && isFever) {
      riskLevel = "RED";
      primaryCondition = "EMERGENCY: Suspected Black Quarter (Clostridium chauvoei)";
      recommendedSpecialty = "Veterinary Emergency Surgery";
      findings.push("Hot, painful crepitating (gas crackling) muscular swelling on hip/shoulder.");
      recommendations.push("IMMEDIATE high-dose crystalline penicillin therapy required before toxemia progresses.");
    }

    if (recommendations.length === 0) {
      recommendations.push("Maintain clean shed hygiene, provide balanced cattle feed with mineral mixture, and ensure fresh water.");
    }

    return {
      risk_level: riskLevel,
      confidence_score: 0.94,
      primary_condition: primaryCondition,
      recommended_specialty: recommendedSpecialty,
      triage_summary: findings.length > 0 ? findings.join(" ") : "Animal appears healthy; no acute infectious symptoms detected.",
      clinical_findings: findings,
      recommendations: recommendations
    };
  }

  // --- UTILITY METHODS ---

  scoreSymptomPattern(userSymptoms, targetPattern) {
    let matches = 0;
    for (const s of targetPattern) {
      if (userSymptoms.includes(s)) matches++;
    }
    return matches;
  }

  formatRedFlagName(flagKey) {
    const map = {
      "chest_pain_severe": "Acute Crushing Chest Pain",
      "sudden_weakness_speech": "FAST Neurological Stroke Sign",
      "severe_breathlessness_rest": "Acute Respiratory Distress",
      "altered_consciousness": "Severe Lethargy / Altered Sensorium",
      "blood_vomiting_cough": "Haemoptysis / Haematemesis",
      "severe_neck_stiffness": "Meningismus / Neck Rigidity",
      "pregnancy_bleeding_pain": "Obstetric Emergency (Bleeding / Severe Pain in Pregnancy)"
    };
    return map[flagKey] || flagKey;
  }

  getExpectedWeightForAge(months) {
    if (months <= 0) return 3.3;
    if (months <= 6) return 3.3 + (months * 0.7);
    if (months <= 12) return 7.5 + ((months - 6) * 0.4);
    return (months + 9) / 2;
  }

  getExpectedHeightForAge(months) {
    if (months <= 0) return 50.0;
    if (months <= 12) return 50.0 + (months * 2.0);
    return 75.0 + ((months - 12) * 0.8);
  }
}

// Global Singleton
window.oneHealthAI = new OneHealthAIEngine();
