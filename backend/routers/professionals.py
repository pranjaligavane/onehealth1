from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.database import get_db
from backend.models import Case, ClinicalReview, User
from backend.schemas import ClinicalReviewCreate, ClinicalReviewResponse, CaseResponse

router = APIRouter(prefix="/api/professionals", tags=["Professional Portal"])

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
