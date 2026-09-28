import paho.mqtt.client as mqtt
import json
import time

MQTT_BROKER = "broker.hivemq.com"
MQTT_PORT = 1883
DEVICE_ID = "medibox123"

def on_connect(client, userdata, flags, rc):
    print(f"Connected to HiveMQ with result code {rc}")
    
    command_payload = {
        "command_id": f"manual_cmd_{int(time.time())}",
        "cmd": "OPEN_LID",
        "compartment_number": 1,
        "dose_quantity": 1
    }
    
    topic = f"medibox/{DEVICE_ID}/command"
    print(f"Publishing to {topic}: {command_payload}")
    
    client.publish(topic, json.dumps(command_payload), qos=1)
    print("Command sent! Your physical lid should open right now.")
    
    time.sleep(1)
    client.disconnect()

client = mqtt.Client()
client.on_connect = on_connect
client.connect(MQTT_BROKER, MQTT_PORT, 60)
client.loop_forever()
