from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from database import get_supabase
from api.auth import get_current_user
import os
import json
import urllib.request

router = APIRouter(prefix="/api/ai", tags=["AI"])

class AIInsightResponse(BaseModel):
    insight_text: str
    recommendations: list[str]

@router.get("/daily-insight")
def get_daily_insight(user = Depends(get_current_user)):
    supabase = get_supabase()
    
    import datetime
    today = datetime.datetime.now().date().isoformat()
    
    res = supabase.table("ai_insights").select("*").eq("user_id", user.id).gte("created_at", today).execute()
    if res.data:
        return {"insight": res.data[0]}
        
    meds_res = supabase.table("medicines").select("*").eq("user_id", user.id).execute()
    meds = meds_res.data
    
    scheds_res = supabase.table("schedules").select("*, schedule_items(*)").eq("user_id", user.id).execute()
    scheds = scheds_res.data
    
    history_res = supabase.table("dose_events").select("*").order("created_at", desc=True).limit(20).execute()
    history = history_res.data
    
    prompt = f"""
You are an AI Health Companion for a smart medicine box powered by Qwen3. 
Analyze the following user data and provide a friendly, encouraging morning greeting and 1-2 practical recommendations for their adherence.

Medicines: {json.dumps(meds)}
Schedules: {json.dumps(scheds)}
Recent History: {json.dumps(history)}

Output strictly in valid JSON format ONLY:
{{
    "title": "A short engaging title (e.g., Great Job this Week!)",
    "description": "Your friendly 2-sentence morning greeting and analysis",
    "recommendations": ["Recommendation 1", "Recommendation 2"]
}} /no_think
"""
    
    try:
        from services.ai_scheduler import _qwen_tokenizer, _qwen_model, _load_model
        
        if _qwen_model is None:
            _load_model()
            
        messages = [{"role": "system", "content": "You are a helpful JSON-outputting health assistant. Only output raw JSON."}, {"role": "user", "content": prompt}]
        text = _qwen_tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
            enable_thinking=False
        )
        model_inputs = _qwen_tokenizer([text], return_tensors="pt").to(_qwen_model.device)
        
        generated_ids = _qwen_model.generate(**model_inputs, max_new_tokens=1024, temperature=0.7, top_p=0.8, top_k=20)
        output_ids = generated_ids[0][len(model_inputs.input_ids[0]):].tolist()
        content = _qwen_tokenizer.decode(output_ids, skip_special_tokens=True).strip("\n")
        
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].strip()
            
        ai_data = json.loads(content)
        
        desc = ai_data.get("description", "") + "\n\n" + "\n".join([f"- {r}" for r in ai_data.get("recommendations", [])])
        
        insert_res = supabase.table("ai_insights").insert({
            "user_id": user.id,
            "insight_type": "DAILY",
            "title": ai_data.get("title", "Daily Insight"),
            "description": desc,
            "relevance_score": 1.0
        }).execute()
        
        return {"insight": insert_res.data[0]}
    except Exception as e:
        print(f"Qwen3 AI Error: {e}")
        fallback = {
            "title": "Welcome to Smart Medibox",
            "description": "Make sure to take all your medications today! (Local AI Error)"
        }
        return {"insight": fallback}
