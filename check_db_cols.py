from backend.database import get_supabase
supabase = get_supabase()
res = supabase.table("orders").select("*").limit(1).execute()
if res.data:
    print(res.data[0].keys())
else:
    print("No orders, trying to insert and rollback or just fetch.")
