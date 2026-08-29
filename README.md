# ONEHEALTH AI: Mobile-First Offline-First Healthcare & Veterinary Care Platform

> **Tailored for rural communities like Kopargaon, Maharashtra.**
> A unified, real working Progressive Web Application (PWA) bridging Human Health (General & Child Development) and Livestock/Animal Health with 100% client-side offline AI screening, IndexedDB persistence, auto-synchronization, and Doctor/Vet tele-triage.

---

## 🌟 Key Features

### 1. 100% Real, Working Mobile-First PWA
- Built using **HTML5, CSS3, and ES6+ Vanilla JavaScript** for instant loading without heavy framework overhead on low-end budget smartphones.
- Installable on mobile home screens via `manifest.json` and `service-worker.js`.
- Responsive layout with bottom thumb navigation designed for field workers and rural citizens.

### 2. Autonomous Offline AI Decision Engines
- **Human General Health**:
  - Vitals evaluation (Shock index, Hypertensive crisis, Hypoxia detection, Fever patterns).
  - Emergency Red Flag alarms (Crushing chest pain, FAST stroke signs, Altered sensorium).
  - Differential scoring for rural endemic conditions (Dengue, Malaria, Typhoid, Tuberculosis, Gastroenteritis, Diabetes).
- **Childhood Growth & WHO Milestones (0-5 Years)**:
  - WHO Weight-for-Age, Height-for-Age, and Weight-for-Height Z-score calculation.
  - Severe Acute Malnutrition (SAM) / Moderate Acute Malnutrition (MAM) detector via MUAC (<11.5cm) and bilateral pitting edema detection.
  - 4-Domain developmental milestone tracking (Gross Motor, Fine Motor, Language, Social/Cognitive).
- **Livestock & Veterinary Disease Expert**:
  - Species: Cattle (Crossbred/Indigenous), Buffalo, Goat, Sheep, Poultry, Canine.
  - Symptom matrix: Lumpy Skin Disease (LSD), Foot and Mouth Disease (FMD), Acute Mastitis, Black Quarter, Hemorrhagic Septicemia, Peste des Petits Ruminants (PPR), and Coccidiosis.
  - Immediate quarantine and biosecurity action steps for farmers.

### 3. Native IndexedDB Offline Storage & Sync Queue
- IndexedDB handles full offline storage for cases, screening data, compressed lesion images, and sync queues.
- Live `window.online` and `window.offline` event detection.
- When offline: Cases and reviews are stored safely locally.
- When online: The background sync engine automatically drains the queue to `/api/sync/batch` and downloads active community outbreak alerts.

### 4. Multilingual & Voice Accessibility
- Complete UI translation in **English**, **Marathi (मराठी)** (for Kopargaon & Maharashtra), and **Hindi (हिंदी)**.
- Text-to-Speech (TTS) voice narration of forms and triage recommendations for low-literacy users.
- Voice dictation for symptom entry.

### 5. Professional Doctor & Vet Portal
- Dedicated triage queues sorted by urgency (RED -> ORANGE -> YELLOW -> GREEN).
- Ability for Doctors and Veterinary Officers to review escalated cases, verify risk levels, and write electronic prescriptions / referral instructions.
- Print-ready clinical case summaries for hospital referral slips.

---

## 🚀 Quick Start & Running the Application

### 1. Start the Server
```bash
python run.py
```
Or with uvicorn:
```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Open the Application
Navigate to `http://localhost:8000` in any mobile browser or desktop browser.

### 3. Running Unit Tests
```bash
python -m unittest tests/test_api.py
```

---

## 📱 Offline Testing Guide

1. Open `http://localhost:8000` in Chrome/Edge DevTools with **Network set to Offline** (or disconnect Wi-Fi).
2. Tap **"Start Screening"** -> Fill out a patient or livestock record -> Tap **"Run Offline AI Screening & Save"**.
3. Notice the immediate AI result calculated locally with risk level and recommendations.
4. Check **"Cases"** -> Notice the record marked with `🟠 Saved Offline`.
5. Switch Network back to **Online** -> Observe the app automatically syncing records to `🟢 Synced` with the backend.
