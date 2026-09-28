import os
import requests
from supabase import create_client, Client

url = os.environ.get("SUPABASE_URL", "https://shpyyfsmagztzcsnihja.supabase.co")
key = os.environ.get("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNocHl5ZnNtYWd6dHpjc25paGphIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDM0NTk1MywiZXhwIjoyMTA1OTIxOTUzfQ.bCPFWsLgH23bULSzKNRgRR6PHC_YmNW6MBsz8oE5Buo")

supabase: Client = create_client(url, key)

res = supabase.auth.sign_in_with_password({"email": "demo@medibox.com", "password": "Password123!"})
token = res.session.access_token

import httpx

r = httpx.get("http://localhost:8000/api/devices/", headers={"Authorization": f"Bearer {token}"})
print(r.status_code)
print(r.text)
