from fastapi import APIRouter, Depends
from pydantic import BaseModel
from database import get_supabase
from api.auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("")
def get_unread_notifications(user = Depends(get_current_user)):
    supabase = get_supabase()
    res = supabase.table("notifications").select("*").eq("user_id", user.id).eq("is_read", False).order("created_at", desc=True).execute()
    return res.data

class MarkReadReq(BaseModel):
    notification_ids: list[str]

@router.post("/mark-read")
def mark_read(req: MarkReadReq, user = Depends(get_current_user)):
    supabase = get_supabase()
    if req.notification_ids:
        supabase.table("notifications").update({"is_read": True}).in_("id", req.notification_ids).execute()
    return {"status": "ok"}
