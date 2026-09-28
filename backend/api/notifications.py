from fastapi import APIRouter, Depends
from pydantic import BaseModel
from database import get_supabase
from api.auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("")
def get_unread_notifications(user = Depends(get_current_user)):
    supabase = get_supabase()
    
    # 1. Try DB notifications table
    try:
        res = supabase.table("notifications").select("*").eq("user_id", user.id).eq("is_read", False).order("created_at", desc=True).execute()
        if res.data:
            return res.data
    except Exception as e:
        pass

    # 2. Dynamic Real-Data Notification Generator (Fallback)
    dev_res = supabase.table("devices").select("id").eq("owner_id", user.id).execute()
    device_ids = [str(d["id"]) for d in dev_res.data]
    
    if not device_ids:
        return []

    notifications = []
    
    events_res = supabase.table("dose_events").select(
        "*, schedules(*, schedule_items(*, medicines(*))), medicines(name)"
    ).in_("device_id", device_ids).order("created_at", desc=True).limit(10).execute()
    
    for ev in events_res.data or []:
        st = ev.get("status")
        created_at = ev.get("created_at") or ""
        time_str = ev.get("scheduled_time") or "Scheduled Time"
        
        sched = ev.get("schedules") or {}
        items = sched.get("schedule_items") or []
        med_name = "Vicks 500mg"
        if items and items[0].get("medicines"):
            med_name = items[0]["medicines"].get("name", med_name)
        elif ev.get("medicines"):
            med_name = ev["medicines"].get("name", med_name)

        if st == "MISSED":
            notifications.append({
                "id": f"notif_missed_{ev['id']}",
                "title": "🚨 MISSED DOSE ALERT!",
                "message": f"{med_name} dose was missed at {time_str}! Emergency Twilio call dispatched to phone.",
                "type": "error",
                "is_read": False,
                "created_at": created_at
            })
        elif st == "COMPLETED":
            notifications.append({
                "id": f"notif_taken_{ev['id']}",
                "title": "✓ Dose Verified & Taken",
                "message": f"{med_name} dose was taken at {time_str} and verified by IR sensor.",
                "type": "success",
                "is_read": False,
                "created_at": created_at
            })
        elif st == "IN_PROGRESS":
            notifications.append({
                "id": f"notif_start_{ev['id']}",
                "title": "⏰ Schedule Started",
                "message": f"Compartment lid opened for {med_name} at {time_str}. Please take your dose now.",
                "type": "info",
                "is_read": False,
                "created_at": created_at
            })

    meds_res = supabase.table("medicines").select("*").eq("user_id", user.id).execute()
    for m in meds_res.data or []:
        stock = m.get("stock_quantity", 0)
        thresh = m.get("low_stock_threshold", 10)
        if stock <= thresh:
            notifications.append({
                "id": f"notif_stock_{m['id']}",
                "title": "⚠️ Low Stock Alert",
                "message": f"{m['name']} stock is down to {stock} tablets. Please schedule a refill.",
                "type": "warning",
                "is_read": False,
                "created_at": m.get("created_at")
            })

    return notifications

class MarkReadReq(BaseModel):
    notification_ids: list[str]

@router.post("/mark-read")
def mark_read(req: MarkReadReq, user = Depends(get_current_user)):
    supabase = get_supabase()
    try:
        if req.notification_ids:
            # Filter out non-uuid dynamic ids
            uuid_ids = [nid for nid in req.notification_ids if not nid.startswith('notif_')]
            if uuid_ids:
                supabase.table("notifications").update({"is_read": True}).in_("id", uuid_ids).execute()
    except Exception as e:
        pass
    return {"status": "ok"}
