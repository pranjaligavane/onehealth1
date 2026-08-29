from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.database import get_db
from backend.models import Case, ClinicalReview
from backend.schemas import CaseCreate, CaseResponse

router = APIRouter(prefix="/api/cases", tags=["Cases"])

@router.get("/", response_model=List[CaseResponse])
def get_cases(
    case_type: Optional[str] = Query(None, description="Filter by case type: human_general, child_development, livestock"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level: GREEN, YELLOW, ORANGE, RED"),
    village: Optional[str] = Query(None, description="Filter by village name"),
    search: Optional[str] = Query(None, description="Search subject name, tag, phone"),
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(Case)
    if case_type:
        query = query.filter(Case.case_type == case_type)
    if risk_level:
        query = query.filter(Case.risk_level == risk_level)
    if village:
        query = query.filter(Case.village.ilike(f"%{village}%"))
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Case.subject_name.ilike(search_filter)) |
            (Case.tag_or_id.ilike(search_filter)) |
            (Case.contact_phone.ilike(search_filter)) |
            (Case.primary_condition.ilike(search_filter))
        )
    return query.order_by(Case.client_created_at.desc()).limit(limit).all()

@router.get("/{case_id}", response_model=CaseResponse)
def get_case(case_id: str, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case

@router.post("/", response_model=CaseResponse)
def create_or_update_case(payload: CaseCreate, db: Session = Depends(get_db)):
    existing = db.query(Case).filter(Case.id == payload.id).first()
    if existing:
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(existing, field, value)
        db.commit()
        db.refresh(existing)
        return existing
    
    new_case = Case(**payload.model_dump())
    db.add(new_case)
    db.commit()
    db.refresh(new_case)
    return new_case

@router.delete("/{case_id}")
def delete_case(case_id: str, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    db.delete(case)
    db.commit()
    return {"status": "success", "message": f"Case {case_id} deleted"}
