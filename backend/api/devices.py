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


@router.get("/{device_id}/qr")
def get_device_qr(device_id: str, user = Depends(get_current_user)):
    supabase = get_supabase()
    dev_res = supabase.table("devices").select("*").eq("id", device_id).execute()
    if not dev_res.data:
        raise HTTPException(status_code=404, detail="Device not found")
    device = dev_res.data[0]
    
    pairing_payload = json.dumps({
        "device_id": device["device_id"],
        "token": device.get("pairing_token") or device["device_id"],
        "name": device.get("device_name", "Smart Medibox")
    })
    
    import qrcode
    from io import BytesIO
    import base64
    
    qr = qrcode.QRCode(box_size=10, border=2)
    qr.add_data(pairing_payload)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buf = BytesIO()
    img.save(buf, format="PNG")
    b64 = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
    
    return {
        "qr_code_base64": b64,
        "device_id": device["device_id"],
        "device_name": device.get("device_name", "Smart Medibox"),
        "pairing_token": device.get("pairing_token")
    }


@router.get("/{device_id}/qr-pdf")
def download_device_qr_pdf(device_id: str, user = Depends(get_current_user)):
    from fastapi.responses import Response
    import json
    import qrcode
    from io import BytesIO
    from PIL import Image, ImageDraw
    
    supabase = get_supabase()
    dev_res = supabase.table("devices").select("*").eq("id", device_id).execute()
    if not dev_res.data:
        raise HTTPException(status_code=404, detail="Device not found")
    device = dev_res.data[0]
    
    pairing_payload = json.dumps({
        "device_id": device["device_id"],
        "token": device.get("pairing_token") or device["device_id"],
        "name": device.get("device_name", "Smart Medibox")
    })
    
    # 1. Generate clean high-resolution QR
    qr = qrcode.QRCode(box_size=14, border=2)
    qr.add_data(pairing_payload)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="#0F172A", back_color="white").convert("RGB")
    
    # 2. Build single-page document (800x1100 px)
    doc_w, doc_h = 800, 1100
    canvas = Image.new("RGB", (doc_w, doc_h), "white")
    draw = ImageDraw.Draw(canvas)
    
    # Header Banner
    draw.rectangle([(0, 0), (doc_w, 140)], fill="#2563EB")
    draw.text((50, 40), "SMART MEDIBOX", fill="white")
    draw.text((50, 80), "Device Recovery & Pairing Certificate", fill="#BFDBFE")
    
    # Device Details Box
    draw.rounded_rectangle([(50, 170), (doc_w - 50, 310)], radius=16, fill="#F8FAFC", outline="#E2E8F0", width=2)
    draw.text((75, 195), f"Device Name: {device.get('device_name', 'Smart Medibox')}", fill="#0F172A")
    draw.text((75, 230), f"Hardware ID: {device.get('device_id', 'Unknown')}", fill="#475569")
    draw.text((75, 265), f"Pairing Token: {device.get('pairing_token', 'N/A')}", fill="#2563EB")
    
    # Centered QR Image
    qr_w, qr_h = 440, 440
    qr_resized = qr_img.resize((qr_w, qr_h))
    qr_x = (doc_w - qr_w) // 2
    qr_y = 350
    draw.rounded_rectangle([(qr_x - 12, qr_y - 12), (qr_x + qr_w + 12, qr_y + qr_h + 12)], radius=16, fill="white", outline="#CBD5E1", width=2)
    canvas.paste(qr_resized, (qr_x, qr_y))
    
    # Instructions at bottom
    draw.text((doc_w // 2, 840), "Scan this QR code with the Smart Medibox application to pair or recover your unit.", fill="#334155", anchor="mm")
    draw.text((doc_w // 2, 875), "Store this document safely. Do not share your pairing token with unauthorized users.", fill="#64748B", anchor="mm")
    
    # Footer
    draw.line([(50, 950), (doc_w - 50, 950)], fill="#E2E8F0", width=1)
    draw.text((doc_w // 2, 990), "Smart Medibox IoT Healthcare System • https://medibox.sakthi-dev.in", fill="#94A3B8", anchor="mm")
    
    buf = BytesIO()
    canvas.save(buf, format="PDF", resolution=150.0)
    pdf_bytes = buf.getvalue()
    
    safe_name = str(device.get("device_id", "medibox")).replace(" ", "_")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=medibox-recovery-{safe_name}.pdf"
        }
    )
