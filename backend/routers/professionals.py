from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from backend.database import get_db
from backend.models import Case, ClinicalReview, User, DoctorProfile
from backend.schemas import ClinicalReviewCreate, ClinicalReviewResponse, CaseResponse

router = APIRouter(prefix="/api/professionals", tags=["Professional Portal"])

@router.get("/directory")
def get_doctors_directory(
    role: Optional[str] = Query(None, description="doctor or vet"),
    village: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(DoctorProfile)
    if role:
        query = query.filter(DoctorProfile.role == role)
    if village:
        query = query.filter(DoctorProfile.village.ilike(f"%{village}%"))
        
    doctors = query.all()
    return [
        {
            "id": d.id,
            "role": d.role,
            "name": d.name,
            "title": d.title,
            "medical_reg_no": d.medical_reg_no,
            "education": d.education,
            "experience_years": d.experience_years,
            "specialization": d.specialization,
            "consultation_fee": d.consultation_fee,
            "clinic_name": d.clinic_name,
            "village": d.village,
            "pincode": d.pincode,
            "address": d.address,
            "phone": d.phone,
            "whatsapp": d.whatsapp,
            "opd_timings": d.opd_timings,
            "languages": d.languages,
            "facilities": d.facilities,
            "coordinates": {"lat": d.lat, "lng": d.lng} if d.lat and d.lng else None,
            "availability_state": d.availability_state or "AVAILABLE",
            "last_status_time": d.last_status_time or "Live",
            "verified": d.verified
        }
        for d in doctors
    ]

@router.post("/profile")
def save_or_update_doctor_profile(
    profile_data: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    doc_id = profile_data.get("id") or f"DOC-{int(profile_data.get('phone', '123')[-4:]):04d}"
    
    doc = db.query(DoctorProfile).filter(
        (DoctorProfile.id == doc_id) | 
        (DoctorProfile.phone == profile_data.get("phone"))
    ).first()

    coords = profile_data.get("coordinates") or {}
    lat = coords.get("lat") or profile_data.get("lat")
    lng = coords.get("lng") or profile_data.get("lng")

    if doc:
        # Update existing
        doc.role = profile_data.get("role", doc.role)
        doc.name = profile_data.get("name", doc.name)
        doc.title = profile_data.get("title", doc.title)
        doc.medical_reg_no = profile_data.get("medical_reg_no", doc.medical_reg_no)
        doc.education = profile_data.get("education", doc.education)
        doc.experience_years = int(profile_data.get("experience_years", doc.experience_years or 5))
        doc.specialization = profile_data.get("specialization", doc.specialization)
        doc.consultation_fee = profile_data.get("consultation_fee", doc.consultation_fee)
        doc.clinic_name = profile_data.get("clinic_name", doc.clinic_name)
        doc.village = profile_data.get("village", doc.village)
        doc.pincode = profile_data.get("pincode", doc.pincode)
        doc.address = profile_data.get("address", doc.address)
        doc.phone = profile_data.get("phone", doc.phone)
        doc.whatsapp = profile_data.get("whatsapp", doc.whatsapp)
        doc.opd_timings = profile_data.get("opd_timings", doc.opd_timings)
        doc.languages = profile_data.get("languages", doc.languages)
        doc.facilities = profile_data.get("facilities", doc.facilities)
        if lat is not None and lng is not None:
            doc.lat = float(lat)
            doc.lng = float(lng)
        doc.availability_state = profile_data.get("availability_state", doc.availability_state)
        doc.last_status_time = profile_data.get("last_status_time", doc.last_status_time)
        doc.verified = True
    else:
        # Create new
        doc = DoctorProfile(
            id=doc_id,
            role=profile_data.get("role", "doctor"),
            name=profile_data.get("name", ""),
            title=profile_data.get("title", ""),
            medical_reg_no=profile_data.get("medical_reg_no"),
            education=profile_data.get("education", ""),
            experience_years=int(profile_data.get("experience_years", 5)),
            specialization=profile_data.get("specialization", ""),
            consultation_fee=profile_data.get("consultation_fee", "Free / Standard"),
            clinic_name=profile_data.get("clinic_name", ""),
            village=profile_data.get("village", "Kopargaon"),
            pincode=profile_data.get("pincode", "423601"),
            address=profile_data.get("address", ""),
            phone=profile_data.get("phone", ""),
            whatsapp=profile_data.get("whatsapp"),
            opd_timings=profile_data.get("opd_timings", "9:00 AM - 1:00 PM, 5:00 PM - 8:00 PM"),
            languages=profile_data.get("languages", "Marathi, Hindi, English"),
            facilities=profile_data.get("facilities", ""),
            lat=float(lat) if lat is not None else 19.8824,
            lng=float(lng) if lng is not None else 74.4789,
            availability_state=profile_data.get("availability_state", "AVAILABLE"),
            last_status_time="Just now",
            verified=True
        )
        db.add(doc)

    db.commit()
    db.refresh(doc)
    return {"success": True, "message": "Doctor profile saved and published globally across all devices", "profile": profile_data}

@router.get("/queue", response_model=List[CaseResponse])
def get_triage_queue(
    role: str = Query("doctor", description="doctor or vet"),
    status: Optional[str] = Query(None, description="screened, escalated, reviewed"),
    village: Optional[str] = Query(None),
    min_risk: Optional[str] = Query(None, description="ORANGE, RED, etc."),
    db: Session = Depends(get_db)
):
    query = db.query(Case)
    
    # Filter based on role specialization
    if role == "doctor":
        query = query.filter(Case.case_type.in_(["human_general", "child_development"]))
    elif role == "vet":
        query = query.filter(Case.case_type == "livestock")
        
    if status:
        query = query.filter(Case.status == status)
    if village:
        query = query.filter(Case.village.ilike(f"%{village}%"))
    if min_risk:
        if min_risk == "RED":
            query = query.filter(Case.risk_level == "RED")
        elif min_risk == "ORANGE":
            query = query.filter(Case.risk_level.in_(["ORANGE", "RED"]))
        elif min_risk == "YELLOW":
            query = query.filter(Case.risk_level.in_(["YELLOW", "ORANGE", "RED"]))
            
    # Sort with highest risk first (RED -> ORANGE -> YELLOW -> GREEN)
    cases = query.all()
    risk_weights = {"RED": 4, "ORANGE": 3, "YELLOW": 2, "GREEN": 1}
    cases.sort(key=lambda c: (risk_weights.get(c.risk_level, 0), c.client_created_at), reverse=True)
    return cases

@router.post("/review", response_model=ClinicalReviewResponse)
def submit_clinical_review(review: ClinicalReviewCreate, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == review.case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    new_review = ClinicalReview(**review.model_dump())
    db.add(new_review)
    
    # Update case status and risk level
    case.status = "reviewed" if not review.is_urgent_referral else "escalated"
    if review.verified_risk_level:
        case.risk_level = review.verified_risk_level
        
    db.commit()
    db.refresh(new_review)
    return new_review

@router.get("/reviews/{case_id}", response_model=List[ClinicalReviewResponse])
def get_case_reviews(case_id: str, db: Session = Depends(get_db)):
    reviews = db.query(ClinicalReview).filter(ClinicalReview.case_id == case_id).all()
    return reviews
