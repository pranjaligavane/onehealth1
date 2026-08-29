from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List
from backend.database import get_db
from backend.models import Case, OutbreakAlert
from backend.schemas import OutbreakAlertResponse

router = APIRouter(prefix="/api/analytics", tags=["Analytics & Surveillance"])

@router.get("/summary")
def get_analytics_summary(db: Session = Depends(get_db)):
    total_cases = db.query(Case).count()
    human_cases = db.query(Case).filter(Case.case_type == "human_general").count()
    child_cases = db.query(Case).filter(Case.case_type == "child_development").count()
    livestock_cases = db.query(Case).filter(Case.case_type == "livestock").count()
    
    red_risk = db.query(Case).filter(Case.risk_level == "RED").count()
    orange_risk = db.query(Case).filter(Case.risk_level == "ORANGE").count()
    yellow_risk = db.query(Case).filter(Case.risk_level == "YELLOW").count()
    green_risk = db.query(Case).filter(Case.risk_level == "GREEN").count()
    
    # Village distribution
    village_stats = db.query(
        Case.village, func.count(Case.id).label("count")
    ).group_by(Case.village).all()
    
    # Top conditions
    condition_stats = db.query(
        Case.primary_condition, func.count(Case.id).label("count")
    ).filter(Case.primary_condition != None).group_by(Case.primary_condition).order_by(func.count(Case.id).desc()).limit(8).all()
    
    return {
        "total_screenings": total_cases,
        "by_category": {
            "human_general": human_cases,
            "child_development": child_cases,
            "livestock": livestock_cases
        },
        "by_risk": {
            "RED": red_risk,
            "ORANGE": orange_risk,
            "YELLOW": yellow_risk,
            "GREEN": green_risk
        },
        "village_distribution": [{"village": v, "count": c} for v, c in village_stats],
        "top_conditions": [{"condition": cond, "count": c} for cond, c in condition_stats]
    }

@router.get("/alerts", response_model=List[OutbreakAlertResponse])
def get_active_outbreak_alerts(db: Session = Depends(get_db)):
    return db.query(OutbreakAlert).filter(OutbreakAlert.is_active == True).order_by(OutbreakAlert.created_at.desc()).all()
