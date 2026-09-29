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
            try:
                if dev_res.data and dev_res.data[0].get("owner_id"):
                    u_id = dev_res.data[0]["owner_id"]
                    from datetime import datetime
                    t_str = datetime.now().strftime("%I:%M %p")
                    supabase.table("notifications").insert({
                        "user_id": u_id,
                        "title": "🚨 MISSED DOSE ALERT!",
                        "message": f"Dose missed in Compartment {compartment_num} at {t_str}! Emergency Twilio call dispatched.",
                        "type": "error",
                        "is_read": False
                    }).execute()
                    logger.info(f"Created missed dose notification for user {u_id}")
            except Exception as ne:
                logger.error(f"Failed to insert missed notification: {ne}")
            logger.info(f"Triggering Twilio SMS and Call for Missed Dose in Compartment {compartment_num}!")
            try:
                import httpx
                import urllib.parse
                import time
                import threading
                
                TWILIO_SID = os.getenv("TWILIO_SID", "AC_DUMMY")
                TWILIO_TOKEN = os.getenv("TWILIO_TOKEN", "DUMMY_TOKEN")
                PATIENT_PHONE = os.getenv("TWILIO_TO_PHONE", "+919150372420")
                CAREGIVER_PHONE = os.getenv("TWILIO_CAREGIVER_PHONE", "")
                FROM_PHONE = os.getenv("TWILIO_FROM_PHONE", "+17372508034")
                headers = {"Content-Type": "application/x-www-form-urlencoded"}

                # Try loading dynamic phone preferences from user account if available
                u_id = dev_res.data[0].get("owner_id") if (dev_res.data and dev_res.data[0].get("owner_id")) else None
                if u_id:
                    try:
                        u_res = supabase.auth.admin.get_user_by_id(u_id)
                        if u_res and hasattr(u_res, "user") and u_res.user:
                            meta = u_res.user.user_metadata or {}
                            if meta.get("caregiver_phone"):
                                CAREGIVER_PHONE = meta["caregiver_phone"]
                            if meta.get("patient_phone"):
                                PATIENT_PHONE = meta["patient_phone"]
                    except Exception:
                        pass
                
                def run_twilio_alert():
                    # 1. SEND SMS FIRST TO PATIENT (Using Twilio Trial Template)
                    try:
                        sms_payload = f"To={urllib.parse.quote(PATIENT_PHONE)}&From={urllib.parse.quote(FROM_PHONE)}&Body=sms_account_alerts"
                        sms_url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_SID}/Messages.json"
                        httpx.post(sms_url, headers=headers, content=sms_payload, auth=(TWILIO_SID, TWILIO_TOKEN), timeout=10.0)
                        logger.info(f"Twilio SMS Sent Successfully to Patient ({PATIENT_PHONE})!")
                    except Exception as e:
                        logger.error(f"Twilio SMS Failed: {e}")
                        
                    # 2. TRIGGER VOICE CALL TO PATIENT
                    patient_call_sid = None
                    try:
                        xml_content = "<Response>"
                        for _ in range(3):
                            xml_content += f'<Say voice="Google.ta-IN-Standard-A" language="ta-IN">வணக்கம். தயவுசெய்து உங்கள் மாத்திரையை அறை {compartment_num} லிருந்து உடனடியாக எடுத்துக்கொள்ளவும்.</Say>'
                            xml_content += f'<Say voice="Google.en-IN-Standard-A" language="en-IN">Hello user, take your pill or medicine from compartment {compartment_num} now immediately.</Say>'
                        xml_content += "</Response>"
                        
                        twimlet_url = 'https://twimlets.com/echo?Twiml=' + urllib.parse.quote(xml_content)
                        # Timeout=25: rings patient for 25 seconds before reporting status
                        call_payload = f"To={urllib.parse.quote(PATIENT_PHONE)}&From={urllib.parse.quote(FROM_PHONE)}&Url={urllib.parse.quote(twimlet_url)}&Timeout=25"
                        call_url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_SID}/Calls.json"
                        
                        resp = httpx.post(call_url, headers=headers, content=call_payload, auth=(TWILIO_SID, TWILIO_TOKEN), timeout=15.0)
                        if resp.status_code in (200, 201):
                            patient_call_sid = resp.json().get("sid")
                            logger.info(f"Twilio Voice Call Placed to Patient ({PATIENT_PHONE}). Call SID: {patient_call_sid}")
                        else:
                            logger.error(f"Twilio Voice Call to Patient failed: {resp.text}")
                    except Exception as e:
                        logger.error(f"Twilio Voice Call to Patient Failed: {e}")
                    
                    # 3. MONITOR CALL STATUS FOR CAREGIVER ESCALATION
                    target_caregiver = CAREGIVER_PHONE or os.getenv("TWILIO_CAREGIVER_PHONE", "")
                    if not target_caregiver:
                        logger.info("No Caregiver Phone configured. Set TWILIO_CAREGIVER_PHONE in env or Settings to enable secondary escalation.")
                        return

                    patient_attended = False
                    if patient_call_sid:
                        status_url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_SID}/Calls/{patient_call_sid}.json"
                        # Poll call outcome over 35 seconds (checks every 5s)
                        for _ in range(7):
                            time.sleep(5)
                            try:
                                stat_r = httpx.get(status_url, auth=(TWILIO_SID, TWILIO_TOKEN), timeout=8.0)
                                if stat_r.status_code == 200:
                                    c_data = stat_r.json()
                                    c_status = c_data.get("status")
                                    c_duration = int(c_data.get("duration") or 0)
                                    logger.info(f"Patient Call SID {patient_call_sid} status: {c_status}, duration: {c_duration}s")
                                    
                                    if c_status == "completed" and c_duration > 3:
                                        patient_attended = True
                                        logger.info("✓ Patient answered and attended the call! No caregiver escalation needed.")
                                        break
                                    elif c_status in ("no-answer", "busy", "failed", "canceled"):
                                        patient_attended = False
                                        logger.warning(f"⚠ Patient did NOT attend call (status: {c_status}). Initiating Caregiver Escalation Call!")
                                        break
                            except Exception as pe:
                                logger.warning(f"Error checking call status: {pe}")
                    else:
                        patient_attended = False

                    # 4. IF PATIENT UNATTENDED -> CALL CAREGIVER / GUARDIAN (YOUR NUMBER)
                    if not patient_attended:
                        logger.warning(f"🚨 CALLING CAREGIVER NOW: {target_caregiver} (Patient was unattended)!")
                        try:
                            # Send Emergency SMS to Caregiver
                            cg_sms_payload = f"To={urllib.parse.quote(target_caregiver)}&From={urllib.parse.quote(FROM_PHONE)}&Body=sms_account_alerts"
                            httpx.post(f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_SID}/Messages.json", headers=headers, content=cg_sms_payload, auth=(TWILIO_SID, TWILIO_TOKEN), timeout=10.0)

                            # Place Emergency Voice Call to Caregiver
                            cg_xml = "<Response>"
                            for _ in range(3):
                                cg_xml += f'<Say voice="Google.ta-IN-Standard-A" language="ta-IN">அவசர எச்சரிக்கை. நோயாளி அறை {compartment_num} மாத்திரையை எடுக்கவில்லை மற்றும் தொலைபேசி அழைப்பிற்கு பதிலளிக்கவில்லை. தயவுசெய்து உடனடியாக கவனிக்கவும்.</Say>'
                                cg_xml += f'<Say voice="Google.en-IN-Standard-A" language="en-IN">EMERGENCY CAREGIVER ALERT. Patient missed dose in compartment {compartment_num} and did NOT answer the phone call. Please check on the patient immediately.</Say>'
                            cg_xml += "</Response>"

                            cg_twimlet = 'https://twimlets.com/echo?Twiml=' + urllib.parse.quote(cg_xml)
                            cg_call_payload = f"To={urllib.parse.quote(target_caregiver)}&From={urllib.parse.quote(FROM_PHONE)}&Url={urllib.parse.quote(cg_twimlet)}"
                            cg_resp = httpx.post(f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_SID}/Calls.json", headers=headers, content=cg_call_payload, auth=(TWILIO_SID, TWILIO_TOKEN), timeout=15.0)

                            if cg_resp.status_code in (200, 201):
                                logger.info(f"✅ Emergency Caregiver Escalation Call placed successfully to {target_caregiver}!")
                            else:
                                logger.error(f"Caregiver call failed: {cg_resp.text}")

                            if u_id:
                                supabase.table("notifications").insert({
                                    "user_id": u_id,
                                    "title": "🚨 CAREGIVER ESCALATION CALL SENT!",
                                    "message": f"Patient did not answer dose call for Compartment {compartment_num}. Emergency escalation call dispatched to Caregiver ({target_caregiver}).",
                                    "type": "error",
                                    "is_read": False
                                }).execute()
                        except Exception as ce:
                            logger.error(f"Failed to place Caregiver Escalation Call: {ce}")
                
                # Run in background thread so MQTT loop is not blocked
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
                
                # Check if compartment is currently in MANUAL_OPEN mode
                is_manual_open = False
                try:
                    c_check = supabase.table("compartments").select("current_state").eq("id", comp_uuid).execute()
                    if c_check.data and c_check.data[0].get("current_state") == "MANUAL_OPEN":
                        is_manual_open = True
                except Exception as ce:
                    logger.warning(f"Error checking compartment state: {ce}")

                if is_manual_open:
                    logger.info(f"Compartment {compartment_num} is in MANUAL_OPEN mode — keeping lid OPEN despite IR event.")
                else:
                    # TWO-WAY COMMUNICATION: Update DB when ESP32 reports lid is closed
                    # DOSE_MISSED: ESP32 already closed the lid itself - just update DB
                    # IR_TRIGGERED: Pill was taken - update DB AND advance dose engine to next compartment
                    if event_type in ["IR_TRIGGERED", "DOSE_MISSED"]:
                        supabase.table("compartments").update({
                            "servo_status": "CLOSED",
                            "ir_status": "CLEAR"
                        }).eq("id", comp_uuid).execute()
                        logger.info(f"Updated Compartment {compartment_num} to CLOSED on dashboard.")

                    # ONLY advance dose sequence on IR_TRIGGERED (pill actually taken)
                    # NEVER on DOSE_MISSED - that would send CLOSE_LID back causing immediate close!
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
