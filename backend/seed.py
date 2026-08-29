"""
ONEHEALTH AI - Backend Database Seeder
Populates SQLite with initial doctors, sample cases, outbreak alerts, and the full EkaCare BODHI-S Clinical Knowledge Graph.
"""

import json
import os
from backend.database import engine, Base, SessionLocal
from backend.models import User, Case, OutbreakAlert, DoctorProfile, ClinicalKnowledge

def seed_database():
    print("[Backend Seeder] Creating database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Seed BODHI-S Clinical Knowledge Graph
        kb_count = db.query(ClinicalKnowledge).count()
        if kb_count == 0:
            print("[Backend Seeder] Seeding EkaCare BODHI-S Clinical Knowledge Graph...")
            kb_path = os.path.join(os.path.dirname(__file__), "..", "public", "data", "bodhi_s_knowledge.json")
            if os.path.exists(kb_path):
                with open(kb_path, "r", encoding="utf-8") as f:
                    kb_data = json.load(f)
                    for item in kb_data:
                        node = ClinicalKnowledge(
                            id=item.get("id"),
                            symptom=item.get("base_symptom") or item.get("symptom", ""),
                            raw_symptom_text=item.get("symptom_raw") or item.get("raw_symptom_text", ""),
                            condition=item.get("condition"),
                            attributes=item.get("qualifiers") or item.get("attributes", {}),
                            source="EkaCare/BODHI-S",
                            verified=True
                        )
                        db.merge(node)
                db.commit()
                print(f"[Backend Seeder] Successfully seeded {len(kb_data)} BODHI-S knowledge nodes.")

        # 2. Seed Initial Doctors
        doc_count = db.query(DoctorProfile).count()
        if doc_count == 0:
            print("[Backend Seeder] Seeding Verified Doctors Directory...")
            initial_doctors = [
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
                )
            ]
            for doc in initial_doctors:
                db.merge(doc)
            db.commit()
            print("[Backend Seeder] Initial doctors seeded successfully.")

    except Exception as e:
        print("[Backend Seeder] Error during seed:", e)
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
