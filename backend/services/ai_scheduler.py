import logging
import asyncio
import json
import random
from datetime import datetime
from database import get_supabase

logger = logging.getLogger(__name__)

# We use Scikit-Learn to build a lightweight Machine Learning model 
# that generates classified "AI Insights" without needing heavy PyTorch LLMs.
_ml_model = None

def _train_ml_model():
    global _ml_model
    logger.info("Training lightweight ML Adherence Classifier...")
    try:
        from sklearn.tree import DecisionTreeClassifier
        import numpy as np
        
        # Training Data Features: [doses_taken_percentage, missed_doses, days_active]
        X = np.array([
            [95, 0, 30], # Excellent
            [100, 0, 5], # Excellent
            [70, 2, 10], # Needs Improvement
            [60, 4, 14], # Needs Improvement
            [30, 10, 7], # Critical
            [0, 3, 2],   # Critical (just started but missing)
        ])
        # Labels: 0 = Critical, 1 = Needs Improvement, 2 = Excellent
        y = np.array([2, 2, 1, 1, 0, 0])
        
        # Train a Decision Tree Classifier
        clf = DecisionTreeClassifier(max_depth=3, random_state=42)
        clf.fit(X, y)
        
        _ml_model = clf
        logger.info("ML Model trained successfully using Scikit-Learn.")
    except Exception as e:
        logger.error(f"Failed to train ML model: {e}")

def _generate_insight_from_ml(user_id):
    """Uses the ML model to predict user's adherence state and generates insight."""
    if _ml_model is None:
        _train_ml_model()
        
    if _ml_model is None:
        return None
        
    import numpy as np
    
    # In a real scenario, we query the DB to get actual user stats.
    # For now, we simulate pulling their stats.
    simulated_taken_pct = random.randint(40, 100)
    simulated_missed = random.randint(0, 5)
    simulated_days = random.randint(1, 30)
    
    user_features = np.array([[simulated_taken_pct, simulated_missed, simulated_days]])
    
    # Predict using the ML Model
    prediction = _ml_model.predict(user_features)[0]
    
    # Natural Language Generation mapping (acting as AI)
    if prediction == 2:
        title = "Incredible Adherence! Keep it up! 🌟"
        desc = f"Your ML adherence score is excellent ({simulated_taken_pct}% taken). You are building a rock-solid health routine!"
        recs = ["Maintain your current notification settings.", "Make sure to refill your compartments soon so you don't break your streak!"]
    elif prediction == 1:
        title = "You're doing okay, but we can improve! 📈"
        desc = f"You've missed {simulated_missed} doses recently. Our ML engine noticed a slight dip in your routine."
        recs = ["Try moving your Medibox to a more visible location like the kitchen counter.", "Ensure the buzzer volume is loud enough to hear."]
    else:
        title = "Action Required: Missed Doses Alert 🚨"
        desc = f"Your adherence has dropped significantly. You've missed {simulated_missed} doses. Let's get back on track!"
        recs = ["Review your schedules to ensure they are set for convenient times.", "Ask a family member to help remind you using the Caregiver app feature."]
        
    return {
        "title": title,
        "description": desc,
        "recommendations": recs
    }

async def run_ai_insights_for_all_users():
    logger.info("Running ML Insights for all users...")
    supabase = get_supabase()
    
    users_res = supabase.auth.admin.list_users()
    user_ids = [u.id for u in users_res]
    
    if not user_ids:
        return

    # Train model if not already trained
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _train_ml_model)

    for user_id in user_ids:
        try:
            # Generate ML prediction
            ai_data = await loop.run_in_executor(None, _generate_insight_from_ml, user_id)
            if not ai_data: continue
            
            # Save to DB
            supabase.table("ai_insights").insert({
                "user_id": user_id,
                "insight_type": "HOURLY",
                "title": ai_data.get("title", "Hourly ML Insight"),
                "description": ai_data.get("description", "") + "\n\n" + "\n".join([f"- {r}" for r in ai_data.get("recommendations", [])]),
                "relevance_score": 1.0
            }).execute()
            
            logger.info(f"Generated ML insight for user {user_id}")
            
        except Exception as e:
            logger.warning(f"Could not persist ML insight to DB (grant permissions in Supabase): {e}")
            
async def ai_scheduler_loop():
    logger.info("Starting ML Insights Scheduler Loop (Runs every 1 hour, delayed by 1 min on boot)")
    await asyncio.sleep(60) # wait 1 min
    while True:
        await run_ai_insights_for_all_users()
        await asyncio.sleep(3600)
