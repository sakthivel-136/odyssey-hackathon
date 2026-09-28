from fastapi import APIRouter
import os
import httpx
import urllib.parse
import time

router = APIRouter()

@router.get("/api/test-twilio")
def test_twilio_endpoint(phone: str = None):
    TWILIO_SID = os.getenv("TWILIO_SID")
    TWILIO_TOKEN = os.getenv("TWILIO_TOKEN")
    TO_PHONE = phone or os.getenv("TWILIO_TO_PHONE", "+919150372420")
    FROM_PHONE = os.getenv("TWILIO_FROM_PHONE", "+17372508034")
    
    if not TWILIO_SID or not TWILIO_TOKEN:
        return {"error": "Missing Twilio Credentials in environment variables on Render!"}
        
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    results = {}
    
    # 1. SMS
    try:
        sms_payload = f"To={urllib.parse.quote(TO_PHONE)}&From={urllib.parse.quote(FROM_PHONE)}&Body=ALERT: You have missed your scheduled medication. Please take it immediately."
        sms_url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_SID}/Messages.json"
        res = httpx.post(sms_url, headers=headers, content=sms_payload, auth=(TWILIO_SID, TWILIO_TOKEN), timeout=10.0)
        results["sms_status"] = res.status_code
        results["sms_response"] = res.text
    except Exception as e:
        results["sms_error"] = str(e)
        
    # 2. CALL
    try:
        xml_content = "<Response>"
        for _ in range(2):
            xml_content += f'<Say voice="Google.ta-IN-Standard-A" language="ta-IN">வணக்கம். தயவுசெய்து உங்கள் மாத்திரையை உடனடியாக எடுத்துக்கொள்ளவும்.</Say>'
            xml_content += f'<Say voice="Google.en-IN-Standard-A" language="en-IN">Hello user, please take your medicine immediately.</Say>'
        xml_content += "</Response>"
        
        twimlet_url = 'https://twimlets.com/echo?Twiml=' + urllib.parse.quote(xml_content)
        call_payload = f"To={urllib.parse.quote(TO_PHONE)}&From={urllib.parse.quote(FROM_PHONE)}&Url={urllib.parse.quote(twimlet_url)}"
        call_url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_SID}/Calls.json"
        
        res2 = httpx.post(call_url, headers=headers, content=call_payload, auth=(TWILIO_SID, TWILIO_TOKEN), timeout=15.0)
        results["call_status"] = res2.status_code
        results["call_response"] = res2.text
    except Exception as e:
        results["call_error"] = str(e)

    return results
