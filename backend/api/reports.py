from fastapi import APIRouter, Depends
from database import get_supabase
from api.auth import get_current_user

router = APIRouter(prefix="/api/reports", tags=["Reports"])

@router.get("/adherence")
def get_adherence_report(user = Depends(get_current_user)):
    supabase = get_supabase()
    
    # Get user's devices
    dev_res = supabase.table("devices").select("id").eq("owner_id", user.id).execute()
    device_ids = [str(d["id"]) for d in dev_res.data]
    
    if not device_ids:
        return {"total": 0, "missed": 0, "uptime": 100}
        
    # Get total and missed doses
    res = supabase.table("dose_events").select("*").in_("device_id", device_ids).execute()
    events = res.data
    
    total = len(events)
    missed = len([e for e in events if e.get("status") == "MISSED"])
    
    return {
        "total": total,
        "missed": missed,
        "uptime": 99.8 # Simulated uptime for hackathon demo
    }
