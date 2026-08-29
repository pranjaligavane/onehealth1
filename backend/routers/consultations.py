import time
from fastapi import APIRouter, Body, HTTPException, Query
from typing import Dict, Any, List

router = APIRouter(prefix="/api/consultations", tags=["WebRTC Cross-Device Video Signaling"])

# In-memory signaling room exchange with automatic expiry
SIGNALING_ROOMS: Dict[str, Dict[str, Any]] = {}

@router.post("/create-room")
def create_or_join_room(payload: Dict[str, Any] = Body(...)):
    room_id = payload.get("room_id") or f"ROOM-{int(time.time()*1000)}"
    user_type = payload.get("user_type", "patient") # "patient" or "doctor"
    doctor_id = payload.get("doctor_id")
    case_id = payload.get("case_id")
    
    if room_id not in SIGNALING_ROOMS:
        SIGNALING_ROOMS[room_id] = {
            "room_id": room_id,
            "created_at": time.time(),
            "doctor_id": doctor_id,
            "case_id": case_id,
            "patient_signals": [],
            "doctor_signals": [],
            "status": "waiting"
        }
    
    room = SIGNALING_ROOMS[room_id]
    room["status"] = "active"
    return {"success": True, "room_id": room_id, "room": room}

@router.post("/signal")
def post_signal(payload: Dict[str, Any] = Body(...)):
    room_id = payload.get("room_id")
    sender = payload.get("sender") # "patient" or "doctor"
    signal_type = payload.get("type") # "offer", "answer", "candidate", "end_call"
    data = payload.get("data")
    
    if not room_id or room_id not in SIGNALING_ROOMS:
        # Auto-create if not present
        SIGNALING_ROOMS[room_id] = {
            "room_id": room_id,
            "created_at": time.time(),
            "patient_signals": [],
            "doctor_signals": [],
            "status": "active"
        }
    
    room = SIGNALING_ROOMS[room_id]
    target_queue = room["doctor_signals"] if sender == "patient" else room["patient_signals"]
    
    target_queue.append({
        "sender": sender,
        "type": signal_type,
        "data": data,
        "timestamp": time.time()
    })
    
    return {"success": True, "queued": len(target_queue)}

@router.get("/signals/{room_id}")
def get_signals(room_id: str, recipient: str = Query(..., description="patient or doctor")):
    if room_id not in SIGNALING_ROOMS:
        return {"signals": []}
        
    room = SIGNALING_ROOMS[room_id]
    queue_name = "patient_signals" if recipient == "patient" else "doctor_signals"
    signals = list(room[queue_name])
    
    # Clear after retrieving
    room[queue_name].clear()
    
    return {"signals": signals, "room_status": room.get("status", "active")}

@router.post("/end-call")
def end_call(payload: Dict[str, Any] = Body(...)):
    room_id = payload.get("room_id")
    if room_id in SIGNALING_ROOMS:
        SIGNALING_ROOMS[room_id]["status"] = "ended"
        # Notify peers
        SIGNALING_ROOMS[room_id]["patient_signals"].append({"type": "end_call", "timestamp": time.time()})
        SIGNALING_ROOMS[room_id]["doctor_signals"].append({"type": "end_call", "timestamp": time.time()})
    return {"success": True}
