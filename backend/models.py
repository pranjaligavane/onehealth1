import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Float, JSON
from sqlalchemy.orm import relationship
from backend.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, index=True)  # UUID from Supabase auth
    email = Column(String(255), unique=True, index=True, nullable=True)
    name = Column(String(100), nullable=False)
    role = Column(String(30), default="patient")  # patient, health_worker, doctor, vet, admin
    village = Column(String(100), default="Kopargaon")
    phone = Column(String(20), nullable=True)
    specialization = Column(String(100), nullable=True)  # e.g. MBBS General Physician, BVSc
    medical_reg_no = Column(String(50), nullable=True)   # For doctors & vets
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class Case(Base):
    __tablename__ = "cases"

    id = Column(String(64), primary_key=True, index=True)  # UUID or client-generated ID
    case_type = Column(String(30), index=True, nullable=False)  # human_general, child_development, livestock
    
    # Subject Identification
    subject_name = Column(String(100), nullable=False)
    age_or_dob = Column(String(50), nullable=True)
    gender_or_sex = Column(String(20), nullable=True)
    species = Column(String(50), nullable=True)
    tag_or_id = Column(String(50), nullable=True)
    guardian_or_owner = Column(String(100), nullable=True)
    contact_phone = Column(String(20), nullable=True)
    village = Column(String(100), default="Kopargaon", index=True)
    location_gps = Column(String(100), nullable=True)
    
    # Screening & Triage Info
    risk_level = Column(String(20), index=True, default="GREEN")  # GREEN, YELLOW, ORANGE, RED
    triage_summary = Column(Text, nullable=True)
    primary_condition = Column(String(100), nullable=True)
    confidence_score = Column(Float, default=0.85)
    
    # Payload storage
    data_payload = Column(JSON, nullable=True)
    images = Column(JSON, nullable=True)
    
    # Status & Workflow
    status = Column(String(30), default="screened")  # screened, escalated, reviewed, resolved
    assigned_role = Column(String(30), nullable=True)  # doctor, vet
    assigned_doctor_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=True)  # Auth-linked creator
    
    # Sync metadata
    client_created_at = Column(DateTime, default=datetime.datetime.utcnow)
    server_synced_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_synced = Column(Boolean, default=True)
    
    # Relationships
    reviews = relationship("ClinicalReview", back_populates="case", cascade="all, delete-orphan")

class ClinicalReview(Base):
    __tablename__ = "clinical_reviews"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(64), ForeignKey("cases.id"), nullable=False, index=True)
    reviewer_id = Column(String(36), ForeignKey("users.id"), nullable=True)  # Auth-linked
    reviewer_name = Column(String(100), nullable=False)
    reviewer_role = Column(String(30), nullable=False)  # doctor, vet
    reviewer_notes = Column(Text, nullable=False)
    prescribed_treatment = Column(Text, nullable=True)
    escalation_instructions = Column(Text, nullable=True)
    verified_risk_level = Column(String(20), nullable=True)
    is_urgent_referral = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    case = relationship("Case", back_populates="reviews")

class OutbreakAlert(Base):
    __tablename__ = "outbreak_alerts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    disease = Column(String(100), nullable=False)
    target_group = Column(String(50), nullable=False)
    village = Column(String(100), nullable=False)
    severity = Column(String(20), default="WARNING")  # WARNING, CRITICAL, RESOLVED
    description = Column(Text, nullable=False)
    precautions = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class DoctorProfile(Base):
    __tablename__ = "doctor_profiles"

    id = Column(String(50), primary_key=True, index=True)  # e.g. DOC-001 or VET-001
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, unique=True)  # Auth link
    role = Column(String(20), default="doctor")  # doctor, vet
    name = Column(String(100), nullable=False)
    title = Column(String(100), nullable=False)
    medical_reg_no = Column(String(50), nullable=True)
    education = Column(String(200), nullable=False)
    experience_years = Column(Integer, default=5)
    specialization = Column(String(150), nullable=True)
    consultation_fee = Column(String(100), nullable=False)
    clinic_name = Column(String(150), nullable=False)
    village = Column(String(100), nullable=False, index=True)
    pincode = Column(String(10), default="423601")
    address = Column(Text, nullable=False)
    phone = Column(String(30), nullable=False)
    whatsapp = Column(String(30), nullable=True)
    opd_timings = Column(String(150), nullable=False)
    languages = Column(String(150), default="Marathi, Hindi, English")
    facilities = Column(Text, nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    availability_state = Column(String(20), default="AVAILABLE")
    last_status_time = Column(String(50), nullable=True)
    verified = Column(Boolean, default=False)  # False until admin reviews

class ClinicalKnowledge(Base):
    __tablename__ = "clinical_knowledge"

    id = Column(String(50), primary_key=True, index=True)
    symptom = Column(String(200), nullable=False, index=True)
    raw_symptom_text = Column(Text, nullable=True)
    condition = Column(String(200), nullable=False, index=True)
    attributes = Column(JSON, nullable=True)
    source = Column(String(100), default="EkaCare/BODHI-S")
    verified = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class SyncLog(Base):
    __tablename__ = "sync_logs"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(100), nullable=True)
    cases_synced_count = Column(Integer, default=0)
    client_timestamp = Column(DateTime, nullable=True)
    server_timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String(30), default="SUCCESS")
