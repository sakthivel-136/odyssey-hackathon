import os
import uuid
from supabase import create_client, Client

url = os.environ.get("SUPABASE_URL", "https://shpyyfsmagztzcsnihja.supabase.co")
key = os.environ.get("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNocHl5ZnNtYWd6dHpjc25paGphIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDM0NTk1MywiZXhwIjoyMTA1OTIxOTUzfQ.bCPFWsLgH23bULSzKNRgRR6PHC_YmNW6MBsz8oE5Buo")

supabase: Client = create_client(url, key)

# Get user
user_res = supabase.auth.admin.list_users()
user_id = user_res[0].id if user_res else None

device_id = "MEDIBOX-DEMO"
token = str(uuid.uuid4())

# Create device
try:
    supabase.table("devices").insert({
        "device_id": device_id,
        "device_name": "Demo Medibox",
        "device_model": "V1-PRO",
        "compartment_count": 3,
        "pairing_token": token,
        "is_paired": True,
        "owner_id": user_id
    }).execute()
    print("Device created and paired!")
except Exception as e:
    print("Device probably already exists.")

# Start simulator
os.system(f"python3 ../simulator/esp32_sim.py {device_id}")
