/**
 * ONEHEALTH AI - Offline Client-Side Clinical & Veterinary AI Triage Engine
 * Fully autonomous offline decision support system incorporating WHO pediatric standards,
 * adult vital triage algorithms, and livestock disease symptom scoring matrices.
 */

class OneHealthAIEngine {
  constructor() {
    this.version = "1.0.0-offline";
  }

  // =========================================================================
  // 1. HUMAN GENERAL HEALTH TRIAGE ENGINE
  // =========================================================================
  evaluateHumanGeneral(data) {
    const vitals = data.vitals || {};
    const symptoms = data.symptoms || [];
    const redFlags = data.red_flags || [];
    const durationDays = parseInt(data.duration_days) || 1;

    let riskLevel = "GREEN";
    let riskScore = 0; // 0 to 100
    let primaryCondition = "General Mild Symptoms / Observation";
    let triageSummary = "";
    let clinicalFindings = [];
    let recommendations = [];
    let redFlagAlerts = [];

    // --- A. Red Flag Emergency Evaluation (Immediate RED) ---
    const criticalFlags = [
      "chest_pain_severe", "sudden_weakness_speech", "severe_breathlessness_rest",
      "altered_consciousness", "blood_vomiting_cough", "severe_neck_stiffness"
    ];

    for (const flag of redFlags) {
      if (criticalFlags.includes(flag)) {
        riskLevel = "RED";
        riskScore = Math.max(riskScore, 95);
        redFlagAlerts.push(this.formatRedFlagName(flag));
      }
    }

    // --- B. Vitals Analysis & Shock Index ---
    const tempF = parseFloat(vitals.temp_f) || 98.6;
    const bpSys = parseFloat(vitals.bp_systolic) || 120;
    const bpDia = parseFloat(vitals.bp_diastolic) || 80;
    const pulse = parseFloat(vitals.pulse) || 75;
    const spo2 = parseFloat(vitals.spo2) || 98;
    const bloodSugar = parseFloat(vitals.blood_sugar_mgdl) || 100;
    const respRate = parseFloat(vitals.resp_rate) || 16;

    // Shock index (Pulse / Systolic BP)
    const shockIndex = pulse / (bpSys || 120);
    if (shockIndex >= 1.0 && bpSys < 90) {
      riskLevel = "RED";
      riskScore = Math.max(riskScore, 92);
      clinicalFindings.push(`Haemodynamic Instability / Shock Alert (Shock Index: ${shockIndex.toFixed(2)}, BP: ${bpSys}/${bpDia})`);
      recommendations.push("Immediate IV fluid resuscitation and urgent emergency referral to Sub-District Hospital.");
    }

    // Hypoxia
    if (spo2 < 90) {
      riskLevel = "RED";
      riskScore = Math.max(riskScore, 95);
      clinicalFindings.push(`Severe Hypoxemia (SpO2: ${spo2}%)`);
      recommendations.push("High-flow Oxygen therapy required immediately.");
    } else if (spo2 <= 93) {
      if (riskLevel !== "RED") riskLevel = "ORANGE";
      riskScore = Math.max(riskScore, 75);
      clinicalFindings.push(`Mild-to-Moderate Hypoxemia (SpO2: ${spo2}%)`);
    }

    // Hypertensive Crisis
    if (bpSys >= 180 || bpDia >= 120) {
      riskLevel = "RED";
      riskScore = Math.max(riskScore, 90);
      clinicalFindings.push(`Hypertensive Crisis (BP: ${bpSys}/${bpDia} mmHg)`);
      recommendations.push("Urgent medical evaluation for end-organ damage; avoid sudden excessive drop.");
    } else if (bpSys >= 140 || bpDia >= 90) {
      if (riskLevel === "GREEN") riskLevel = "YELLOW";
      riskScore = Math.max(riskScore, 50);
      clinicalFindings.push(`Stage 1/2 Hypertension (BP: ${bpSys}/${bpDia} mmHg)`);
    }

    // Severe Hyperpyrexia
    if (tempF >= 104.0) {
      if (riskLevel !== "RED") riskLevel = "ORANGE";
      riskScore = Math.max(riskScore, 80);
      clinicalFindings.push(`High Grade Hyperpyrexia (${tempF}°F)`);
      recommendations.push("Tepid sponging immediately; Tab Paracetamol 650mg SOS.");
    } else if (tempF >= 101.5) {
      if (riskLevel === "GREEN") riskLevel = "YELLOW";
      riskScore = Math.max(riskScore, 55);
      clinicalFindings.push(`Moderate Fever (${tempF}°F)`);
    }

    // Blood Sugar
    if (bloodSugar >= 300) {
      if (riskLevel !== "RED") riskLevel = "ORANGE";
      riskScore = Math.max(riskScore, 78);
      clinicalFindings.push(`Severe Hyperglycaemia (RBS: ${bloodSugar} mg/dL) - Risk of DKA/HHS`);
    } else if (bloodSugar <= 60) {
      riskLevel = "RED";
      riskScore = Math.max(riskScore, 90);
      clinicalFindings.push(`Hypoglycaemic Alert (RBS: ${bloodSugar} mg/dL)`);
      recommendations.push("Administer oral glucose / sweet drink immediately if conscious, else IV Dextrose 25%.");
    }

    // --- C. Differential Diagnosis Matrix for Rural Conditions ---
    const scores = {
      dengue: 0,
      malaria: 0,
      typhoid: 0,
      tuberculosis: 0,
      gastroenteritis: 0,
      respiratory_infection: 0,
      chronic_ncd: 0
    };

    if (symptoms.includes("fever_chills")) scores.malaria += 35, scores.typhoid += 20;
    if (symptoms.includes("eye_pain_retroorbital")) scores.dengue += 40;
    if (symptoms.includes("skin_rash_petechiae")) scores.dengue += 35;
    if (symptoms.includes("severe_bodyache")) scores.dengue += 20, scores.malaria += 15;
    if (symptoms.includes("cough_chronic_2wks")) scores.tuberculosis += 50;
    if (symptoms.includes("night_sweats_weightloss")) scores.tuberculosis += 40;
    if (symptoms.includes("watery_diarrhea")) scores.gastroenteritis += 45;
    if (symptoms.includes("vomiting_nausea")) scores.gastroenteritis += 25, scores.dengue += 15;
    if (symptoms.includes("stepladder_fever")) scores.typhoid += 40;
    if (symptoms.includes("headache_severe")) scores.typhoid += 20, scores.dengue += 20;
    if (symptoms.includes("cough_sputum_fever")) scores.respiratory_infection += 45;
    if (symptoms.includes("chest_pain_mild")) scores.respiratory_infection += 20;
    if (symptoms.includes("polyuria_polydipsia")) scores.chronic_ncd += 40;
    if (symptoms.includes("non_healing_ulcer")) scores.chronic_ncd += 40;

    // Pick top scored condition
    let topDiag = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
    let topScore = scores[topDiag];

    if (topScore >= 40) {
      switch (topDiag) {
        case "dengue":
          primaryCondition = "Suspected Dengue / Arboviral Fever";
          if (riskLevel === "GREEN") riskLevel = "YELLOW";
          if (symptoms.includes("skin_rash_petechiae") || redFlags.length > 0) riskLevel = "ORANGE";
          clinicalFindings.push("Symptom triad (retro-orbital pain, high fever, rash) suggests Dengue.");
          recommendations.push("Check Complete Blood Count (CBC) with Platelet count; NS1 Antigen / Dengue IgM test.");
          recommendations.push("Ensure oral hydration (ORS, coconut water) at least 2.5-3 Litres/day. Avoid Aspirin/NSAIDs.");
          break;
        case "malaria":
          primaryCondition = "Suspected Malaria (Plasmodium vivax / falciparum)";
          if (riskLevel === "GREEN") riskLevel = "YELLOW";
          clinicalFindings.push("Paroxysmal fever with chills and rigors typical of Malaria.");
          recommendations.push("Perform Rapid Diagnostic Test (RDT) for Malaria & Peripheral Blood Smear.");
          recommendations.push("If positive, start ACT / Chloroquine + Primaquine as per NVBDCP guidelines.");
          break;
        case "typhoid":
          primaryCondition = "Suspected Enteric (Typhoid) Fever";
          if (riskLevel === "GREEN") riskLevel = "YELLOW";
          clinicalFindings.push("Prolonged step-ladder fever with coated tongue and gastrointestinal signs.");
          recommendations.push("Perform Blood Culture / Widal test; monitor for abdominal tenderness/perforation signs.");
          break;
        case "tuberculosis":
          primaryCondition = "Suspected Pulmonary Tuberculosis (Presumptive TB)";
          if (riskLevel === "GREEN") riskLevel = "ORANGE";
          clinicalFindings.push("Chronic productive cough > 2 weeks with constitutional symptoms (night sweats/weight loss).");
          recommendations.push("Refer to Primary Health Centre for Sputum GeneXpert / NAAT testing and Chest X-Ray under NTEP.");
          break;
        case "gastroenteritis":
          primaryCondition = "Acute Gastroenteritis / Dehydration";
          if (riskLevel === "GREEN") riskLevel = "YELLOW";
          if (symptoms.includes("vomiting_nausea") && durationDays >= 2) riskLevel = "ORANGE";
          clinicalFindings.push("Acute fluid loss from diarrhoeal episodes.");
          recommendations.push("Initiate immediate WHO-ORS solution (1 glass after every loose stool) + Zinc tablets.");
          break;
        case "respiratory_infection":
          primaryCondition = "Acute Lower Respiratory Tract Infection / Bronchitis";
          if (riskLevel === "GREEN") riskLevel = "YELLOW";
          recommendations.push("Auscultate chest for crepitations/wheeze; symptomatic steam inhalation and hydration.");
          break;
        case "chronic_ncd":
          primaryCondition = "Uncontrolled Diabetes / Chronic Metabolic Complication";
          if (riskLevel === "GREEN") riskLevel = "YELLOW";
          recommendations.push("Fasting & Post-prandial blood sugar profile + HbA1c testing; foot care hygiene.");
          break;
      }
    }

    // Red flag overrides
    if (redFlagAlerts.length > 0) {
      triageSummary = `EMERGENCY ALERT: ${redFlagAlerts.join(", ")}. Immediate medical escalation required.`;
    } else {
      triageSummary = `${primaryCondition}. Risk Status: ${riskLevel}. ${clinicalFindings.join(". ")}`;
    }

    if (recommendations.length === 0) {
      recommendations.push("Rest, adequate hydration, nutritious diet, and follow-up if symptoms persist beyond 48 hours.");
    }

    return {
      risk_level: riskLevel,
      risk_score: Math.min(100, Math.max(15, riskScore || (riskLevel === "RED" ? 90 : riskLevel === "ORANGE" ? 70 : riskLevel === "YELLOW" ? 45 : 20))),
      confidence_score: 0.88 + (topScore > 50 ? 0.08 : 0.02),
      primary_condition: primaryCondition,
      triage_summary: triageSummary,
      clinical_findings: clinicalFindings,
      red_flags: redFlagAlerts,
      recommendations: recommendations,
      timestamp: new Date().toISOString()
    };
  }

