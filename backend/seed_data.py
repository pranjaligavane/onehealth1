import datetime
from backend.database import SessionLocal, engine, Base
from backend.models import User, Case, ClinicalReview, OutbreakAlert

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Check if already seeded
    if db.query(User).first():
        print("Database already contains data, skipping seed.")
        db.close()
        return

    print("Seeding ONEHEALTH AI Database with Kopargaon rural healthcare & livestock data...")

    # 1. Users
    users = [
        User(username="asha_sunita", name="Sunita Shinde", role="health_worker", village="Kopargaon Rural", phone="9823011223", specialization="ASHA Community Health Worker"),
        User(username="dr_kulkarni", name="Dr. Anand Kulkarni", role="doctor", village="Kopargaon Sub-District Hospital", phone="9823055441", specialization="MBBS, MD (General Medicine)"),
        User(username="dr_patil_vet", name="Dr. Ramesh Patil", role="vet", village="Kopargaon Taluka Veterinary Dispensary", phone="9823077889", specialization="BVSc & AH (Veterinary Surgeon)"),
        User(username="anm_rekha", name="Rekha Gaikwad", role="health_worker", village="Savlivihor", phone="9823099887", specialization="ANM Rural Nurse"),
    ]
    for u in users:
        db.add(u)
    db.commit()

    # 2. Outbreak Alerts
    alerts = [
        OutbreakAlert(
            title="Lumpy Skin Disease (LSD) Alert in Dairy Cattle",
            disease="Lumpy Skin Disease",
            target_group="Cattle / Buffalo",
            village="Kopargaon & Rahata Belt",
            severity="CRITICAL",
            description="Clustered reports of cutaneous nodules, high fever, and drop in milk yield in crossbred dairy cattle. Vector control and isolation mandated.",
            precautions="Isolate infected animals immediately, spray neem/anti-tick repellents, restrict cattle movement to local weekly bazaars, and notify nearest Vet dispensary.",
            is_active=True
        ),
        OutbreakAlert(
            title="Seasonal Dengue & Viral Pyrexia Surge",
            disease="Dengue / Vector-borne Fever",
            target_group="Human (All Ages)",
            village="Kopargaon Town & Wards 4-7",
            severity="WARNING",
            description="Rising cases of sudden high grade fever with retro-orbital pain and severe thrombocytopenia. Dry day observance advised.",
            precautions="Eliminate standing water in coolers and containers, use mosquito nets, monitor hydration with ORS, and report platelet drops < 100,000 to SDH.",
            is_active=True
        ),
        OutbreakAlert(
            title="Childhood Acute Gastroenteritis (Waterborne)",
            disease="Acute Watery Diarrhoea",
            target_group="Children (0-5 Years)",
            village="Dhamori & Pohegaon",
            severity="WARNING",
            description="Spike in dehydration cases among under-5 children following canal water contamination.",
            precautions="Boil drinking water for at least 10 minutes, administer Zinc syrup (20mg daily for 14 days) and WHO-ORS at onset of loose stools.",
            is_active=True
        )
    ]
    for a in alerts:
        db.add(a)
    db.commit()

    # 3. Realistic Cases
    now = datetime.datetime.utcnow()
    cases = [
        # Human Case 1: High Fever & Rash (Orange/Red)
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
            village="Pohegaon (Kopargaon)",
            location_gps="19.8912, 74.4623",
            risk_level="ORANGE",
            triage_summary="High fever (103.2°F) for 5 days with chills, severe retro-orbital headache, petechial rash on forearms, and mild thrombocytopenia signs. Suspicion of Dengue with Warning Signs.",
            primary_condition="Suspected Dengue / Viral Hemorrhagic Fever",
            confidence_score=0.91,
            data_payload={
                "vitals": {"temp_f": 103.2, "bp_systolic": 100, "bp_diastolic": 68, "pulse": 104, "spo2": 96, "resp_rate": 22},
                "symptoms": ["High continuous fever", "Severe headache", "Eye pain", "Joint/Muscle pain", "Skin petechiae/rash", "Nausea"],
                "duration_days": 5,
                "red_flags": ["Persistent abdominal pain", "Extreme fatigue"]
            },
            status="escalated",
            assigned_role="doctor",
            client_created_at=now - datetime.timedelta(hours=4),
            server_synced_at=now - datetime.timedelta(hours=4),
            is_synced=True
        ),

        # Human Case 2: Hypertension & Diabetic Foot ulcer (Orange)
        Case(
            id="CASE-HUM-002",
            case_type="human_general",
            subject_name="Kaushalya Bai Shinde",
            age_or_dob="58 years",
            gender_or_sex="Female",
            species="Human",
            tag_or_id="Aadhaar-3419",
            guardian_or_owner="Son: Sanjay Shinde",
            contact_phone="9822449911",
            village="Kopargaon Ward 3",
            location_gps="19.8824, 74.4789",
            risk_level="YELLOW",
            triage_summary="Type 2 Diabetes Mellitus with elevated random blood sugar (240 mg/dL), Grade 1 non-healing ulcer on left great toe, Stage 1 Hypertension (150/94 mmHg). Needs wound dressing & glycaemic titration.",
            primary_condition="Diabetic Foot Ulcer & Uncontrolled Diabetes",
            confidence_score=0.88,
            data_payload={
                "vitals": {"temp_f": 98.6, "bp_systolic": 150, "bp_diastolic": 94, "pulse": 78, "spo2": 98, "blood_sugar_mgdl": 240},
                "symptoms": ["Non-healing foot lesion", "Polyuria", "Tingling in feet", "Blurry vision"],
                "duration_days": 18,
                "red_flags": []
            },
            status="reviewed",
            assigned_role="doctor",
            client_created_at=now - datetime.timedelta(days=1),
            server_synced_at=now - datetime.timedelta(days=1),
            is_synced=True
        ),

        # Child Case 1: Severe Acute Malnutrition & Growth Stunting (Red)
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
            location_gps="19.8654, 74.4921",
            risk_level="RED",
            triage_summary="Weight-for-Height Z-score < -3 SD (Weight: 6.1 kg, Height: 71 cm). Visible severe wasting (rib prominence, loss of buttock fat), mid-upper arm circumference (MUAC) 11.2 cm (<11.5 cm = SAM). Motor milestone delay: Unable to stand unsupported.",
            primary_condition="Severe Acute Malnutrition (SAM) with Gross Motor Delay",
            confidence_score=0.95,
            data_payload={
                "anthropometry": {"age_months": 14, "weight_kg": 6.1, "height_cm": 71, "muac_cm": 11.2, "edema": "None"},
                "who_scores": {"waz": -3.4, "haz": -2.6, "whz": -3.2, "percentile": "< 1st percentile"},
                "milestones": {
                    "gross_motor": "Delayed (cannot stand unsupported at 14m)",
                    "fine_motor": "Normal (pincer grasp present)",
                    "language": "Delayed (only babbling, no 2 single words)",
                    "social_cognitive": "Alert, tracks caregiver"
                },
                "feeding_history": "Early cessation of breastfeeding at 4 months, diluted cow milk, poor complementary feeding."
            },
            status="escalated",
            assigned_role="doctor",
            client_created_at=now - datetime.timedelta(hours=8),
            server_synced_at=now - datetime.timedelta(hours=8),
            is_synced=True
        ),

        # Child Case 2: Healthy Milestone & Catchup Immunization (Green)
        Case(
            id="CASE-CHD-002",
            case_type="child_development",
            subject_name="Ananya Rahul Jadhav",
            age_or_dob="24 months",
            gender_or_sex="Female",
            species="Human",
            tag_or_id="MCTS-87421",
            guardian_or_owner="Mother: Priya Jadhav",
            contact_phone="9823881122",
            village="Savlivihor",
            location_gps="19.9041, 74.4510",
            risk_level="GREEN",
            triage_summary="Normal physical growth (Weight: 11.5 kg, Height: 86 cm, WHZ: -0.2 SD). All 24-month developmental milestones achieved (Runs well, kicks ball, 2-word phrases, feeds self). Due for MR 2nd dose booster.",
            primary_condition="Normal Development / Routine Immunization Due",
            confidence_score=0.98,
            data_payload={
                "anthropometry": {"age_months": 24, "weight_kg": 11.5, "height_cm": 86, "muac_cm": 14.5, "edema": "None"},
                "who_scores": {"waz": 0.1, "haz": -0.1, "whz": -0.2, "percentile": "50th percentile"},
                "milestones": {
                    "gross_motor": "Achieved (runs, jumps, climbs stairs)",
                    "fine_motor": "Achieved (builds tower of 6 cubes)",
                    "language": "Achieved (combines 2-3 words)",
                    "social_cognitive": "Achieved (plays with others, imitates adults)"
                },
                "immunization": {"status": "Up to date", "next_due": "MR-2 booster + DPT-Booster 1"}
            },
            status="screened",
            assigned_role="doctor",
            client_created_at=now - datetime.timedelta(days=2),
            server_synced_at=now - datetime.timedelta(days=2),
            is_synced=True
        ),

        # Livestock Case 1: Lumpy Skin Disease in Cow (Red)
        Case(
            id="CASE-VET-001",
            case_type="livestock",
            subject_name="Crossbred HF Cow #402",
            age_or_dob="4 years",
            gender_or_sex="Female (Milking)",
            species="Cattle (HF Cross)",
            tag_or_id="INAPH-9021841",
            guardian_or_owner="Farmer: Bhausaheb Vikhe",
            contact_phone="9823334411",
            village="Pohegaon",
            location_gps="19.8945, 74.4680",
            risk_level="RED",
            triage_summary="High rectal fever (105.4°F), multiple firm circumscribed 2-5cm skin nodules across neck, flank, and perineum. Enlarged prescapular lymph nodes, severe drop in milk yield (from 14L to 2L/day), oedematous swelling in hind legs. High probability of Lumpy Skin Disease (Capripoxvirus).",
            primary_condition="Lumpy Skin Disease (LSD) - Acute Stage",
            confidence_score=0.94,
            data_payload={
                "species": "Cattle",
                "breed": "Holstein Friesian Cross",
                "rectal_temp_f": 105.4,
                "symptoms": ["Multiple skin nodules/lumps (2-5cm)", "High fever", "Drop in milk yield >80%", "Enlarged lymph nodes", "Lachrymation / nasal discharge", "Leg oedema"],
                "duration_days": 3,
                "herd_size": 12,
                "other_animals_affected": 2
            },
            status="escalated",
            assigned_role="vet",
            client_created_at=now - datetime.timedelta(hours=2),
            server_synced_at=now - datetime.timedelta(hours=2),
            is_synced=True
        ),

        # Livestock Case 2: Acute Clinical Mastitis in Murrah Buffalo (Orange)
        Case(
            id="CASE-VET-002",
            case_type="livestock",
            subject_name="Murrah Buffalo #18",
            age_or_dob="6 years",
            gender_or_sex="Female (Lactating)",
            species="Buffalo (Murrah)",
            tag_or_id="INAPH-6638120",
            guardian_or_owner="Farmer: Dnyaneshwar Wable",
            contact_phone="9822998833",
            village="Kopargaon Rural",
            location_gps="19.8790, 74.4720",
            risk_level="ORANGE",
            triage_summary="Right hind quarter udder is hot, severely swollen, and painful to palpation. Milk secretion contains clots, flakes, and yellowish serous fluid. Rectal temp 103.8°F. California Mastitis Test (CMT) Strongly Positive (+++). Immediate intramammary & systemic antibiotic therapy indicated.",
            primary_condition="Acute Clinical Mastitis (Staphylococcal/Streptococcal)",
            confidence_score=0.92,
            data_payload={
                "species": "Buffalo",
                "breed": "Murrah",
                "rectal_temp_f": 103.8,
                "symptoms": ["Hard, swollen, hot udder quarter", "Milk with clots/flakes/yellow tinge", "Pain on milking", "Moderate fever", "Appetite loss"],
                "duration_days": 2,
                "herd_size": 6,
                "other_animals_affected": 0
            },
            status="reviewed",
            assigned_role="vet",
            client_created_at=now - datetime.timedelta(hours=18),
            server_synced_at=now - datetime.timedelta(hours=18),
            is_synced=True
        )
    ]

    for c in cases:
        db.add(c)
    db.commit()

    # 4. Clinical Reviews for seeded reviewed cases
    reviews = [
        ClinicalReview(
            case_id="CASE-HUM-002",
            reviewer_name="Dr. Anand Kulkarni",
            reviewer_role="doctor",
            reviewer_notes="Patient reviewed. Glycaemic control poor. Daily wound debridement and povidone-iodine dressing required for toe ulcer. Check HbA1c and Serum Creatinine.",
            prescribed_treatment="1. Tab Metformin 500mg BD after meals\n2. Tab Glimepiride 1mg OD before breakfast\n3. Tab Telmisartan 40mg OD\n4. Wound dressing with Silver Sulfadiazine ointment daily\n5. Non-weight bearing diabetic footwear.",
            escalation_instructions="Follow up at SDH OPD after 7 days or immediately if erythema spreads above ankle.",
            verified_risk_level="YELLOW",
            is_urgent_referral=False
        ),
        ClinicalReview(
            case_id="CASE-VET-002",
            reviewer_name="Dr. Ramesh Patil",
            reviewer_role="vet",
            reviewer_notes="Acute clinical mastitis confirmed in right hind teat. Milk sample collected for culture & sensitivity. Advised complete stripping of milk 4 times daily.",
            prescribed_treatment="1. Intramammary Infusion (Cloxacillin + Ampicillin) in affected teat q12h x 3 days\n2. Inj. Ceftiofur Sodium 1g IM daily x 3 days\n3. Inj. Meloxicam + Paracetamol 15ml IM for pain/fever\n4. Teat dip with 0.5% chlorhexidine solution post milking.",
            escalation_instructions="Discard milk from treated quarters during therapy + 72hr withdrawal period. Keep stall clean and dry.",
            verified_risk_level="ORANGE",
            is_urgent_referral=False
        )
    ]
    for r in reviews:
        db.add(r)
    db.commit()

    db.close()
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed()
