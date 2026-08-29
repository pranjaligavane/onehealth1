import os
import json
from sqlalchemy import create_engine, text
from backend.models import Base, User, DoctorProfile, OutbreakAlert, Case, ClinicalKnowledge
from sqlalchemy.orm import sessionmaker

db_url = "postgresql+psycopg2://postgres:Pranjali%402006@db.axavjvbcicwdyhosjroj.supabase.co:5432/postgres"
print(f"[Supabase Seeder] Connecting to Supabase PostgreSQL at db.axavjvbcicwdyhosjroj.supabase.co...")

engine = create_engine(db_url, connect_args={"connect_timeout": 20})

# 1. Create Tables in Supabase
print("[Supabase Seeder] Creating all tables in Supabase...")
Base.metadata.create_all(bind=engine)

Session = sessionmaker(bind=engine)
db = Session()

try:
    # 2. Seed Verified Doctors & Veterinarians Directory
    print("[Supabase Seeder] Seeding Verified Doctors & Vets Profiles...")
    doctors = [
        DoctorProfile(
            id="DOC-001",
            role="doctor",
            name="Dr. Anand Kulkarni",
            title="Senior Medical Officer & Physician",
            medical_reg_no="MMC-2011/05/1842",
            education="MBBS (BJ Medical College Pune), MD (General Medicine)",
            experience_years=14,
            specialization="General Medicine & Acute Fevers",
            consultation_fee="Free (Govt PHC) / ₹50 OPD",
            clinic_name="Kopargaon Sub-District Hospital & Tele-Care OPD",
            village="Kopargaon",
            address="Station Road, Near Tehsil Office & Bus Stand, Kopargaon - 423601",
            pincode="423601",
            phone="+91 98230 55441",
            whatsapp="+91 98230 55441",
            opd_timings="Mon-Sat: 9:00 AM - 1:30 PM, 5:00 PM - 8:30 PM (Emergency 24/7)",
            languages="Marathi (मराठी), Hindi, English",
            facilities="In-patient Beds, Emergency Oxygen, ECG, Random Blood Sugar, Fever Ward, Dressing",
            lat=19.8824,
            lng=74.4789,
            availability_state="AVAILABLE",
            last_status_time="29 Aug 2026, 6:20 PM",
            verified=True
        ),
        DoctorProfile(
            id="DOC-002",
            role="doctor",
            name="Dr. Suniti Deshmukh",
            title="Pediatrician & Child Health Specialist",
            medical_reg_no="MMC-2015/08/3920",
            education="MBBS (GMC Aurangabad), DCH (Diploma in Child Health)",
            experience_years=9,
            specialization="Pediatrics, Child Growth, Malnutrition (SAM/MAM)",
            consultation_fee="₹100 (Subsidized for Rural Families)",
            clinic_name="Matoshree Children Clinic & NRC Care",
            village="Pohegaon",
            address="Main Market Square, Pohegaon Road, Kopargaon Taluka",
            pincode="423605",
            phone="+91 98221 44332",
            whatsapp="+91 98221 44332",
            opd_timings="Mon-Sat: 10:00 AM - 2:00 PM, 6:00 PM - 9:00 PM",
            languages="Marathi (मराठी), Hindi, English",
            facilities="Baby Warmer, Phototherapy, Growth Monitoring, Nebulization, RUTF Nutrition Counseling",
            lat=19.8912,
            lng=74.4623,
            availability_state="AVAILABLE",
            last_status_time="29 Aug 2026, 5:45 PM",
            verified=True
        ),
        DoctorProfile(
            id="DOC-003",
            role="doctor",
            name="Dr. Vikram Jadhav",
            title="Rural Medical Officer & Emergency Physician",
            medical_reg_no="MMC-2018/11/5120",
            education="MBBS (MUHS Nashik), Fellowship in Emergency Medicine (FEM)",
            experience_years=6,
            specialization="Emergency Care, Cardiology & Hypertension",
            consultation_fee="Free (National Health Mission / PHC)",
            clinic_name="Primary Health Centre (PHC) Dhamori",
            village="Dhamori",
            address="Near Gram Panchayat Bhavan, PO Dhamori, Taluka Kopargaon",
            pincode="423604",
            phone="+91 98235 66778",
            whatsapp="+91 98235 66778",
            opd_timings="9:00 AM - 4:00 PM (Emergency 24x7)",
            languages="Marathi (मराठी), Hindi",
            facilities="Labor Room, Free Generic Pharmacy, Rapid Dengue/Malaria Tests, IV Infusion",
            lat=19.8654,
            lng=74.4921,
            availability_state="BUSY",
            last_status_time="29 Aug 2026, 6:10 PM",
            verified=True
        ),
        DoctorProfile(
            id="VET-001",
            role="vet",
            name="Dr. Ramesh Patil",
            title="Taluka Livestock Development Officer & Surgeon",
            medical_reg_no="MSVC-2009/4412",
            education="BVSc & AH (Bombay Veterinary College), MVSc (Surgery)",
            experience_years=15,
            specialization="Veterinary Surgery, Bovine Diseases, Lumpy Skin, Mastitis",
            consultation_fee="Free Govt Service / ₹20-40 Medicine Subsidized",
            clinic_name="Taluka Veterinary Dispensary (पशुवैद्यकीय दवाखाना)",
            village="Kopargaon",
            address="Opposite APMC Krishi Utpanna Bajar Samiti, Kopargaon - 423601",
            pincode="423601",
            phone="+91 98230 77889",
            whatsapp="+91 98230 77889",
            opd_timings="8:00 AM - 1:00 PM, 4:00 PM - 7:00 PM (Emergency on-call)",
            languages="Marathi (मराठी), Hindi, English",
            facilities="Cattle Crush, Artificial Insemination, CMT Mastitis Rapid Test, Wound Debridement, Vaccine Bank",
            lat=19.8790,
            lng=74.4720,
            availability_state="AVAILABLE",
            last_status_time="29 Aug 2026, 6:15 PM",
            verified=True
        ),
        DoctorProfile(
            id="VET-002",
            role="vet",
            name="Dr. Nitin Shinde",
            title="Veterinary Officer (Rural Mobile Clinic)",
            medical_reg_no="MSVC-2016/7821",
            education="BVSc & AH (MAFSU Nagpur)",
            experience_years=8,
            specialization="Veterinary Medicine, Dairy Cattle Health, Goat/Sheep Diseases (PPR)",
            consultation_fee="Free (Govt Dairy Scheme) / ₹50 Field Visit",
            clinic_name="Rural Veterinary First-Aid Centre Pohegaon",
            village="Pohegaon",
            address="Dairy Cooperative Society Compound, Pohegaon Phata",
            pincode="423605",
            phone="+91 98229 88334",
            whatsapp="+91 98229 88334",
            opd_timings="8:30 AM - 12:30 PM (Doorstep Farm Visits 2:00 PM - 6:30 PM)",
            languages="Marathi (मराठी), Hindi",
            facilities="Deworming, FMD/LSD Vaccination, Tick Repellent Spray, Udder Infusion, Post-mortem Triage",
            lat=19.8945,
            lng=74.4680,
            availability_state="AVAILABLE",
            last_status_time="29 Aug 2026, 5:30 PM",
            verified=True
        )
    ]
    for d in doctors:
        db.merge(d)
    print(f"[Supabase Seeder] Successfully merged {len(doctors)} doctor profiles.")

    # 3. Seed Users (Doctors & Community Health Workers)
    print("[Supabase Seeder] Seeding Users...")
    users = [
        User(id=1, username="dr_kulkarni", name="Dr. Anand Kulkarni", role="doctor", village="Kopargaon", phone="+91 98230 55441", specialization="MBBS, MD General Medicine"),
        User(id=2, username="dr_deshmukh", name="Dr. Suniti Deshmukh", role="doctor", village="Pohegaon", phone="+91 98221 44332", specialization="MBBS, DCH Pediatrics"),
        User(id=3, username="dr_patil", name="Dr. Ramesh Patil", role="vet", village="Kopargaon", phone="+91 98230 77889", specialization="BVSc & AH, MVSc Surgery"),
        User(id=4, username="asha_meena", name="Meena Tai Shelke", role="health_worker", village="Dhamori", phone="+91 98235 56677", specialization="Community ASHA Health Worker")
    ]
    for u in users:
        db.merge(u)
    print(f"[Supabase Seeder] Successfully merged {len(users)} users.")

    # 4. Seed Outbreak Alerts
    print("[Supabase Seeder] Seeding Outbreak Alerts...")
    alerts = [
        OutbreakAlert(
            id=1,
            title="Lumpy Skin Disease (LSD) Alert in Dairy Cattle",
            disease="Lumpy Skin Disease",
            target_group="Cattle / Buffalo",
            village="Kopargaon & Rahata Belt",
            severity="CRITICAL",
            description="Clustered reports of cutaneous nodules, high fever, and severe milk yield drop in crossbred cattle.",
            precautions="Isolate infected animals immediately, spray neem/anti-tick repellents, restrict cattle movement."
        ),
        OutbreakAlert(
            id=2,
            title="Seasonal Dengue & Viral Pyrexia Surge",
            disease="Dengue / Vector-borne Fever",
            target_group="Human (All Ages)",
            village="Kopargaon Town & Wards 4-7",
            severity="WARNING",
            description="Rising cases of sudden high grade fever with retro-orbital pain and severe bodyache.",
            precautions="Eliminate standing water in containers, use mosquito nets, monitor hydration with ORS."
        ),
        OutbreakAlert(
            id=3,
            title="Childhood Acute Waterborne Gastroenteritis",
            disease="Acute Watery Diarrhoea",
            target_group="Children (0-5 Years)",
            village="Dhamori & Pohegaon",
            severity="WARNING",
            description="Spike in dehydration cases among under-5 children following water contamination.",
            precautions="Boil drinking water, administer Zinc syrup (20mg daily) and WHO-ORS at onset of loose stools."
        )
    ]
    for a in alerts:
        db.merge(a)
    print(f"[Supabase Seeder] Successfully merged {len(alerts)} outbreak alerts.")

    # 5. Seed EkaCare BODHI-S Clinical Knowledge Base
    kb_path = os.path.join(os.path.dirname(__file__), "public", "data", "bodhi_s_knowledge.json")
    if os.path.exists(kb_path):
        print("[Supabase Seeder] Seeding EkaCare BODHI-S Knowledge Graph...")
        with open(kb_path, "r", encoding="utf-8") as f:
            kb_nodes = json.load(f)
            for k in kb_nodes:
                node = ClinicalKnowledge(
                    id=k.get("id"),
                    symptom=k.get("base_symptom") or k.get("symptom", ""),
                    raw_symptom_text=k.get("symptom_raw") or k.get("raw_symptom_text", ""),
                    condition=k.get("condition"),
                    attributes=k.get("qualifiers") or k.get("attributes", {}),
                    source="EkaCare/BODHI-S",
                    verified=True
                )
                db.merge(node)
        print(f"[Supabase Seeder] Successfully merged {len(kb_nodes)} BODHI-S knowledge nodes.")

    # 6. Seed Sample Cases
    print("[Supabase Seeder] Seeding Sample Cases...")
    sample_cases = [
        Case(
            id="CASE-HUM-001",
            case_type="human_general",
            subject_name="Rameshwar Thorat",
            age_or_dob="42 years",
            gender_or_sex="Male",
            species="Human",
            tag_or_id="Aadhaar-8821",
            guardian_or_owner="Self",
            contact_phone="9822114455",
            village="Pohegaon",
            risk_level="ORANGE",
            triage_summary="High fever (103.2°F) for 5 days with chills, severe retro-orbital headache, petechial rash on forearms. Suspected Dengue / Arboviral Fever.",
            primary_condition="Suspected Dengue / Arboviral Fever",
            confidence_score=0.91,
            data_payload={"vitals": {"temp_f": 103.2, "bp_systolic": 100, "bp_diastolic": 68, "pulse": 104, "spo2": 96, "blood_sugar_mgdl": 110}, "symptoms": ["fever_chills", "eye_pain_retroorbital", "skin_rash_petechiae", "severe_bodyache"]},
            status="escalated",
            assigned_role="doctor",
            is_synced=True
        ),
        Case(
            id="CASE-CHD-001",
            case_type="child_development",
            subject_name="Aarav Ganesh Shelke",
            age_or_dob="14 months",
            gender_or_sex="Male",
            species="Human",
            tag_or_id="MCTS-90214",
            guardian_or_owner="Mother: Meena Shelke",
            contact_phone="9823556677",
            village="Dhamori",
            risk_level="RED",
            triage_summary="Severe Acute Malnutrition (SAM) with Gross Motor Delay. MUAC 11.2 cm (< 11.5 cm = SAM). WAZ: -3.4 SD.",
            primary_condition="Severe Acute Malnutrition (SAM)",
            confidence_score=0.95,
            data_payload={"age_months": 14, "weight_kg": 6.1, "height_cm": 71, "muac_cm": 11.2, "edema": "no", "who_scores": {"waz": -3.4, "haz": -2.6, "whz": -3.2, "muac_cm": 11.2}},
            status="escalated",
            assigned_role="doctor",
            is_synced=True
        ),
        Case(
            id="CASE-VET-001",
            case_type="livestock",
            subject_name="Crossbred HF Cow #402",
            age_or_dob="4 years",
            gender_or_sex="Female",
            species="Cattle (Crossbred HF/Jersey)",
            tag_or_id="INAPH-9021841",
            guardian_or_owner="Farmer: Bhausaheb Vikhe",
            contact_phone="9823334411",
            village="Pohegaon",
            risk_level="RED",
            triage_summary="Circumscribed cutaneous nodules with fever (105.4°F) and milk yield crash characteristic of Lumpy Skin Disease (LSD).",
            primary_condition="Lumpy Skin Disease (LSD) - Capripoxvirus",
            confidence_score=0.94,
            data_payload={"species": "Cattle", "rectal_temp_f": 105.4, "herd_size": 12, "symptoms": ["skin_nodules_lumps", "milk_drop_severe", "swollen_lymph_nodes"]},
            status="escalated",
            assigned_role="vet",
            is_synced=True
        )
    ]
    for c in sample_cases:
        db.merge(c)
    print(f"[Supabase Seeder] Successfully merged {len(sample_cases)} sample cases.")

    db.commit()
    print("\n============================================================")
    print(" [SUPABASE SEED COMPLETE] All Doctors, Users, Alerts, Cases,")
    print(" and EkaCare BODHI-S Knowledge Nodes are LIVE in Supabase!")
    print("============================================================\n")

except Exception as e:
    print("[Supabase Seeder] Error during seed:", e)
    db.rollback()
finally:
    db.close()
