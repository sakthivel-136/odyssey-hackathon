import paho.mqtt.client as mqtt
import time
import json
import sys

# Configuration
BROKER = 'test.mosquitto.org'
DEVICE_ID = 'Odyssey_Medibox'
TOPIC_CMD = f'medibox/{DEVICE_ID}/command'

def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print(f"✅ Connected to MQTT Broker: {BROKER}")
    else:
        print(f"❌ Failed to connect, return code {rc}")

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id='antigravity_diag_999')
client.on_connect = on_connect
client.connect(BROKER, 1883, 60)
client.loop_start()

time.sleep(1) # Wait for connection

def run_phase(compartment_num):
    print(f"\n====================================")
    print(f"🚀 PHASE {compartment_num}: TESTING COMPARTMENT {compartment_num}")
    print(f"====================================")
    
    # 1. Open Lid
    print(f"[{compartment_num}] Sending OPEN command...")
    payload_open = json.dumps({'cmd': 'OPEN_LID', 'compartment_number': compartment_num})
    client.publish(TOPIC_CMD, payload_open, qos=1)
    
    print(f"[{compartment_num}] Waiting 5 seconds (Servo should be at 90°, Green LED ON)...")
    for i in range(5, 0, -1):
        print(f"   {i}...")
        time.sleep(1)
        
    # 2. Close Lid
    print(f"[{compartment_num}] Sending CLOSE command...")
    payload_close = json.dumps({'cmd': 'CLOSE_LID', 'compartment_number': compartment_num})
    client.publish(TOPIC_CMD, payload_close, qos=1)
    
    print(f"[{compartment_num}] Waiting 3 seconds (Servo should be at 0°, LEDs OFF)...")
    time.sleep(3)
    print(f"✅ Phase {compartment_num} complete.")

try:
    print("\nStarting Medibox Full System Diagnostic Test over Wi-Fi...")
    run_phase(1)
    run_phase(2)
    run_phase(3)
    print("\n🎉 ALL PHASES COMPLETE! If any servos did not move, check hardware wiring.")
except KeyboardInterrupt:
    print("\nDiagnostic aborted.")
finally:
    client.loop_stop()
