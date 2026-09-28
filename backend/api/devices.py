from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from database import get_supabase
from api.auth import get_current_user
from mqtt_client import mqtt_manager

router = APIRouter(prefix="/api/devices", tags=["Devices"])

class PairDeviceReq(BaseModel):
    device_id: str
    pairing_token: str

@router.post("/pair")
def pair_device(req: PairDeviceReq, user = Depends(get_current_user)):
    supabase = get_supabase()
    
    # 1. Validate device and token
    device_res = supabase.table("devices").select("*").eq("device_id", req.device_id).execute()
    if not device_res.data:
        raise HTTPException(status_code=404, detail="Device not found")
        
    device = device_res.data[0]
    
    if device["pairing_status"] == "PAIRED":
        raise HTTPException(status_code=400, detail="Device is already paired")
        
    if device.get("pairing_token") != req.pairing_token:
        raise HTTPException(status_code=401, detail="Invalid pairing token")
        
    # 2. Update device status to PAIRED and set owner
    supabase.table("devices").update({
        "pairing_status": "PAIRED",
        "owner_id": user.id,
        "device_status": "ONLINE"
    }).eq("id", device["id"]).execute()
    
    # 4. Optional: Send MQTT command to ESP32 to confirm pairing
    mqtt_manager.publish_command(req.device_id, {
        "command_id": "sys_pair",
        "command": "PAIRING_CONFIRMED"
    })
    
    return {"message": "Device paired successfully"}


@router.get("")
def list_devices(user = Depends(get_current_user)):
    supabase = get_supabase()
    
    # Get user's devices directly via owner_id
    devices_res = supabase.table("devices").select("*").eq("owner_id", user.id).execute()
    devices = devices_res.data
    
    import datetime
    from datetime import timezone
    
    for d in devices:
        last_seen = d.get("last_seen")
        if last_seen:
            # Parse last_seen (assuming ISO format from postgres)
            try:
                # Handle 'Z' or offset
                last_seen_dt = datetime.datetime.fromisoformat(last_seen.replace('Z', '+00:00'))
                now_dt = datetime.datetime.now(timezone.utc)
                diff = (now_dt - last_seen_dt).total_seconds()
                
                if diff <= 60:
                    d["device_status"] = "ONLINE"
                else:
                    d["device_status"] = "OFFLINE"
            except Exception as e:
                d["device_status"] = "OFFLINE"
        else:
            d["device_status"] = "OFFLINE"
            
    return devices


@router.post("/{device_id}/unpair")
def unpair_device(device_id: str, user = Depends(get_current_user)):
    supabase = get_supabase()
    
    # 1. Verify ownership
    dev_res = supabase.table("devices").select("*").eq("id", device_id).eq("owner_id", user.id).execute()
    if not dev_res.data:
        raise HTTPException(status_code=403, detail="Device not found or not owned by you")
    
    device = dev_res.data[0]
    
    # 2. Clear medicine_compartments for this device (so next user sees empty compartments)
    # Find compartment IDs for this device
    comp_res = supabase.table("compartments").select("id").eq("device_id", device_id).execute()
    comp_ids = [c["id"] for c in comp_res.data]
    if comp_ids:
        supabase.table("medicine_compartments").delete().in_("compartment_id", comp_ids).execute()
        
    # 3. Delete active schedules for this device
    supabase.table("schedules").delete().eq("device_id", device_id).execute()
        
    # 4. Unpair the device
    supabase.table("devices").update({
        "pairing_status": "UNPAIRED",
        "owner_id": None
    }).eq("id", device_id).execute()
    
    # Send MQTT unpair command
    mqtt_manager.publish_command(device["device_id"], {
        "command_id": "sys_unpair",
        "command": "UNPAIRED"
    })
    
    return {"message": "Device unpaired successfully"}

@router.post("/reset-data")
def reset_user_data(user = Depends(get_current_user)):
    supabase = get_supabase()
    
    # Delete all medicines (which will cascade to medicine_compartments and schedule_items)
    supabase.table("medicines").delete().eq("user_id", user.id).execute()
    
    # Delete all schedules (just in case they weren't cascaded)
    supabase.table("schedules").delete().eq("user_id", user.id).execute()
    
    # Delete AI insights, dose history, and notifications to fully wipe user data
    supabase.table("ai_insights").delete().eq("user_id", user.id).execute()
    supabase.table("notifications").delete().eq("user_id", user.id).execute()
    
    # Note: We do NOT unpair the device here. The user requested unpair and reset to be separate.
    return {"message": "All user data reset successfully"}
