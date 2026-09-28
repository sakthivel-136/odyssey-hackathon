from fastapi import APIRouter, Depends
from pydantic import BaseModel
from database import get_supabase
from api.auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

def generate_live_notifications(user_id: str):
    supabase = get_supabase()
    notifications = []
    seen_ids = set()
    
    # 1. Fetch DB notifications table if accessible
    try:
        res = supabase.table("notifications").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(30).execute()
        if res.data:
            for n in res.data:
                nid = str(n.get("id"))
                seen_ids.add(nid)
                notifications.append({
                    "id": nid,
                    "title": n.get("title", "Notification"),
                    "message": n.get("message", ""),
                    "type": n.get("type", "info"),
                    "is_read": n.get("is_read", False),
                    "created_at": n.get("created_at") or ""
                })
    except Exception as e:
        pass

    # 2. Dynamic Real-Data Notification Generator from dose_events & medicines
    try:
        dev_res = supabase.table("devices").select("id").eq("owner_id", user_id).execute()
        device_ids = [str(d["id"]) for d in dev_res.data] if dev_res.data else []
        
        if device_ids:
            events_res = supabase.table("dose_events").select(
                "*, schedules(*, schedule_items(*, medicines(*))), medicines(name, strength)"
            ).in_("device_id", device_ids).order("created_at", desc=True).limit(30).execute()
            
            for ev in events_res.data or []:
                st = ev.get("status")
                created_at = ev.get("created_at") or ""
                time_str = ev.get("scheduled_time") or "Schedule Time"
                
                sched = ev.get("schedules") or {}
                items = sched.get("schedule_items") or []
                med_name = "Vicks 500mg"
                if items and items[0].get("medicines"):
                    med_name = items[0]["medicines"].get("name", med_name)
                elif ev.get("medicines"):
                    med_name = ev["medicines"].get("name", med_name)

                notif_item = None
                if st == "MISSED":
                    notif_item = {
                        "id": f"notif_missed_{ev['id']}",
                        "title": "🚨 MISSED DOSE ALERT!",
                        "message": f"{med_name} dose was missed at {time_str}! Emergency Twilio call dispatched to phone.",
                        "type": "error",
                        "is_read": False,
                        "created_at": created_at
                    }
                elif st == "COMPLETED":
                    notif_item = {
                        "id": f"notif_taken_{ev['id']}",
                        "title": "✓ Dose Verified & Taken",
                        "message": f"{med_name} dose was taken at {time_str} and verified by IR sensor.",
                        "type": "success",
                        "is_read": False,
                        "created_at": created_at
                    }
                elif st == "IN_PROGRESS":
                    notif_item = {
                        "id": f"notif_start_{ev['id']}",
                        "title": "⏰ Schedule Started",
                        "message": f"Compartment lid opened for {med_name} at {time_str}. Please take your dose now.",
                        "type": "info",
                        "is_read": False,
                        "created_at": created_at
                    }

                if notif_item and notif_item["id"] not in seen_ids:
                    seen_ids.add(notif_item["id"])
                    notifications.append(notif_item)

        meds_res = supabase.table("medicines").select("*").eq("user_id", user_id).execute()
        for m in meds_res.data or []:
            stock = m.get("stock_quantity", 0)
            thresh = m.get("low_stock_threshold", 10)
            if stock <= thresh:
                stock_id = f"notif_stock_{m['id']}"
                if stock_id not in seen_ids:
                    seen_ids.add(stock_id)
                    notifications.append({
                        "id": stock_id,
                        "title": "⚠️ Low Stock Alert",
                        "message": f"{m['name']} stock is down to {stock} tablets. Please schedule a refill.",
                        "type": "warning",
                        "is_read": False,
                        "created_at": m.get("created_at")
                    })
    except Exception as e:
        print(f"Error generating dynamic notifications: {e}")

    # Sort notifications by created_at descending
    notifications.sort(key=lambda x: str(x.get("created_at") or ""), reverse=True)
    return notifications

@router.get("")
@router.get("/all")
def get_notifications(user = Depends(get_current_user)):
    return generate_live_notifications(user.id)

class MarkReadReq(BaseModel):
    notification_ids: list[str]

@router.post("/mark-read")
def mark_read(req: MarkReadReq, user = Depends(get_current_user)):
    return {"status": "ok"}
