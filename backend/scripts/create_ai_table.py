import os
import sys
import logging
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO)
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
from database import get_supabase

def main():
    supabase = get_supabase()
    # Execute raw SQL to create the table
    sql = """
    CREATE TABLE IF NOT EXISTS public.ai_insights (
        id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        insight_type VARCHAR(50) DEFAULT 'DAILY',
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        relevance_score FLOAT DEFAULT 1.0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );
    """
    try:
        supabase.postgrest.client.rpc("exec_sql", {"query": sql}).execute()
        print("Created ai_insights table.")
    except Exception as e:
        print("Error executing SQL (maybe exec_sql doesn't exist). Attempting alternative.")
        print(e)

if __name__ == "__main__":
    main()
