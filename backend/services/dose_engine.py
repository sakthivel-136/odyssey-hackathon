import logging
import time
import asyncio
from datetime import datetime
from database import get_supabase
from mqtt_client import mqtt_manager

logger = logging.getLogger(__name__)

class DoseEngine:
    def __init__(self):
        self.active_sequences = {}
        # Format: { "dose_event_id": { "current_step_idx": 0, "steps": [...], "device_id": str } }
        self.demo_mode_time = None
        self.is_demo_mode = False

    async def scheduler_loop(self):
        logger.info("Starting Dose Sequence Scheduler Loop")
        while True:
            try:
                self.check_schedules()
            except Exception as e:
                logger.error(f"Scheduler loop error: {e}")
            await asyncio.sleep(10) # check every 10 seconds

    def set_demo_mode(self, current_demo_time: str):
        # time format: HH:MM:SS
        self.is_demo_mode = True
        self.demo_mode_time = current_demo_time
        logger.info(f"Demo mode activated. Time set to {self.demo_mode_time}")
        self.check_schedules() # immediately check

    def check_schedules(self):
        supabase = get_supabase()
        
        # Get current time string HH:MM:SS
        if self.is_demo_mode and self.demo_mode_time:
            now_str = self.demo_mode_time
            now_date = datetime.now().date().isoformat()
        else:
            now = datetime.now()
            now_str = now.strftime("%H:%M:%S")
            now_date = now.date().isoformat()
            
        # We need a small window for real time matching, e.g. within the minute
        # For simplicity, we just query schedules exactly matching HH:MM
        current_hm = now_str[:5] # "HH:MM"
        
        # Calculate T-5 minutes for Pre-Alert
        from datetime import timedelta
        now_dt = datetime.strptime(now_str[:5], "%H:%M")
        t_plus_5 = (now_dt + timedelta(minutes=5)).strftime("%H:%M")
        
        schedules_res = supabase.table("schedules").select("*, devices(device_id)").eq("is_active", True).execute()
        
        for sched in schedules_res.data:
            sched_time = sched["schedule_time"][:5]
            
            # If it's exactly schedule time, open lid!
            if sched_time == current_hm:
                self.trigger_schedule(sched, now_date)
            
            # If it's exactly 5 minutes before schedule time, send PRE_ALERT!
            if sched_time == t_plus_5:
                # Send PRE_ALERT MQTT command
                mqtt_manager.publish_command(sched["devices"]["device_id"], {
                    "command_id": f"pre_alert_{sched['id']}",
                    "cmd": "PRE_ALERT",
                    "compartment_number": 0
                })
                logger.info(f"Sent PRE_ALERT for schedule {sched['id']} (T-5 mins)")

    def trigger_schedule(self, schedule, event_date):
        supabase = get_supabase()
        schedule_id = schedule["id"]
        
        # Check if already triggered today
        existing = supabase.table("dose_events").select("id").eq("schedule_id", schedule_id).eq("event_date", event_date).execute()
        if existing.data:
            return # already running or completed today
            
        logger.info(f"Triggering schedule {schedule_id}")
        
        # Get items ordered by step
        items_res = supabase.table("schedule_items").select("*").eq("schedule_id", schedule_id).order("step_order").execute()
        if not items_res.data:
            return
            
        steps = items_res.data
        device_id_uuid = schedule["device_id"]
        actual_device_id = schedule["devices"]["device_id"]
        
        # Create dose event record
        dose_res = supabase.table("dose_events").insert({
            "device_id": device_id_uuid,
            "schedule_id": schedule_id,
            "event_date": event_date,
            "scheduled_time": schedule["schedule_time"],
            "status": "IN_PROGRESS"
        }).execute()
        
        dose_event_id = dose_res.data[0]["id"]
        
        self.active_sequences[dose_event_id] = {
            "current_step_idx": 0,
            "steps": steps,
            "device_uuid": device_id_uuid,
            "device_id_str": actual_device_id,
            "state": "WAITING_OPEN" # WAITING_OPEN -> WAITING_IR -> WAITING_CLOSE -> NEXT_STEP
        }
        
        self.execute_current_step(dose_event_id)

    def execute_current_step(self, dose_event_id):
        seq = self.active_sequences.get(dose_event_id)
        if not seq: return
        
        step_idx = seq["current_step_idx"]
        if step_idx >= len(seq["steps"]):
            self.complete_sequence(dose_event_id)
            return
            
        step = seq["steps"][step_idx]
        compartment_id = step["compartment_id"]
        
        # We need the compartment number
        supabase = get_supabase()
        comp_res = supabase.table("compartments").select("compartment_number").eq("id", compartment_id).execute()
        comp_num = comp_res.data[0]["compartment_number"]
        
        seq["current_compartment_num"] = comp_num
        seq["state"] = "WAITING_IR"
        
        # Send OPEN command
        mqtt_manager.publish_command(seq["device_id_str"], {
            "command_id": f"cmd_dose_{dose_event_id}_{step_idx}",
            "cmd": "OPEN_LID",
            "compartment_number": comp_num,
            "dose_quantity": step["dose_quantity"]
        })
        logger.info(f"DoseEngine: Opening Compartment {comp_num} for Dose {dose_event_id}")

    def on_ir_interaction(self, device_uuid, compartment_uuid):
        # Find active sequence
        for dose_id, seq in self.active_sequences.items():
            if seq["device_uuid"] == device_uuid:
                step = seq["steps"][seq["current_step_idx"]]
                if step["compartment_id"] == compartment_uuid and seq["state"] == "WAITING_IR":
                    logger.info(f"DoseEngine: IR Interaction detected for Dose {dose_id}")
                    seq["state"] = "WAITING_CLOSE"
                    
                    # Log to dose history that this step was taken
                    
                    # Auto close
                    mqtt_manager.publish_command(seq["device_id_str"], {
                        "command_id": f"cmd_close_{dose_id}_{seq['current_step_idx']}",
                        "cmd": "CLOSE_LID",
                        "compartment_number": seq["current_compartment_num"]
                    })
                    
                    # Advance step
                    seq["current_step_idx"] += 1
                    
                    # To support multiple medicines in the same compartment, 
                    # we wait 5 seconds before triggering the next step so the physical lid has time to close.
                    import threading
                    def trigger_next():
                        import time
                        time.sleep(5)
                        self.execute_current_step(dose_id)
                    
                    threading.Thread(target=trigger_next).start()
                    return

    def complete_sequence(self, dose_event_id):
        logger.info(f"DoseEngine: Sequence Complete for Dose {dose_event_id}")
        supabase = get_supabase()
        supabase.table("dose_events").update({
            "status": "COMPLETED",
            "taken_time": "now()"
        }).eq("id", dose_event_id).execute()
        
        del self.active_sequences[dose_event_id]

dose_engine = DoseEngine()
