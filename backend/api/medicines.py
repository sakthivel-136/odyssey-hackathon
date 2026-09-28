from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import get_supabase
from api.auth import get_current_user

router = APIRouter(prefix="/api/medicines", tags=["Medicines"])

class MedicineCreateReq(BaseModel):
    name: str
    generic_name: Optional[str] = None
    strength: Optional[str] = None
    dosage_form: Optional[str] = None
    dose_quantity: int = 1
    stock_quantity: int = 0
    low_stock_threshold: int = 10
    instructions: Optional[str] = None
    notes: Optional[str] = None

@router.get("")
def get_medicines(user = Depends(get_current_user)):
    supabase = get_supabase()
    res = supabase.table("medicines").select("*").eq("user_id", user.id).execute()
    return res.data

@router.post("")
def create_medicine(req: MedicineCreateReq, user = Depends(get_current_user)):
    supabase = get_supabase()
    new_med = req.dict()
    new_med["user_id"] = user.id
    
    res = supabase.table("medicines").insert(new_med).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create medicine")
        
    return {"message": "Medicine created", "medicine": res.data[0]}

@router.put("/{medicine_id}")
def update_medicine(medicine_id: str, req: MedicineCreateReq, user = Depends(get_current_user)):
    supabase = get_supabase()
    
    # Check ownership
    med_res = supabase.table("medicines").select("user_id").eq("id", medicine_id).execute()
    if not med_res.data or med_res.data[0]["user_id"] != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    res = supabase.table("medicines").update(req.dict()).eq("id", medicine_id).execute()
    return {"message": "Medicine updated", "medicine": res.data[0]}

@router.delete("/{medicine_id}")
def delete_medicine(medicine_id: str, user = Depends(get_current_user)):
    supabase = get_supabase()
    
    # Check ownership
    med_res = supabase.table("medicines").select("user_id").eq("id", medicine_id).execute()
    if not med_res.data or med_res.data[0]["user_id"] != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    supabase.table("medicines").delete().eq("id", medicine_id).execute()
    return {"message": "Medicine deleted"}
