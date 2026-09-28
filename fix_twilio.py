import re

with open("backend/mqtt_client.py", "r") as f:
    content = f.read()

# Replace hardcoded Twilio secrets with os.getenv
new_content = re.sub(r'TWILIO_SID = ".*?"', 'TWILIO_SID = os.getenv("TWILIO_SID", "AC_DUMMY")', content)
new_content = re.sub(r'TWILIO_TOKEN = ".*?"', 'TWILIO_TOKEN = os.getenv("TWILIO_TOKEN", "DUMMY_TOKEN")', content)
new_content = re.sub(r'TO_PHONE = ".*?"', 'TO_PHONE = os.getenv("TWILIO_TO_PHONE", "+919150372420")', new_content)
new_content = re.sub(r'FROM_PHONE = ".*?"', 'FROM_PHONE = os.getenv("TWILIO_FROM_PHONE", "+17372508034")', new_content)

if "import os" not in new_content:
    new_content = "import os\n" + new_content

with open("backend/mqtt_client.py", "w") as f:
    f.write(new_content)
print("Twilio secrets removed.")
