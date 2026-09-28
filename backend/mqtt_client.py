import os
import paho.mqtt.client as mqtt
import json
import logging
from core.config import settings
from database import get_supabase

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MqttManager:
    def __init__(self):
        # We use a unique client ID and v5 protocol
        self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="fastapi_backend_12345")
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        if settings.MQTT_USERNAME and settings.MQTT_PASSWORD:
            self.client.username_pw_set(settings.MQTT_USERNAME, settings.MQTT_PASSWORD)
            
    def start(self):
        logger.info(f"Connecting to MQTT Broker at {settings.MQTT_BROKER}:{settings.MQTT_PORT}")
        self.client.connect(settings.MQTT_BROKER, settings.MQTT_PORT, 60)
        self.client.loop_start()

    def stop(self):
        self.client.loop_stop()
        self.client.disconnect()

    def on_connect(self, client, userdata, flags, rc, properties=None):
        logger.info(f"MQTT Connected with result code {rc}")
        client.subscribe("medibox/+/ack")
        client.subscribe("medibox/+/event")
        client.subscribe("medibox/+/events")
        client.subscribe("medibox/+/status")
        client.subscribe("medibox/+/telemetry")

    def on_message(self, client, userdata, msg):
        topic = msg.topic
        payload = msg.payload.decode('utf-8')
        try:
            data = json.loads(payload)
            logger.info(f"MQTT RX: {topic} -> {data}")
            self.process_message(topic, data)
        except json.JSONDecodeError:
            logger.error(f"Failed to parse JSON payload on {topic}")
        except Exception as e:
            logger.error(f"Error processing message on {topic}: {e}")

    def process_message(self, topic, data):
        parts = topic.split('/')
        if len(parts) < 3: return
        # The firmware replaced spaces with underscores, so we revert it back to match the DB
        device_id = parts[1].replace('_', ' ')
        msg_type = parts[2]

        try:
            supabase = get_supabase()
            
            if msg_type == "ack":
                self.handle_ack(supabase, device_id, data)
            elif msg_type in ("event", "events"):
                self.handle_event(supabase, device_id, data)
            elif msg_type == "status":
                self.handle_status(supabase, device_id, data)
            elif msg_type == "telemetry":
                self.handle_telemetry(supabase, device_id, data)
        except Exception as e:
            logger.error(f"Error handling {msg_type} for {device_id}: {e}")

    def handle_ack(self, supabase, device_id, data):
        command_id = data.get("command_id")
        status = data.get("status", "ACKNOWLEDGED")
        if command_id:
            supabase.table("device_commands").update({"status": status, "acknowledged_at": "now()"}).eq("command_id", command_id).execute()

    def handle_event(self, supabase, device_id, data):
        event_id = data.get("event_id")
        event_type = data.get("event")
        compartment_num = data.get("compartment_id") or data.get("compartment")
        
        
        if event_type == "HEARTBEAT":
            # Update the last_seen timestamp in the devices table
            try:
                # If device exists, update its last_seen timestamp
                dev_res = supabase.table("devices").select("id").eq("device_id", device_id).execute()
                if dev_res.data:
                    dev_uuid = dev_res.data[0]["id"]
                    supabase.table("devices").update({"last_seen": "now()"}).eq("id", dev_uuid).execute()
                    logger.debug(f"Heartbeat received from {device_id}. Updated last_seen.")
                return # Don't log heartbeats to sensor_events to save DB space
            except Exception as e:
                logger.error(f"Failed to process heartbeat: {e}")
                
        # --- TWILIO ALARM INTEGRATION ---

        if event_type == "DOSE_MISSED":
            logger.info(f"Triggering Twilio SMS and Call for Missed Dose in Compartment {compartment_num}!")
            try:
                import httpx
                import urllib.parse
                import time
                import threading
                
                TWILIO_SID = os.getenv("TWILIO_SID", "AC_DUMMY")
                TWILIO_TOKEN = os.getenv("TWILIO_TOKEN", "DUMMY_TOKEN")
                TO_PHONE = os.getenv("TWILIO_TO_PHONE", "+919150372420")
                FROM_PHONE = os.getenv("TWILIO_FROM_PHONE", "+17372508034")
                headers = {"Content-Type": "application/x-www-form-urlencoded"}
                
                def run_twilio_alert():
                    # 1. SEND SMS FIRST (Using Twilio Trial Template)
                    try:
                        # Using Twilio Trial predefined template so the SMS actually delivers!
                        sms_payload = f"To={urllib.parse.quote(TO_PHONE)}&From={urllib.parse.quote(FROM_PHONE)}&Body=sms_account_alerts"
                        sms_url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_SID}/Messages.json"
                        httpx.post(sms_url, headers=headers, content=sms_payload, auth=(TWILIO_SID, TWILIO_TOKEN), timeout=10.0)
                        logger.info("Twilio SMS Sent Successfully!")
                    except Exception as e:
                        logger.error(f"Twilio SMS Failed: {e}")
                        
                    # 2. WAIT 15 SECONDS
                    time.sleep(15)
                    
                    # 3. TRIGGER VOICE CALL
                    try:
                        xml_content = "<Response>"
                        for _ in range(3):
                            xml_content += f'<Say voice="Google.ta-IN-Standard-A" language="ta-IN">வணக்கம். தயவுசெய்து உங்கள் மாத்திரையை அறை {compartment_num} லிருந்து உடனடியாக எடுத்துக்கொள்ளவும்.</Say>'
                            xml_content += f'<Say voice="Google.en-IN-Standard-A" language="en-IN">Hello user, take your pill or medicine from compartment {compartment_num} now immediately.</Say>'
                        xml_content += "</Response>"
                        
                        twimlet_url = 'https://twimlets.com/echo?Twiml=' + urllib.parse.quote(xml_content)
                        call_payload = f"To={urllib.parse.quote(TO_PHONE)}&From={urllib.parse.quote(FROM_PHONE)}&Url={urllib.parse.quote(twimlet_url)}"
                        call_url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_SID}/Calls.json"
                        
                        httpx.post(call_url, headers=headers, content=call_payload, auth=(TWILIO_SID, TWILIO_TOKEN), timeout=15.0)
                        logger.info("Twilio Voice Call Triggered Successfully!")
                    except Exception as e:
                        logger.error(f"Twilio Voice Call Failed: {e}")
                
                # Run this in a background thread so we don't block the MQTT loop for 10 seconds!
                threading.Thread(target=run_twilio_alert).start()
                
            except Exception as e:
                logger.error(f"Failed to setup Twilio sequence: {e}")
        # --------------------------------
        
        if event_id:
            dev_res = supabase.table("devices").select("id").eq("device_id", device_id).execute()
            if dev_res.data:
                dev_uuid = dev_res.data[0]["id"]
                comp_uuid = None
                if compartment_num:
                    comp_res = supabase.table("compartments").select("id").eq("device_id", dev_uuid).eq("compartment_number", compartment_num).execute()
                    if comp_res.data:
                        comp_uuid = comp_res.data[0]["id"]
                
                supabase.table("sensor_events").insert({
                    "event_id": event_id,
                    "device_id": dev_uuid,
                    "compartment_id": comp_uuid,
                    "sensor_type": "IR" if "IR" in event_type else "SYSTEM",
                    "event_type": event_type,
                    "raw_value": data
                }).execute()
                
                # TWO-WAY COMMUNICATION: Update the physical compartment status in the DB
                if event_type in ["IR_TRIGGERED", "DOSE_MISSED"]:
                    # The ESP32 closed the lid
                    supabase.table("compartments").update({
                        "servo_status": "CLOSED",
                        "ir_status": "CLEAR"
                    }).eq("id", comp_uuid).execute()
                    logger.info(f"Updated Compartment {compartment_num} to CLOSED on dashboard.")

                
                if event_type in ["IR_TRIGGERED", "IR_INTERACTION_DETECTED"]:
                    from services.dose_engine import dose_engine
                    dose_engine.on_ir_interaction(dev_uuid, comp_uuid)
                
                # HARDWARE RESET BUTTON LOGIC
                if event_type == "FACTORY_RESET":
                    # Unpair the device, but do NOT delete the pairing token.
                    supabase.table("devices").update({
                        "pairing_status": "UNPAIRED",
                        "owner_id": None
                    }).eq("id", dev_uuid).execute()
                    
                    # Delete schedules for this device to prevent ghost alerts
                    supabase.table("schedules").delete().eq("device_id", dev_uuid).execute()
                    logger.info(f"HARDWARE RESET successful for {device_id}")

    def handle_status(self, supabase, device_id, data):
        status = data.get("status")
        if status:
            supabase.table("devices").update({
                "device_status": status,
                "last_seen": "now()"
            }).eq("device_id", device_id).execute()

    def handle_telemetry(self, supabase, device_id, data):
        dev_res = supabase.table("devices").select("id").eq("device_id", device_id).execute()
        if dev_res.data:
            dev_uuid = dev_res.data[0]["id"]
            
            # Handle new Servo/IR telemetry
            if data.get("status") in ["LID_OPENED", "LID_CLOSED"]:
                comp_num = data.get("compartment")
                if comp_num:
                    new_servo_state = "OPEN" if data.get("status") == "LID_OPENED" else "CLOSED"
                    supabase.table("compartments").update({"servo_status": new_servo_state, "current_state": new_servo_state}).eq("device_id", dev_uuid).eq("compartment_number", comp_num).execute()
                    logger.info(f"Updated compartment {comp_num} servo status to {new_servo_state}")
            
            # Record general telemetry if present
            if "uptime" in data:
                supabase.table("device_telemetry").insert({
                    "device_id": dev_uuid,
                    "uptime_seconds": data.get("uptime"),
                    "wifi_rssi": data.get("wifi_rssi"),
                    "firmware_version": data.get("firmware_version"),
                    "sensor_status": data.get("sensor_status")
                }).execute()

    def publish_command(self, device_id: str, command_data: dict):
        # The physical C++ firmware replaces spaces with underscores in its MQTT_CLIENT_ID
        safe_device_id = device_id.replace(" ", "_")
        topic = f"medibox/{safe_device_id}/command"
        payload = json.dumps(command_data)
        logger.info(f"MQTT TX: {topic} -> {payload}")
        self.client.publish(topic, payload, qos=1)

mqtt_manager = MqttManager()
