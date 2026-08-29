import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Float, JSON
from sqlalchemy.orm import relationship
from backend.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    role = Column(String(30), default="health_worker") # health_worker, doctor, vet, citizen, admin
    village = Column(String(100), default="Kopargaon")
    phone = Column(String(20), nullable=True)
    specialization = Column(String(100), nullable=True) # e.g. MBBS General Physician, BVSc Veterinary Officer, ASHA Worker
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Case(Base):
    __tablename__ = "cases"

    id = Column(String(64), primary_key=True, index=True) # UUID or client-generated ID
    case_type = Column(String(30), index=True, nullable=False) # human_general, child_development, livestock
    
    # Subject Identification
    subject_name = Column(String(100), nullable=False)
    age_or_dob = Column(String(50), nullable=True) # e.g., "34" or "18 months" or "3 years"
    gender_or_sex = Column(String(20), nullable=True) # Male, Female, Other, Bull, Cow, Goat, etc.
    species = Column(String(50), nullable=True) # Cattle, Buffalo, Goat, Sheep, Poultry, Canine, Human
    tag_or_id = Column(String(50), nullable=True) # Aadhaar last 4 / Animal Ear Tag #
    guardian_or_owner = Column(String(100), nullable=True)
    contact_phone = Column(String(20), nullable=True)
    village = Column(String(100), default="Kopargaon", index=True)
    location_gps = Column(String(100), nullable=True) # "19.8824, 74.4789"
    
    # Screening & Triage Info
    risk_level = Column(String(20), index=True, default="GREEN") # GREEN, YELLOW, ORANGE, RED
    triage_summary = Column(Text, nullable=True)
    primary_condition = Column(String(100), nullable=True)
    confidence_score = Column(Float, default=0.85)
    
    # Payload storage (Vitals, Growth Milestones, Symptoms checklist, Image metadata)
    data_payload = Column(JSON, nullable=True)
    images = Column(JSON, nullable=True) # List of image references/base64 strings
    
    # Status & Workflow
    status = Column(String(30), default="screened") # screened, escalated, reviewed, resolved
    assigned_role = Column(String(30), nullable=True) # doctor, vet
    assigned_doctor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
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
    reviewer_name = Column(String(100), nullable=False)
    reviewer_role = Column(String(30), nullable=False) # doctor, vet
    reviewer_notes = Column(Text, nullable=False)
    prescribed_treatment = Column(Text, nullable=True)
    escalation_instructions = Column(Text, nullable=True)
    verified_risk_level = Column(String(20), nullable=True) # GREEN, YELLOW, ORANGE, RED
    is_urgent_referral = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    case = relationship("Case", back_populates="reviews")

class OutbreakAlert(Base):
    __tablename__ = "outbreak_alerts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    disease = Column(String(100), nullable=False)
    target_group = Column(String(50), nullable=False) # Human, Cattle, Poultry, etc.
    village = Column(String(100), nullable=False, index=True)
    severity = Column(String(20), default="WARNING") # INFO, WARNING, CRITICAL
    description = Column(Text, nullable=False)
    precautions = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class SyncLog(Base):
    __tablename__ = "sync_logs"

    id = Column(Integer, primary_key=True, index=True)
    client_device_id = Column(String(100), nullable=True)
    sync_count = Column(Integer, default=0)
    synced_at = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String(30), default="success")
    details = Column(JSON, nullable=True)
