import asyncio
from backend.database import get_supabase

async def main():
    supabase = get_supabase()
    res = supabase.table('devices').select('*').execute()
    print(res.data)

asyncio.run(main())
