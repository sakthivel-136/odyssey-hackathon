from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from database import get_supabase
from api.auth import get_current_user

router = APIRouter(prefix="/api/schedules", tags=["Schedules"])

class ScheduleItemReq(BaseModel):
    compartment_id: str
    medicine_id: Optional[str] = None
    dose_quantity: int
    step_order: int

class ScheduleCreateReq(BaseModel):
    device_id: str
    schedule_time: str # Format HH:MM:SS
    grace_period_minutes: int = 30
    items: List[ScheduleItemReq]

@router.get("")
def get_schedules(user = Depends(get_current_user)):
    supabase = get_supabase()
    res = supabase.table("schedules").select("*, schedule_items(*, compartments(*), medicines(*))").eq("user_id", user.id).execute()
    return res.data

@router.post("")
def create_schedule(req: ScheduleCreateReq, user = Depends(get_current_user)):
    supabase = get_supabase()
    
    # Check device ownership
    dev_res = supabase.table("devices").select("*").eq("owner_id", user.id).eq("id", req.device_id).execute()
    if not dev_res.data:
        raise HTTPException(status_code=403, detail="Not authorized for this device")
        
    # Validate items exist
    if not req.items:
        raise HTTPException(status_code=400, detail="Schedule must have at least one compartment step")
        
    # Insert schedule
    sched_res = supabase.table("schedules").insert({
        "user_id": user.id,
        "device_id": req.device_id,
        "schedule_time": req.schedule_time,
        "grace_period_minutes": req.grace_period_minutes,
        "is_active": True
    }).execute()
    
    if not sched_res.data:
        raise HTTPException(status_code=500, detail="Failed to create schedule")
        
    schedule_id = sched_res.data[0]["id"]
    
    # Insert items
    for item in req.items:
        supabase.table("schedule_items").insert({
            "schedule_id": schedule_id,
            "compartment_id": item.compartment_id,
            "medicine_id": item.medicine_id,
            "dose_quantity": item.dose_quantity,
            "step_order": item.step_order
        }).execute()
        
    return {"message": "Schedule created successfully", "schedule_id": schedule_id}

@router.delete("/{schedule_id}")
def delete_schedule(schedule_id: str, user = Depends(get_current_user)):
    supabase = get_supabase()
    
    # Check ownership
    res = supabase.table("schedules").select("user_id").eq("id", schedule_id).execute()
    if not res.data or res.data[0]["user_id"] != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    supabase.table("schedules").delete().eq("id", schedule_id).execute()
    return {"message": "Schedule deleted"}
