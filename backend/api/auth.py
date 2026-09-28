from fastapi import APIRouter, Depends, HTTPException, Header
from database import get_supabase
from core.config import settings
import jwt
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    token = authorization.replace("Bearer ", "").strip()
    
    # 1. Fast offline JWT verification if secret is configured in env
    secret = settings.SUPABASE_JWT_SECRET or settings.JWT_SECRET
    if secret:
        try:
            payload = jwt.decode(token, secret, algorithms=["HS256"], audience="authenticated")
            user_id = payload.get("sub")
            if user_id:
                class DecodedUser:
                    id = user_id
                    email = payload.get("email", "")
                return DecodedUser()
        except Exception as jwt_err:
            logger.debug(f"Local JWT decode fallback: {jwt_err}")

    # 2. Supabase API verification fallback
    supabase = get_supabase()
    try:
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_response.user
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")
