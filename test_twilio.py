import os
import httpx
import urllib.parse

def test_call():
    TWILIO_SID = "AC_DUMMY"
    TWILIO_TOKEN = "DUMMY"
    TO_PHONE = "+919150372420"
    FROM_PHONE = "+17372508034"
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    
    xml_content = "<Response><Say>Test</Say></Response>"
    twimlet_url = 'https://twimlets.com/echo?Twiml=' + urllib.parse.quote(xml_content)
    call_payload = f"To={urllib.parse.quote(TO_PHONE)}&From={urllib.parse.quote(FROM_PHONE)}&Url={urllib.parse.quote(twimlet_url)}"
    call_url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_SID}/Calls.json"
    
    print("Testing call format...")
    print("URL:", call_url)
    print("Payload:", call_payload)

test_call()
