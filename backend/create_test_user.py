import os
from supabase import create_client, Client

url = os.environ.get("SUPABASE_URL", "https://shpyyfsmagztzcsnihja.supabase.co")
key = os.environ.get("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNocHl5ZnNtYWd6dHpjc25paGphIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDM0NTk1MywiZXhwIjoyMTA1OTIxOTUzfQ.bCPFWsLgH23bULSzKNRgRR6PHC_YmNW6MBsz8oE5Buo")

supabase: Client = create_client(url, key)

email = "demo@medibox.com"
password = "Password123!"

try:
    res = supabase.auth.admin.create_user({
        "email": email,
        "password": password,
        "email_confirm": True
    })
    print(f"Success! Created user {email}")
except Exception as e:
    print(f"Error (user might already exist): {e}")
