from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

# =============================================================================
# AUTH SCHEMAS
# =============================================================================

class UserRegister(BaseModel):
    """Registration payload for a new user (patient or doctor/vet)."""
    email: str
    password: str
    name: str
    role: str = "patient"           # patient | health_worker | doctor | vet
    phone: Optional[str] = None
    village: Optional[str] = "Kopargaon"
    specialization: Optional[str] = None
    medical_reg_no: Optional[str] = None   # For doctors/vets
    # Doctor-specific
    clinic_name: Optional[str] = None
    consultation_fee: Optional[str] = None
    opd_timings: Optional[str] = None
    address: Optional[str] = None

class UserLogin(BaseModel):
    """Login payload."""
    email: str
    password: str

class UserProfileUpdate(BaseModel):
    """Partial user profile update."""
    name: Optional[str] = None
    phone: Optional[str] = None
    village: Optional[str] = None
    specialization: Optional[str] = None
    medical_reg_no: Optional[str] = None

class UserProfileResponse(BaseModel):
    """Full user profile response."""
    id: str
    email: Optional[str]
    name: str
    role: str
    village: Optional[str]
    phone: Optional[str]
    specialization: Optional[str]
    medical_reg_no: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True

class AuthResponse(BaseModel):
    """Response from sign-in / sign-up."""
    access_token: Optional[str] = None
    token_type: str = "bearer"
    user: Optional[UserProfileResponse] = None
    message: str = "success"

# =============================================================================
# EXISTING USER SCHEMAS (legacy / internal)
# =============================================================================

class UserBase(BaseModel):
    name: str
    role: str = "patient"
    village: Optional[str] = "Kopargaon"
    phone: Optional[str] = None
    specialization: Optional[str] = None

class UserCreate(UserBase):
    email: Optional[str] = None

class UserResponse(UserBase):
    id: str
    email: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True

# =============================================================================
# CLINICAL REVIEW SCHEMAS
# =============================================================================

class ClinicalReviewBase(BaseModel):
    case_id: str
    reviewer_name: str
    reviewer_role: str
    reviewer_notes: str
    prescribed_treatment: Optional[str] = None
    escalation_instructions: Optional[str] = None
    verified_risk_level: Optional[str] = None
    is_urgent_referral: bool = False

class ClinicalReviewCreate(ClinicalReviewBase):
    reviewer_id: Optional[str] = None  # Auth UUID

class ClinicalReviewResponse(ClinicalReviewBase):
    id: int
    reviewer_id: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True

# =============================================================================
# CASE SCHEMAS
# =============================================================================

class CaseBase(BaseModel):
    id: str
    case_type: str  # human_general, child_development, livestock
    subject_name: str
    age_or_dob: Optional[str] = None
    gender_or_sex: Optional[str] = None
    species: Optional[str] = None
    tag_or_id: Optional[str] = None
    guardian_or_owner: Optional[str] = None
    contact_phone: Optional[str] = None
    village: Optional[str] = "Kopargaon"
    location_gps: Optional[str] = None
    risk_level: str = "GREEN"
    triage_summary: Optional[str] = None
    primary_condition: Optional[str] = None
    confidence_score: float = 0.85
    data_payload: Optional[Dict[str, Any]] = None
    images: Optional[List[str]] = None
    status: str = "screened"
    assigned_role: Optional[str] = None
    assigned_doctor_id: Optional[str] = None
    created_by: Optional[str] = None
    client_created_at: Optional[datetime] = None

class CaseCreate(CaseBase):
    pass

class CaseResponse(CaseBase):
    server_synced_at: datetime
    is_synced: bool
    reviews: List[ClinicalReviewResponse] = []
    class Config:
        from_attributes = True

# =============================================================================
# SYNC SCHEMAS
# =============================================================================

class BatchSyncPayload(BaseModel):
    device_id: Optional[str] = "browser-client"
    last_sync_timestamp: Optional[datetime] = None
    cases: List[CaseCreate] = []
    reviews: List[ClinicalReviewCreate] = []

class BatchSyncResponse(BaseModel):
    synced_case_ids: List[str]
    synced_review_ids: List[int]
    server_updates: List[CaseResponse]
    server_timestamp: datetime
    active_alerts: List[Dict[str, Any]] = []

# =============================================================================
# OUTBREAK ALERT SCHEMA
# =============================================================================

class OutbreakAlertResponse(BaseModel):
    id: int
    title: str
    disease: str
    target_group: str
    village: str
    severity: str
    description: str
    precautions: Optional[str]
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True
