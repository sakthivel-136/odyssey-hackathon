import paho.mqtt.client as mqtt
import json
import time

MQTT_BROKER = "broker.hivemq.com"
MQTT_PORT = 1883
DEVICE_ID = "medibox123"

def on_connect(client, userdata, flags, rc):
    print(f"Connected to HiveMQ with result code {rc}")
    
    # 1. Simulate device opening container
    print("Simulating container opening...")
    
    # 2. Simulate 60-second wait (we'll just wait 3 seconds for speed, but tell the user)
    print("Waiting for user to take pill (simulating 60s timeout in 3s)...")
    time.sleep(3)
    
    # 3. Simulate DOSE_MISSED event
    event_payload = {
        "event_id": f"evt_{int(time.time())}",
        "event": "DOSE_MISSED",
        "compartment_id": 1,
        "timestamp": int(time.time())
    }
    
    print(f"Publishing DOSE_MISSED to device/{DEVICE_ID}/events...")
    client.publish(f"device/{DEVICE_ID}/events", json.dumps(event_payload), qos=1)
    print("Payload published!")
    
    # Disconnect after a second
    time.sleep(1)
    client.disconnect()

client = mqtt.Client()
client.on_connect = on_connect
client.connect(MQTT_BROKER, MQTT_PORT, 60)
client.loop_forever()
