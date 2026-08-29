from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.database import get_db
from backend.models import ClinicalKnowledge

router = APIRouter(prefix="/api/knowledge", tags=["Clinical Knowledge Base (EkaCare BODHI-S)"])

@router.get("/search")
def search_knowledge(
    q: str = Query(..., description="Symptom or condition query string"),
    limit: int = 20,
    db: Session = Depends(get_db)
):
    query_str = f"%{q}%"
    results = db.query(ClinicalKnowledge).filter(
        (ClinicalKnowledge.symptom.ilike(query_str)) |
        (ClinicalKnowledge.raw_symptom_text.ilike(query_str)) |
        (ClinicalKnowledge.condition.ilike(query_str))
    ).limit(limit).all()

    return [
        {
            "id": r.id,
            "symptom": r.symptom,
            "raw_symptom_text": r.raw_symptom_text,
            "condition": r.condition,
            "attributes": r.attributes,
            "source": r.source
        }
        for r in results
    ]

@router.get("/conditions")
def get_all_conditions(db: Session = Depends(get_db)):
    conditions = db.query(ClinicalKnowledge.condition).distinct().all()
    return [c[0] for c in conditions]
