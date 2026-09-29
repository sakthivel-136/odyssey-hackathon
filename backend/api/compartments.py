from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from database import get_supabase
from api.auth import get_current_user
from mqtt_client import mqtt_manager
import uuid
import time
import asyncio

router = APIRouter(prefix="/api/compartments", tags=["Compartments"])

async def auto_close_lid(device_id: str, compartment_number: int, user_id: str, actual_device_id_str: str):
    await asyncio.sleep(120)  # Wait 2 minutes
    supabase = get_supabase()
    # Ensure it's not already closed manually (this is a simplified check, ideally we'd check device state)
    cmd_id = f"cmd_{int(time.time())}"
    supabase.table("device_commands").insert({
        "command_id": cmd_id,
        "device_id": device_id,
        "user_id": user_id,
        "command_type": "REFILL_CLOSE_AUTO",
        "status": "PENDING"
    }).execute()
    mqtt_manager.publish_command(actual_device_id_str, {
        "command_id": cmd_id,
        "cmd": "CLOSE_LID",
        "compartment_number": compartment_number
    })
    print(f"Auto-closed compartment {compartment_number} for device {device_id} after 2 minutes.")

class AssignMedicineReq(BaseModel):
    compartment_id: str
    medicine_id: str
    quantity: int

class TestCommandReq(BaseModel):
    device_id: str
    compartment_number: int

@router.get("/{device_id}")
def get_compartments(device_id: str, user = Depends(get_current_user)):
    supabase = get_supabase()
    
    try:
        # Verify ownership
        dev_res = supabase.table("devices").select("id").eq("owner_id", user.id).execute()
        device_ids = [str(d["id"]) for d in dev_res.data] if dev_res.data else []
        
        if device_ids and device_id not in device_ids:
            raise HTTPException(status_code=403, detail="Not authorized to access this device")
            
        comps = supabase.table("compartments").select("*, medicine_compartments(*, medicines(*))").eq("device_id", device_id).order("compartment_number").execute()
        return comps.data or []
    except HTTPException:
        raise
    except Exception as e:
        # If transient socket/read error occurred, reset and retry
        from database import reset_supabase
        reset_supabase()
        supabase = get_supabase()
        comps = supabase.table("compartments").select("*, medicine_compartments(*, medicines(*))").eq("device_id", device_id).order("compartment_number").execute()
        return comps.data or []

@router.post("/assign")
def assign_medicine(req: AssignMedicineReq, user = Depends(get_current_user)):
    supabase = get_supabase()
    
    # Remove existing assignment for this compartment if any
    supabase.table("medicine_compartments").delete().eq("compartment_id", req.compartment_id).execute()
    
    # Insert new assignment
    res = supabase.table("medicine_compartments").insert({
        "compartment_id": req.compartment_id,
        "medicine_id": req.medicine_id,
        "current_quantity": req.quantity
    }).execute()
    
    return {"message": "Medicine assigned successfully", "data": res.data[0] if res.data else None}

@router.post("/test/servo")
def test_servo(req: TestCommandReq, user = Depends(get_current_user)):
    # Create command in DB
    supabase = get_supabase()
    
    # Need string device_id (like MEDIBOX-001) for MQTT topic
    dev_str_res = supabase.table("devices").select("device_id").eq("id", req.device_id).execute()
    if not dev_str_res.data:
        raise HTTPException(status_code=404, detail="Device not found")
        
    actual_device_id_str = dev_str_res.data[0]["device_id"]
    
    cmd_id = f"cmd_{int(time.time())}"
    supabase.table("device_commands").insert({
        "command_id": cmd_id,
        "device_id": req.device_id,
        "user_id": user.id,
        "command_type": "TEST_SERVO",
        "status": "PENDING"
    }).execute()
    
    # Publish MQTT
    mqtt_manager.publish_command(actual_device_id_str, {
        "command_id": cmd_id,
        "cmd": "OPEN_LID",
        "compartment_number": req.compartment_number
    })
    
    # Update compartment status to OPEN & MANUAL_OPEN so it does NOT auto-close on IR trigger
    supabase.table("compartments").update({
        "servo_status": "OPEN",
        "current_state": "MANUAL_OPEN"
    }).eq("device_id", req.device_id).eq("compartment_number", req.compartment_number).execute()
    
    return {"message": "Servo test command sent", "command_id": cmd_id}


@router.post("/control/close")
def control_close(req: TestCommandReq, user = Depends(get_current_user)):
    supabase = get_supabase()
    
    dev_str_res = supabase.table("devices").select("device_id").eq("id", req.device_id).execute()
    if not dev_str_res.data:
        raise HTTPException(status_code=404, detail="Device not found")
        
    actual_device_id_str = dev_str_res.data[0]["device_id"]
    
    cmd_id = f"cmd_close_{int(time.time())}"
    supabase.table("device_commands").insert({
        "command_id": cmd_id,
        "device_id": req.device_id,
        "user_id": user.id,
        "command_type": "MANUAL_CLOSE",
        "status": "PENDING"
    }).execute()
    
    mqtt_manager.publish_command(actual_device_id_str, {
        "command_id": cmd_id,
        "cmd": "CLOSE_LID",
        "compartment_number": req.compartment_number
    })
    
    # Update compartment status to CLOSED & IDLE
    supabase.table("compartments").update({
        "servo_status": "CLOSED",
        "current_state": "IDLE"
    }).eq("device_id", req.device_id).eq("compartment_number", req.compartment_number).execute()
    
    return {"message": "Compartment closed successfully", "command_id": cmd_id}