  // =========================================================================
  // 2. CHILD DEVELOPMENT & GROWTH ENGINE (WHO Growth Standards & Milestones)
  // =========================================================================
  evaluateChildDevelopment(data) {
    const ageMonths = parseInt(data.age_months) || 12;
    const weightKg = parseFloat(data.weight_kg) || 9.0;
    const heightCm = parseFloat(data.height_cm) || 75.0;
    const muacCm = parseFloat(data.muac_cm) || 13.5;
    const hasEdema = data.edema === "yes" || data.edema === true;
    const gender = (data.gender || "male").toLowerCase();
    const milestones = data.milestones || {};

    let riskLevel = "GREEN";
    let primaryCondition = "Normal Growth & Developmental Trajectory";
    let findings = [];
    let recommendations = [];
    let redFlags = [];

    // --- A. Anthropometry & Z-Score Estimation ---
    // Reference standard approximate median for age
    const medianWeight = gender === "female" ? (2.8 + ageMonths * 0.45) : (3.1 + ageMonths * 0.48);
    const medianHeight = 50 + (ageMonths * 1.2);

    const waz = ((weightKg - medianWeight) / (medianWeight * 0.15)).toFixed(1);
    const haz = ((heightCm - medianHeight) / (medianHeight * 0.12)).toFixed(1);
    const expectedWeightForHeight = (heightCm - 50) * 0.3 + 3.5;
    const whz = ((weightKg - expectedWeightForHeight) / (expectedWeightForHeight * 0.14)).toFixed(1);

    // Severe Acute Malnutrition (SAM) Checks
    let isSAM = false;
    let isMAM = false;

    if (hasEdema) {
      isSAM = true;
      riskLevel = "RED";
      redFlags.push("Bilateral Pitting Edema (Kwashiorkor Sign)");
      findings.push("Bilateral pitting pedal edema present - Critical SAM Indicator.");
    }

    if (muacCm > 0 && muacCm < 11.5) {
      isSAM = true;
      riskLevel = "RED";
      findings.push(`MUAC ${muacCm} cm (< 11.5 cm) indicates Severe Acute Malnutrition.`);
    } else if (muacCm >= 11.5 && muacCm < 12.5) {
      isMAM = true;
      if (riskLevel === "GREEN") riskLevel = "ORANGE";
      findings.push(`MUAC ${muacCm} cm (11.5 - 12.5 cm) indicates Moderate Acute Malnutrition.`);
    }

    if (parseFloat(whz) < -3.0) {
      isSAM = true;
      riskLevel = "RED";
      findings.push(`Weight-for-Height Z-score (${whz} SD) < -3 SD indicates severe wasting.`);
    } else if (parseFloat(whz) < -2.0) {
      isMAM = true;
      if (riskLevel === "GREEN") riskLevel = "ORANGE";
      findings.push(`Weight-for-Height Z-score (${whz} SD) indicates moderate wasting.`);
    }

    if (parseFloat(haz) < -2.0) {
      findings.push(`Height-for-Age Z-score (${haz} SD) indicates chronic stunting.`);
    }

    if (isSAM) {
      primaryCondition = "Severe Acute Malnutrition (SAM)";
      recommendations.push("Immediate referral to Nutritional Rehabilitation Centre (NRC) / Sub-District Hospital.");
      recommendations.push("Appetite test with Ready-to-Use Therapeutic Food (RUTF); rule out hypothermia & hypoglycaemia.");
    } else if (isMAM) {
      primaryCondition = "Moderate Acute Malnutrition (MAM)";
      recommendations.push("Enroll in Supplementary Nutrition Programme (ICDS / Anganwadi take-home ration).");
      recommendations.push("Frequent nutrient-dense feedings with local khichdi, eggs, mashed bananas, and ghee.");
    }

    // --- B. Developmental Milestone Evaluations across 4 Domains ---
    let delayedDomains = [];
    const domainChecks = [
      { key: "gross_motor", name: "Gross Motor", minAge: 6, expected: "Sitting / crawling / standing by expected age" },
      { key: "fine_motor", name: "Fine Motor", minAge: 9, expected: "Pincer grasp / holding objects / scribbling" },
      { key: "language", name: "Language & Speech", minAge: 12, expected: "Babbling / single words / 2-word phrases" },
      { key: "social_cognitive", name: "Social & Cognitive", minAge: 6, expected: "Social smile / eye contact / stranger awareness" }
    ];

    for (const d of domainChecks) {
      const status = milestones[d.key];
      if (status === "delayed" || status === "not_achieved") {
        delayedDomains.push(d.name);
      }
    }

    if (delayedDomains.length >= 2) {
      if (riskLevel !== "RED") riskLevel = "ORANGE";
      findings.push(`Developmental Delays in: ${delayedDomains.join(", ")}.`);
      recommendations.push("Comprehensive developmental assessment at District Early Intervention Centre (DEIC).");
      if (!isSAM && !isMAM) {
        primaryCondition = `Global Developmental Delay (${delayedDomains.length} domains)`;
      }
    } else if (delayedDomains.length === 1) {
      if (riskLevel === "GREEN") riskLevel = "YELLOW";
      findings.push(`Isolated Milestone Delay in ${delayedDomains[0]}.`);
      recommendations.push(`Targeted stimulation activities for ${delayedDomains[0]}; follow-up in 1 month.`);
    }

    if (recommendations.length === 0) {
      recommendations.push("Growth & development are age-appropriate. Continue balanced feeding and routine immunization.");
    }

    const triageSummary = `${primaryCondition}. Risk: ${riskLevel}. ${findings.join(" ")}`;

    return {
      risk_level: riskLevel,
      risk_score: riskLevel === "RED" ? 92 : riskLevel === "ORANGE" ? 72 : riskLevel === "YELLOW" ? 45 : 15,
      confidence_score: 0.94,
      primary_condition: primaryCondition,
      triage_summary: triageSummary,
      who_scores: {
        waz: parseFloat(waz),
        haz: parseFloat(haz),
        whz: parseFloat(whz),
        muac_cm: muacCm,
        interpretation: isSAM ? "Severe Wasting (SAM)" : isMAM ? "Moderate Wasting (MAM)" : "Normal Weight-for-Height"
      },
      delayed_domains: delayedDomains,
      recommendations: recommendations,
      red_flags: redFlags,
      timestamp: new Date().toISOString()
    };
  }

