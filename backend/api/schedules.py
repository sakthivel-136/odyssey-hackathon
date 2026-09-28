from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from database import get_supabase
from api.auth import get_current_user

router = APIRouter(prefix="/api/schedules", tags=["Schedules"])

# ─────────────────────────────────────────
# Old request model (kept for compatibility)
# ─────────────────────────────────────────
class ScheduleItemReq(BaseModel):
    compartment_id: str
    medicine_id: Optional[str] = None
    dose_quantity: int
    step_order: int

class ScheduleCreateReq(BaseModel):
    device_id: str
    schedule_time: str  # HH:MM:SS
    grace_period_minutes: int = 30
    items: Optional[List[ScheduleItemReq]] = None

# ─────────────────────────────────────────
# New medicine-first request model
# ─────────────────────────────────────────
class MedicineItem(BaseModel):
    medicine_id: str
    dose_quantity: int = 1

class ScheduleCreateByMedicineReq(BaseModel):
    device_id: str
    schedule_time: str  # HH:MM
    medicines: List[MedicineItem]  # medicines by ID, in order


@router.get("")
def get_schedules(user = Depends(get_current_user)):
    supabase = get_supabase()
    res = supabase.table("schedules").select(
        "*, schedule_items(*, compartments(*), medicines(*))"
    ).eq("user_id", user.id).order("schedule_time").execute()
    return res.data


@router.post("")
def create_schedule(req: dict, user = Depends(get_current_user)):
    """
    Accepts both old (compartment-based items[]) and new (medicine-based medicines[]) formats.
    New format: { device_id, schedule_time, medicines: [{medicine_id, dose_quantity}] }
    Old format: { device_id, schedule_time, items: [{compartment_id, ...}] }
    """
    supabase = get_supabase()

    device_id = req.get("device_id")
    schedule_time = req.get("schedule_time", "")
    medicines_list = req.get("medicines")  # New format
    items_list = req.get("items")          # Old format

    # Ensure HH:MM:SS
    if len(schedule_time) == 5:
        schedule_time = schedule_time + ":00"

    # Verify device ownership
    dev_res = supabase.table("devices").select("*").eq("owner_id", user.id).eq("id", device_id).execute()
    if not dev_res.data:
        raise HTTPException(status_code=403, detail="Not authorized for this device")

    # ─────────────────────────────────────────
    # NEW FORMAT: medicines[] → resolve compartments
    # ─────────────────────────────────────────
    if medicines_list:
        final_items = []
        for idx, med_item in enumerate(medicines_list):
            med_id = med_item.get("medicine_id")
            dose_qty = med_item.get("dose_quantity", 1)

            # Look up which compartment this medicine is assigned to
            comp_res = supabase.table("medicine_compartments").select(
                "compartment_id, compartments(id, compartment_number, device_id)"
            ).eq("medicine_id", med_id).execute()

            if not comp_res.data:
                med_name_res = supabase.table("medicines").select("name").eq("id", med_id).execute()
                med_name = med_name_res.data[0]["name"] if med_name_res.data else med_id
                raise HTTPException(
                    status_code=400,
                    detail=f"Medicine '{med_name}' is not assigned to any compartment. Please assign it first in the Medicines page."
                )

            compartment_id = comp_res.data[0]["compartment_id"]
            final_items.append({
                "compartment_id": compartment_id,
                "medicine_id": med_id,
                "dose_quantity": dose_qty,
                "step_order": idx + 1
            })

        # Create schedule
        sched_res = supabase.table("schedules").insert({
            "user_id": user.id,
            "device_id": device_id,
            "schedule_time": schedule_time,
            "grace_period_minutes": 30,
            "is_active": True
        }).execute()

        if not sched_res.data:
            raise HTTPException(status_code=500, detail="Failed to create schedule")

        schedule_id = sched_res.data[0]["id"]

        for item in final_items:
            supabase.table("schedule_items").insert({
                "schedule_id": schedule_id,
                **item
            }).execute()

        return {"message": "Schedule created successfully", "schedule_id": schedule_id}

    # ─────────────────────────────────────────
    # OLD FORMAT: items[] with compartment_id
    # ─────────────────────────────────────────
    elif items_list:
        if not items_list:
            raise HTTPException(status_code=400, detail="Schedule must have at least one step")

        sched_res = supabase.table("schedules").insert({
            "user_id": user.id,
            "device_id": device_id,
            "schedule_time": schedule_time,
            "grace_period_minutes": req.get("grace_period_minutes", 30),
            "is_active": True
        }).execute()

        if not sched_res.data:
            raise HTTPException(status_code=500, detail="Failed to create schedule")

        schedule_id = sched_res.data[0]["id"]

        for item in items_list:
            supabase.table("schedule_items").insert({
                "schedule_id": schedule_id,
                "compartment_id": item["compartment_id"],
                "medicine_id": item.get("medicine_id"),
                "dose_quantity": item.get("dose_quantity", 1),
                "step_order": item.get("step_order", 1)
            }).execute()

        return {"message": "Schedule created successfully", "schedule_id": schedule_id}

    else:
        raise HTTPException(status_code=400, detail="Provide either 'medicines' or 'items' in request body")


@router.delete("/{schedule_id}")
def delete_schedule(schedule_id: str, user = Depends(get_current_user)):
    supabase = get_supabase()

    res = supabase.table("schedules").select("user_id").eq("id", schedule_id).execute()
    if not res.data or res.data[0]["user_id"] != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    supabase.table("schedule_items").delete().eq("schedule_id", schedule_id).execute()
    supabase.table("schedules").delete().eq("id", schedule_id).execute()
    return {"message": "Schedule deleted"}
