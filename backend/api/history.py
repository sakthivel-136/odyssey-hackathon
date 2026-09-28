from fastapi import APIRouter, Depends
from database import get_supabase
from api.auth import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/history", tags=["History"])

@router.get("")
def get_history(user = Depends(get_current_user)):
    supabase = get_supabase()
    
    # 1. Get user's devices
    dev_res = supabase.table("devices").select("id").eq("owner_id", user.id).execute()
    device_ids = [str(d["id"]) for d in dev_res.data]
    
    if not device_ids:
        return {"events": []}
        
    # 2. Get dose events ordered by latest
    events_res = supabase.table("dose_events").select(
        "*, schedules(*, schedule_items(*, medicines(*))), devices(device_name)"
    ).in_("device_id", device_ids).order("created_at", desc=True).limit(50).execute()
    
    formatted = []
    for ev in events_res.data:
        sched = ev.get("schedules") or {}
        items = sched.get("schedule_items") or []
        med_name = "Prescription Dose"
        strength = ""
        dosage_qty = 1
        comp_num = 1
        
        if items:
            med_info = items[0].get("medicines") or {}
            med_name = med_info.get("name", "Prescription Dose")
            strength = med_info.get("strength", "")
            dosage_qty = items[0].get("dose_quantity", 1)
            
        formatted.append({
            "id": ev.get("id"),
            "event_date": ev.get("event_date"),
            "scheduled_time": ev.get("scheduled_time"),
            "taken_time": ev.get("taken_time"),
            "status": ev.get("status"), # COMPLETED, MISSED, IN_PROGRESS
            "medicine_name": med_name,
            "strength": strength,
            "dose_quantity": dosage_qty,
            "device_name": (ev.get("devices") or {}).get("device_name", "Odyssey Medibox"),
            "created_at": ev.get("created_at")
        })
        
    return {"events": formatted}