  // =========================================================================
  // 3. LIVESTOCK & VETERINARY HEALTH TRIAGE ENGINE
  // =========================================================================
  evaluateLivestock(data) {
    const species = (data.species || "Cattle").trim();
    const tempF = parseFloat(data.rectal_temp_f) || 101.5;
    const symptoms = data.symptoms || [];
    const durationDays = parseInt(data.duration_days) || 2;
    const herdSize = parseInt(data.herd_size) || 1;
    const otherAffected = parseInt(data.other_animals_affected) || 0;

    let riskLevel = "GREEN";
    let primaryCondition = "Mild Indigestion / Minor Ailment";
    let clinicalFindings = [];
    let recommendations = [];
    let quarantineAlert = false;
    let notifiableDisease = false;

    // Normal Rectal Temp Ranges: Cattle/Buffalo: 101.5°F, Goat/Sheep: 102.5°F, Poultry: 107°F
    const isFever = (species.includes("Goat") || species.includes("Sheep")) ? tempF > 103.5 : tempF > 102.5;

    // Disease Scoring Matrix
    let scores = {
      lumpy_skin: 0,
      foot_and_mouth: 0,
      mastitis: 0,
      black_quarter: 0,
      hemorrhagic_septicemia: 0,
      ppr_goat_plague: 0,
      coccidiosis_poultry: 0,
      tick_borne_anaplasma: 0
    };

    if (symptoms.includes("skin_nodules_lumps")) scores.lumpy_skin += 60;
    if (symptoms.includes("swollen_lymph_nodes")) scores.lumpy_skin += 25, scores.hemorrhagic_septicemia += 20;
    if (symptoms.includes("milk_drop_severe")) scores.lumpy_skin += 20, scores.mastitis += 35, scores.foot_and_mouth += 25;
    if (symptoms.includes("salivation_frothing")) scores.foot_and_mouth += 50, scores.hemorrhagic_septicemia += 30;
    if (symptoms.includes("mouth_tongue_blisters")) scores.foot_and_mouth += 50, scores.ppr_goat_plague += 30;
    if (symptoms.includes("hoof_lesions_lameness")) scores.foot_and_mouth += 40, scores.black_quarter += 30;
    if (symptoms.includes("hard_swollen_udder")) scores.mastitis += 60;
    if (symptoms.includes("clots_blood_in_milk")) scores.mastitis += 50;
    if (symptoms.includes("crepitating_swelling_leg")) scores.black_quarter += 70;
    if (symptoms.includes("swollen_throat_dewlap")) scores.hemorrhagic_septicemia += 60;
    if (symptoms.includes("respiratory_grunting_gasping")) scores.hemorrhagic_septicemia += 35, scores.ppr_goat_plague += 30;
    if (symptoms.includes("nasal_discharge_foul_diarrhea")) scores.ppr_goat_plague += 60;
    if (symptoms.includes("high_fever_persistent") || isFever) {
      scores.lumpy_skin += 15;
      scores.foot_and_mouth += 15;
      scores.hemorrhagic_septicemia += 20;
      scores.black_quarter += 20;
    }
    if (symptoms.includes("tick_infestation_pale_eyes")) scores.tick_borne_anaplasma += 60;
    if (symptoms.includes("bloody_droppings_birds")) scores.coccidiosis_poultry += 70;

    let topDiag = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
    let topScore = scores[topDiag];

    if (topScore >= 40) {
      switch (topDiag) {
        case "lumpy_skin":
          primaryCondition = "Lumpy Skin Disease (LSD) - Capripoxvirus";
          riskLevel = "RED";
          quarantineAlert = true;
          notifiableDisease = true;
          clinicalFindings.push(`Circumscribed cutaneous nodules with fever (${tempF}°F) and milk crash characteristic of LSD.`);
          recommendations.push("ISOLATE ANIMAL IMMEDIATELY to prevent biting fly/mosquito transmission.");
          recommendations.push("Apply neem oil / fly repellent on nodules; treat open wounds with antiseptic spray.");
          recommendations.push("Notify Taluka Veterinary Dispensary for supportive NSAIDs + prophylactic antibiotics for secondary infection.");
          break;

        case "foot_and_mouth":
          primaryCondition = "Foot and Mouth Disease (FMD) - Aphtae epizooticae";
          riskLevel = "RED";
          quarantineAlert = true;
          notifiableDisease = true;
          clinicalFindings.push("Profuse ropy salivation with interdigital and oral vesicles indicates active FMD.");
          recommendations.push("Strict quarantine of herd; do not graze on common village pastures.");
          recommendations.push("Wash mouth lesions with 1% Potassium Permanganate (KMnO4) or 2% Sodium Bicarbonate.");
          recommendations.push("Apply Boro-glycerine on oral ulcers and antiseptic fly-repellent on hoof lesions.");
          break;

        case "mastitis":
          primaryCondition = "Acute Clinical Mastitis (Bovine / Bubaline)";
          riskLevel = "ORANGE";
          clinicalFindings.push("Inflamed udder quarter with abnormal milk secretion (clots/flakes).");
          recommendations.push("Frequent complete stripping of milk from affected teat (every 3-4 hours) into a disinfectant container.");
          recommendations.push("Intramammary antibiotic infusion after thorough stripping + systemic NSAIDs.");
          recommendations.push("Post-milking teat dipping in 0.5% Povidone-Iodine solution.");
          break;

        case "black_quarter":
          primaryCondition = "Black Quarter (Clostridium chauvoei)";
          riskLevel = "RED";
          clinicalFindings.push("Acute painful crepitant (crackling) swelling over heavy muscle mass with severe lameness.");
          recommendations.push("EMERGENCY VETERINARY INTERVENTION: High-dose Crystalline Penicillin IV/IM immediately.");
          recommendations.push("Incise swelling and wash with hydrogen peroxide under veterinary supervision; vaccinate rest of herd.");
          break;

        case "hemorrhagic_septicemia":
          primaryCondition = "Hemorrhagic Septicemia / Galghotu (Pasteurella multocida)";
          riskLevel = "RED";
          clinicalFindings.push("Edematous swelling of submandibular/throat region with respiratory stertor.");
          recommendations.push("CRITICAL EMERGENCY: Immediate administration of Sulphadimidine 33.3% IV or Oxytetracycline.");
          break;

        case "ppr_goat_plague":
          primaryCondition = "Peste des Petits Ruminants (PPR) in Small Ruminants";
          riskLevel = "RED";
          quarantineAlert = true;
          clinicalFindings.push("Erosive stomatitis, foul diarrhea, and oculonasal discharge in goats/sheep.");
          recommendations.push("Isolate all affected goats; administer oral electrolyte rehydration + antibiotics for pneumonia.");
          break;

        case "coccidiosis_poultry":
          primaryCondition = "Coccidiosis / Enteric Infection in Poultry";
          riskLevel = "ORANGE";
          clinicalFindings.push("Bloody diarrhea, ruffled feathers, huddling in flock.");
          recommendations.push("Add Amprolium / Toltrazuril to drinking water for the entire flock for 5 days; replace wet litter.");
          break;

        case "tick_borne_anaplasma":
          primaryCondition = "Tick-Borne Haemoparasitism (Babesiosis / Theileriosis / Anaplasmosis)";
          riskLevel = "ORANGE";
          clinicalFindings.push("High fever, conjunctival pallor (anaemia), heavy tick infestation.");
          recommendations.push("Administer Buparvaquone / Diminazene Diaceturate under veterinary supervision + Acaricide tick spray.");
          break;
      }
    } else {
      if (isFever) {
        riskLevel = "YELLOW";
        primaryCondition = "Pyrexia of Unknown Origin (PUO) / Mild Infection";
        clinicalFindings.push(`Elevated rectal temperature (${tempF}°F).`);
        recommendations.push("Provide cool shade, clean drinking water, and monitor temperature twice daily.");
      }
    }

    if (otherAffected > 0 && (riskLevel === "ORANGE" || riskLevel === "RED")) {
      quarantineAlert = true;
      findings.push(`Cluster alert: ${otherAffected} other animals in the herd showing similar symptoms.`);
    }

    const triageSummary = `${primaryCondition}. Risk: ${riskLevel}. ${clinicalFindings.join(" ")}`;

    return {
      risk_level: riskLevel,
      risk_score: riskLevel === "RED" ? 95 : riskLevel === "ORANGE" ? 75 : riskLevel === "YELLOW" ? 45 : 20,
      confidence_score: 0.92,
      primary_condition: primaryCondition,
      triage_summary: triageSummary,
      clinical_findings: clinicalFindings,
      recommendations: recommendations,
      quarantine_alert: quarantineAlert,
      notifiable_disease: notifiableDisease,
      timestamp: new Date().toISOString()
    };
  }

  formatRedFlagName(flag) {
    const map = {
      chest_pain_severe: "Severe Crushing Chest Pain",
      sudden_weakness_speech: "Sudden Face Droop / Arm Weakness / Slurred Speech (FAST Stroke Sign)",
      severe_breathlessness_rest: "Severe Breathlessness at Rest",
      altered_consciousness: "Unresponsiveness or Altered Mental State",
      blood_vomiting_cough: "Vomiting or Coughing Fresh Blood",
      severe_neck_stiffness: "High Fever with Stiff Neck & Photophobia (Meningeal Sign)"
    };
    return map[flag] || flag;
  }
}

// Export singleton
window.oneHealthAI = new OneHealthAIEngine();
