import asyncio
import sys
import os
import logging
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO)
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
from database import get_supabase

async def main():
    print("Running AI insights fallback seeder...")
    supabase = get_supabase()
    
    users_res = supabase.auth.admin.list_users()
    user_ids = [u.id for u in users_res]
    
    for user_id in user_ids:
        # Save dummy AI Insight since Groq model access failed
        try:
            supabase.table("ai_insights").insert({
                "user_id": user_id,
                "insight_type": "HOURLY",
                "title": "Welcome to Smart Medibox!",
                "description": "Your friendly Llama 3.1 AI companion is online and ready to help.\n\n- Add your first medication schedule to get personalized insights.\n- Keep your Medibox powered on for telemetry tracking.",
                "relevance_score": 1.0
            }).execute()
            print(f"Success for {user_id}")
        except Exception as e:
            print(f"Failed for {user_id}: {e}")
            
    print("Done!")

if __name__ == "__main__":
    asyncio.run(main())