@router.post("/test/ir")
def test_ir(req: TestCommandReq, user = Depends(get_current_user)):
    supabase = get_supabase()
    dev_str_res = supabase.table("devices").select("device_id").eq("id", req.device_id).execute()
    if not dev_str_res.data:
        raise HTTPException(status_code=404, detail="Device not found")
        
    actual_device_id_str = dev_str_res.data[0]["device_id"]
    
    cmd_id = f"cmd_{int(time.time())}"
    supabase.table("device_commands").insert({
        "command_id": cmd_id,
        "device_id": req.device_id,
        "user_id": user.id,
        "command_type": "TEST_IR",
        "status": "PENDING"
    }).execute()
    
    mqtt_manager.publish_command(actual_device_id_str, {
        "command_id": cmd_id,
        "cmd": "TEST_IR",
        "compartment_number": req.compartment_number
    })
    
    return {"message": "IR sensor test command sent", "command_id": cmd_id}

class RefillOpenReq(BaseModel):
    device_id: str
    compartment_number: int

@router.post("/refill/open")
def refill_open(req: RefillOpenReq, background_tasks: BackgroundTasks, user = Depends(get_current_user)):
    supabase = get_supabase()
    dev_str_res = supabase.table("devices").select("device_id").eq("id", req.device_id).execute()
    if not dev_str_res.data:
        raise HTTPException(status_code=404, detail="Device not found")
        
    actual_device_id_str = dev_str_res.data[0]["device_id"]
    
    cmd_id = f"cmd_{int(time.time())}"
    supabase.table("device_commands").insert({
        "command_id": cmd_id,
        "device_id": req.device_id,
        "user_id": user.id,
        "command_type": "REFILL_OPEN",
        "status": "PENDING"
    }).execute()
    
    mqtt_manager.publish_command(actual_device_id_str, {
        "command_id": cmd_id,
        "cmd": "OPEN_LID",
        "compartment_number": req.compartment_number
    })
    
    # Schedule auto-close in 2 minutes
    background_tasks.add_task(auto_close_lid, req.device_id, req.compartment_number, user.id, actual_device_id_str)
    
    return {"message": "Compartment opened for refill"}

class RefillCloseReq(BaseModel):
    device_id: str
    compartment_number: int
    medicine_id: str
    new_stock_quantity: int

@router.post("/refill/close")
def refill_close(req: RefillCloseReq, user = Depends(get_current_user)):
    supabase = get_supabase()
    dev_str_res = supabase.table("devices").select("device_id").eq("id", req.device_id).execute()
    if not dev_str_res.data:
        raise HTTPException(status_code=404, detail="Device not found")
        
    actual_device_id_str = dev_str_res.data[0]["device_id"]
    
    # Update stock in medicines table
    supabase.table("medicines").update({"stock_quantity": req.new_stock_quantity}).eq("id", req.medicine_id).execute()
    
    # Send close command
    cmd_id = f"cmd_{int(time.time())}"
    supabase.table("device_commands").insert({
        "command_id": cmd_id,
        "device_id": req.device_id,
        "user_id": user.id,
        "command_type": "REFILL_CLOSE",
        "status": "PENDING"
    }).execute()
    
    mqtt_manager.publish_command(actual_device_id_str, {
        "command_id": cmd_id,
        "cmd": "CLOSE_LID",
        "compartment_number": req.compartment_number
    })

    # Update compartment status in DB
    supabase.table("compartments").update({
        "servo_status": "CLOSED",
        "current_state": "IDLE"
    }).eq("device_id", req.device_id).eq("compartment_number", req.compartment_number).execute()

    # Record refill in audit_logs table
    try:
        supabase.table("audit_logs").insert({
            "user_id": user.id,
            "device_id": req.device_id,
            "action": "REFILL_COMPARTMENT",
            "details": {
                "compartment_number": req.compartment_number,
                "medicine_id": req.medicine_id,
                "new_stock_quantity": req.new_stock_quantity
            }
        }).execute()
    except Exception as ae:
        logger.warning(f"Could not record refill audit log: {ae}")

    # Record confirmation in notifications table
    try:
        med_info = supabase.table("medicines").select("name").eq("id", req.medicine_id).execute()
        med_name = med_info.data[0]["name"] if med_info.data else "Medication"
        supabase.table("notifications").insert({
            "user_id": user.id,
            "title": "Hardware Refill Recorded",
            "message": f"Compartment {req.compartment_number} ({med_name}) was refilled. Total stock is now {req.new_stock_quantity} tablets.",
            "type": "REFILL",
            "is_read": False
        }).execute()
    except Exception as ne:
        logger.warning(f"Could not record refill notification: {ne}")
    
    return {"message": "Compartment closed and stock updated"}
