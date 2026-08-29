"""
ONEHEALTH AI — Auth Router
Handles user registration, login, profile management via Supabase Auth.
"""

import os
import uuid
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User, DoctorProfile
from backend.schemas import (
    UserRegister, UserLogin, UserProfileUpdate,
    UserProfileResponse, AuthResponse
)

router = APIRouter(prefix="/api/auth", tags=["Auth"])

# ---------------------------------------------------------------------------
# Supabase Admin helpers (uses Service Role Key for admin operations)
# ---------------------------------------------------------------------------

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_KEY", "")


def _supabase_headers(use_service_key: bool = True) -> dict:
    key = SUPABASE_SERVICE_KEY if use_service_key else os.getenv("SUPABASE_ANON_KEY", SUPABASE_SERVICE_KEY)
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }


# ---------------------------------------------------------------------------
# POST /api/auth/register
# ---------------------------------------------------------------------------
@router.post("/register", response_model=AuthResponse, status_code=201)
async def register(payload: UserRegister, db: Session = Depends(get_db)):
    """
    Register a new patient or doctor/vet account.

    - Creates a Supabase Auth account with role metadata.
    - Upserts corresponding row in public.users.
    - If role is doctor/vet, upserts a doctor_profiles entry.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(
            status_code=503,
            detail="Supabase is not configured on this server. Set SUPABASE_URL and SUPABASE_KEY."
        )

    meta = {
        "name": payload.name,
        "role": payload.role,
        "phone": payload.phone or "",
        "village": payload.village or "Kopargaon",
        "specialization": payload.specialization or "",
        "medical_reg_no": payload.medical_reg_no or "",
    }
    if payload.role in ("doctor", "vet"):
        meta.update({
            "clinic_name": payload.clinic_name or f"{payload.name} Clinic",
            "consultation_fee": payload.consultation_fee or "₹100",
            "opd_timings": payload.opd_timings or "Mon-Sat 9am-5pm",
            "address": payload.address or payload.village or "Kopargaon",
        })

    # 1. Create Supabase Auth user via Admin API
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{SUPABASE_URL}/auth/v1/admin/users",
            headers=_supabase_headers(),
            json={
                "email": payload.email,
                "password": payload.password,
                "email_confirm": True,          # Auto-confirm for immediate access
                "user_metadata": meta,
            },
            timeout=10.0
        )

    if resp.status_code not in (200, 201):
        err = resp.json()
        raise HTTPException(
            status_code=400,
            detail=err.get("message", err.get("error_description", "Registration failed"))
        )

    supabase_user = resp.json()
    auth_id = supabase_user.get("id") or str(uuid.uuid4())

    # 2. Upsert into local public.users table (for offline / SQLite fallback)
    db_user = db.query(User).filter(User.id == auth_id).first()
    if not db_user:
        db_user = User(
            id=auth_id,
            email=payload.email,
            name=payload.name,
            role=payload.role,
            village=payload.village,
            phone=payload.phone,
            specialization=payload.specialization,
            medical_reg_no=payload.medical_reg_no,
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)

    # 3. If doctor/vet — upsert doctor_profiles
    if payload.role in ("doctor", "vet"):
        existing = db.query(DoctorProfile).filter(DoctorProfile.user_id == auth_id).first()
        if not existing:
            prefix = "VET-" if payload.role == "vet" else "DOC-"
            doc_id = prefix + str(uuid.uuid4())[:6].upper()
            dp = DoctorProfile(
                id=doc_id,
                user_id=auth_id,
                role=payload.role,
                name=payload.name,
                title="BVSc" if payload.role == "vet" else "MBBS",
                medical_reg_no=payload.medical_reg_no,
                education=payload.specialization or ("Veterinary Medicine" if payload.role == "vet" else "MBBS General Medicine"),
                specialization=payload.specialization,
                consultation_fee=payload.consultation_fee or "₹100",
                clinic_name=payload.clinic_name or f"{payload.name} Clinic",
                village=payload.village or "Kopargaon",
                address=payload.address or payload.village or "Kopargaon",
                phone=payload.phone or "",
                opd_timings=payload.opd_timings or "Mon-Sat 9am-5pm",
                verified=False,  # Pending admin review
            )
            db.add(dp)
            db.commit()

    user_profile = UserProfileResponse(
        id=db_user.id,
        email=db_user.email,
        name=db_user.name,
        role=db_user.role,
        village=db_user.village,
        phone=db_user.phone,
        specialization=db_user.specialization,
        medical_reg_no=db_user.medical_reg_no,
        created_at=db_user.created_at,
    )

    return AuthResponse(
        access_token=supabase_user.get("access_token"),
        user=user_profile,
        message="Account created successfully"
    )


# ---------------------------------------------------------------------------
# POST /api/auth/login
# ---------------------------------------------------------------------------
@router.post("/login", response_model=AuthResponse)
async def login(payload: UserLogin, db: Session = Depends(get_db)):
    """Authenticate with email and password, return session token."""
    if not SUPABASE_URL:
        raise HTTPException(status_code=503, detail="Supabase not configured")

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers=_supabase_headers(),
            json={"email": payload.email, "password": payload.password},
            timeout=10.0
        )

    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    data = resp.json()
    access_token = data.get("access_token")
    supabase_user_data = data.get("user", {})
    auth_id = supabase_user_data.get("id")

    # Fetch or create local user record
    db_user = None
    if auth_id:
        db_user = db.query(User).filter(User.id == auth_id).first()
        if not db_user:
            meta = supabase_user_data.get("user_metadata", {})
            db_user = User(
                id=auth_id,
                email=payload.email,
                name=meta.get("name", payload.email.split("@")[0]),
                role=meta.get("role", "patient"),
                village=meta.get("village", "Kopargaon"),
                phone=meta.get("phone"),
                specialization=meta.get("specialization"),
                medical_reg_no=meta.get("medical_reg_no"),
            )
            db.add(db_user)
            db.commit()
            db.refresh(db_user)

    user_profile = UserProfileResponse(
        id=db_user.id if db_user else auth_id,
        email=db_user.email if db_user else payload.email,
        name=db_user.name if db_user else payload.email.split("@")[0],
        role=db_user.role if db_user else "patient",
        village=db_user.village if db_user else "Kopargaon",
        phone=db_user.phone if db_user else None,
        specialization=db_user.specialization if db_user else None,
        medical_reg_no=db_user.medical_reg_no if db_user else None,
        created_at=db_user.created_at if db_user else None,
    ) if (db_user or auth_id) else None

    return AuthResponse(
        access_token=access_token,
        user=user_profile,
        message="Login successful"
    )


# ---------------------------------------------------------------------------
# GET /api/auth/me
# ---------------------------------------------------------------------------
@router.get("/me", response_model=UserProfileResponse)
async def get_me(user_id: str, db: Session = Depends(get_db)):
    """
    Fetch a user's profile by their Supabase auth UUID.
    Pass ?user_id=<uuid> in the query string.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ---------------------------------------------------------------------------
# PUT /api/auth/profile
# ---------------------------------------------------------------------------
@router.put("/profile/{user_id}", response_model=UserProfileResponse)
async def update_profile(
    user_id: str,
    payload: UserProfileUpdate,
    db: Session = Depends(get_db)
):
    """Update a user's profile fields."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user
