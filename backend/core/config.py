from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_JWT_SECRET: Optional[str] = "sHdpEVxlBmUB9rKPnlfpyl5Fap77MZmhFQNULd4DPVRK8zLmhCQH2u8WjlN2chi7odjIy3NGuf1vabqmoyn4QQ=="
    JWT_SECRET: Optional[str] = "sHdpEVxlBmUB9rKPnlfpyl5Fap77MZmhFQNULd4DPVRK8zLmhCQH2u8WjlN2chi7odjIy3NGuf1vabqmoyn4QQ=="
    MQTT_BROKER: str = "broker.hivemq.com"
    MQTT_PORT: int = 1883
    MQTT_USERNAME: Optional[str] = None
    MQTT_PASSWORD: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    TWILIO_SID: Optional[str] = None
    TWILIO_TOKEN: Optional[str] = None
    TWILIO_TO_PHONE: Optional[str] = None

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
