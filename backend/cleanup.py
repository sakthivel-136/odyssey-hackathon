import os
from supabase import create_client

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    from dotenv import load_dotenv
    load_dotenv("../frontend/.env.local")
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

supabase = create_client(url, key)

tables = [
    "device_commands",
    "schedule_items",
    "schedules",
    "medicine_compartments",
    "compartments",
    "medicines",
    "devices"
]

for table in tables:
    print(f"Cleaning {table}...")
    res = supabase.table(table).delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    print(f"Deleted {len(res.data) if res.data else 0} rows from {table}")

print("Clean up complete!")
