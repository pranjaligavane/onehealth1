import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Case, ClinicalReview, OutbreakAlert, SyncLog
from backend.schemas import BatchSyncPayload, BatchSyncResponse, CaseResponse

router = APIRouter(prefix="/api/sync", tags=["Sync"])

@router.post("/batch", response_model=BatchSyncResponse)
def batch_sync(payload: BatchSyncPayload, db: Session = Depends(get_db)):
    synced_case_ids = []
    synced_review_ids = []
    
    # 1. Process client cases
    for case_item in payload.cases:
        existing = db.query(Case).filter(Case.id == case_item.id).first()
        data = case_item.model_dump()
        data["is_synced"] = True
        data["server_synced_at"] = datetime.datetime.utcnow()
        
        if existing:
            # Update fields if client record is newer or has updates
            for key, val in data.items():
                setattr(existing, key, val)
        else:
            new_case = Case(**data)
            db.add(new_case)
        synced_case_ids.append(case_item.id)
        
    # 2. Process clinical reviews
    for rev in payload.reviews:
        existing_rev = db.query(ClinicalReview).filter(
            ClinicalReview.case_id == rev.case_id,
            ClinicalReview.reviewer_name == rev.reviewer_name
        ).first()
        if not existing_rev:
            new_review = ClinicalReview(**rev.model_dump())
            db.add(new_review)
            
            # Update case status if escalated or reviewed
            c = db.query(Case).filter(Case.id == rev.case_id).first()
            if c:
                c.status = "reviewed" if not rev.is_urgent_referral else "escalated"
                if rev.verified_risk_level:
                    c.risk_level = rev.verified_risk_level
            db.commit()
            if hasattr(new_review, 'id') and new_review.id:
                synced_review_ids.append(new_review.id)
    
    db.commit()
    
    # 3. Log the sync event
    sync_log = SyncLog(
        client_device_id=payload.device_id,
        sync_count=len(synced_case_ids),
        status="success",
        details={"cases_synced": len(synced_case_ids), "reviews_synced": len(synced_review_ids)}
    )
    db.add(sync_log)
    db.commit()
    
    # 4. Fetch server updates since last sync timestamp (or last 100 cases)
    query = db.query(Case)
    if payload.last_sync_timestamp:
        query = query.filter(Case.server_synced_at > payload.last_sync_timestamp)
    else:
        query = query.order_by(Case.server_synced_at.desc()).limit(50)
    server_updates = query.all()
    
    # 5. Fetch active outbreak alerts
    active_alerts = db.query(OutbreakAlert).filter(OutbreakAlert.is_active == True).all()
    alerts_data = [
        {
            "id": a.id,
            "title": a.title,
            "disease": a.disease,
            "target_group": a.target_group,
            "village": a.village,
            "severity": a.severity,
            "description": a.description,
            "precautions": a.precautions,
            "created_at": a.created_at.isoformat()
        }
        for a in active_alerts
    ]
    
    return BatchSyncResponse(
        synced_case_ids=synced_case_ids,
        synced_review_ids=synced_review_ids,
        server_updates=[CaseResponse.model_validate(c) for c in server_updates],
        server_timestamp=datetime.datetime.utcnow(),
        active_alerts=alerts_data
    )

@router.get("/status")
def get_sync_status(db: Session = Depends(get_db)):
    total_cases = db.query(Case).count()
    total_reviews = db.query(ClinicalReview).count()
    last_sync = db.query(SyncLog).order_by(SyncLog.synced_at.desc()).first()
    return {
        "status": "online",
        "server_time": datetime.datetime.utcnow().isoformat(),
        "total_cases": total_cases,
        "total_reviews": total_reviews,
        "last_sync": last_sync.synced_at.isoformat() if last_sync else None
    }
