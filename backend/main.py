from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
import uuid
import qrcode
import io
import base64
from mqtt_client import mqtt_manager
from database import get_supabase
from services.dose_engine import dose_engine
from services.ai_scheduler import ai_scheduler_loop
import asyncio

@asynccontextmanager
async def lifespan(app: FastAPI):
    mqtt_manager.start()
    task = asyncio.create_task(dose_engine.scheduler_loop())
    ai_task = asyncio.create_task(ai_scheduler_loop())
    yield
    task.cancel()
    ai_task.cancel()
    mqtt_manager.stop()

app = FastAPI(title="Smart Medibox API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://192.168.1.5:3000", "*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

from api.devices import router as devices_router
from api.compartments import router as compartments_router
from api.medicines import router as medicines_router
from api.schedules import router as schedules_router
from api.demo import router as demo_router
from api.ai import router as ai_router
from api.notifications import router as notifications_router
from api.reports import router as reports_router

app.include_router(devices_router)
app.include_router(compartments_router)
app.include_router(medicines_router)
app.include_router(schedules_router)
app.include_router(demo_router, prefix="/api/demo", tags=["demo"])
app.include_router(ai_router)
app.include_router(notifications_router)
app.include_router(reports_router)

class DeviceCreateReq(BaseModel):
    device_name: str
    device_model: str
    compartment_count: int
    firmware_version: str

@app.post("/api/admin/devices/create")
def create_device(req: DeviceCreateReq):
    supabase = get_supabase()
    # Generate unique device identity
    device_id = f"MEDIBOX-{str(uuid.uuid4())[:8].upper()}"
    pairing_token = str(uuid.uuid4())
    
    # Store device in database
    new_device = {
        "device_id": device_id,
        "device_name": req.device_name,
        "device_model": req.device_model,
        "compartment_count": req.compartment_count,
        "firmware_version": req.firmware_version,
        "pairing_status": "UNPAIRED",
        "pairing_token": pairing_token
    }
    
    res = supabase.table("devices").insert(new_device).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create device")
        
    db_device = res.data[0]
    
    # Create the dynamic compartments
    for i in range(1, req.compartment_count + 1):
        supabase.table("compartments").insert({
            "device_id": db_device["id"],
            "compartment_number": i,
            "status": "CLOSED"
        }).execute()

    # Generate QR Code payload
    qr_data = {
        "type": "SMART_MEDIBOX",
        "device_id": device_id,
        "pairing_token": pairing_token
    }
    
    # Generate Base64 QR code image
    import json
    qr = qrcode.make(json.dumps(qr_data))
    buf = io.BytesIO()
    qr.save(buf, format="PNG")
    qr_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    
    return {
        "message": "Device generated successfully",
        "device": db_device,
        "qr_code_base64": f"data:image/png;base64,{qr_base64}"
    }

@app.get("/")
def root():
    return {"status": "ok", "service": "Smart Medibox Backend API"}
