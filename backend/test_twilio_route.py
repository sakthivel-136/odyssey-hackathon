from fastapi import APIRouter
import os
import httpx
import urllib.parse
import threading
import time

router = APIRouter()

@router.get("/api/test-twilio")
def test_twilio_endpoint(phone: str = None):
    def run_twilio():
        TWILIO_SID = os.getenv("TWILIO_SID")
        TWILIO_TOKEN = os.getenv("TWILIO_TOKEN")
        TO_PHONE = phone or os.getenv("TWILIO_TO_PHONE", "+919150372420")
        FROM_PHONE = os.getenv("TWILIO_FROM_PHONE", "+17372508034")
        
        if not TWILIO_SID or not TWILIO_TOKEN:
            print("ERROR: Missing Twilio Credentials in environment variables!")
            return
            
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        
        # 1. SMS
        try:
            sms_payload = f"To={urllib.parse.quote(TO_PHONE)}&From={urllib.parse.quote(FROM_PHONE)}&Body=ALERT: You have missed your scheduled medication. Please take it immediately."
            sms_url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_SID}/Messages.json"
            res = httpx.post(sms_url, headers=headers, content=sms_payload, auth=(TWILIO_SID, TWILIO_TOKEN), timeout=10.0)
            print("SMS Response:", res.status_code, res.text)
        except Exception as e:
            print("SMS Error:", e)
            
        time.sleep(2)
        
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
            print("Call Response:", res2.status_code, res2.text)
        except Exception as e:
            print("Call Error:", e)

    threading.Thread(target=run_twilio).start()
    return {"status": "Twilio test triggered in background. Check your phone in 5 seconds."}
