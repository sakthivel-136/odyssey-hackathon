from fastapi import APIRouter, Depends
from database import get_supabase
from api.auth import get_current_user
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")

router = APIRouter(prefix="/api/reports", tags=["Reports"])

@router.get("/adherence")
def get_adherence_report(user = Depends(get_current_user)):
    supabase = get_supabase()
    
    # 1. Get user's devices
    dev_res = supabase.table("devices").select("id").eq("owner_id", user.id).execute()
    device_ids = [str(d["id"]) for d in dev_res.data]
    
    if not device_ids:
        return {
            "total": 0,
            "completed": 0,
            "missed": 0,
            "adherence_rate": 100,
            "weekly_trend": [],
            "hourly_distribution": [],
            "inventory_status": [],
            "uptime": 99.9
        }
        
    # 2. Get dose events for these devices
    events_res = supabase.table("dose_events").select("*").in_("device_id", device_ids).execute()
    events = events_res.data or []
    
    total = len(events)
    completed = len([e for e in events if e.get("status") == "COMPLETED"])
    missed = len([e for e in events if e.get("status") == "MISSED"])
    
    adherence_rate = round((completed / total * 100)) if total > 0 else 100
    
    # 3. Compute Weekly Trend (last 7 days)
    today = datetime.now(IST).date()
    weekly_trend = []
    
    for i in range(6, -1, -1):
        day_date = today - timedelta(days=i)
        day_str = day_date.isoformat()
        day_label = day_date.strftime("%a") # Mon, Tue, etc.
        
        day_events = [e for e in events if e.get("event_date") == day_str]
        day_taken = len([e for e in day_events if e.get("status") == "COMPLETED"])
        day_missed = len([e for e in day_events if e.get("status") == "MISSED"])
        
        weekly_trend.append({
            "day": day_label,
            "date": day_str,
            "taken": day_taken,
            "missed": day_missed,
            "adherence": round((day_taken / len(day_events) * 100)) if day_events else 100
        })
        
    # 4. Hourly Distribution (00:00 to 23:00)
    hourly_counts = {f"{h:02d}:00": 0 for h in range(6, 23, 3)} # 6 AM to 9 PM slots
    for e in events:
        s_time = e.get("scheduled_time") or ""
        if s_time and len(s_time) >= 2:
            try:
                hour = int(s_time[:2])
                slot = f"{(hour // 3 * 3):02d}:00"
                if slot in hourly_counts:
                    hourly_counts[slot] += 1
            except:
                pass
                
    hourly_distribution = [{"time": k, "doses": v} for k, v in hourly_counts.items()]
    
    # 5. Inventory Stock Status
    meds_res = supabase.table("medicines").select("*").eq("user_id", user.id).execute()
    inventory_status = []
    for m in meds_res.data or []:
        inventory_status.append({
            "id": m["id"],
            "name": m["name"],
            "strength": m.get("strength") or "",
            "stock_quantity": m.get("stock_quantity", 0),
            "low_stock_threshold": m.get("low_stock_threshold", 10),
            "is_low": m.get("stock_quantity", 0) <= m.get("low_stock_threshold", 10)
        })
        
    return {
        "total": total,
        "completed": completed,
        "missed": missed,
        "adherence_rate": adherence_rate,
        "weekly_trend": weekly_trend,
        "hourly_distribution": hourly_distribution,
        "inventory_status": inventory_status,
        "uptime": 99.9
    }
