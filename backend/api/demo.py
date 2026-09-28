from fastapi import APIRouter, Request, HTTPException
from typing import Dict, Any
from mqtt_client import mqtt_manager

router = APIRouter()

@router.post("/trigger")
async def trigger_demo(data: dict):
    device_id = data.get("device_id")
    if not device_id:
        raise HTTPException(status_code=400, detail="Missing device_id")
    
    payload = '{"cmd":"dispense","compartments":[1,2,3],"quantities":[1,2,1],"buzz":true}'
    topic = f"medibox/{device_id}/command"
    try:
        mqtt_manager.client.publish(topic, payload)
        return {"status": "triggered"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
