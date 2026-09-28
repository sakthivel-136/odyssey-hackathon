import paho.mqtt.client as mqtt
import json
import time
import logging
from threading import Thread

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("ESP32_SIM")

BROKER = "test.mosquitto.org"
PORT = 1883

class MediboxSimulator:
    def __init__(self, device_id: str):
        self.device_id = device_id
        self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=f"sim_{device_id}")
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.running = False
        
        self.topic_cmd = f"medibox/{self.device_id}/command"
        self.topic_ack = f"medibox/{self.device_id}/ack"
        self.topic_evt = f"medibox/{self.device_id}/event"
        self.topic_sts = f"medibox/{self.device_id}/status"
        self.topic_tel = f"medibox/{self.device_id}/telemetry"

    def start(self):
        self.client.connect(BROKER, PORT, 60)
        self.client.loop_start()
        self.running = True
        
        # Start heartbeat thread
        Thread(target=self.heartbeat_loop, daemon=True).start()
        logger.info(f"Simulator started for {self.device_id}")
        
    def stop(self):
        self.running = False
        self.client.publish(self.topic_sts, json.dumps({"status": "OFFLINE"}))
        self.client.loop_stop()
        self.client.disconnect()
        logger.info("Simulator stopped.")

    def on_connect(self, client, userdata, flags, rc, properties=None):
        logger.info(f"Connected to MQTT broker (rc={rc})")
        client.subscribe(self.topic_cmd)
        # Send initial online status
        client.publish(self.topic_sts, json.dumps({"status": "ONLINE"}))

    def on_message(self, client, userdata, msg):
        payload = msg.payload.decode('utf-8')
        logger.info(f"Command RX: {payload}")
        try:
            data = json.loads(payload)
            cmd_id = data.get("command_id")
            cmd = data.get("command")
            comp_id = data.get("compartment_id")
            
            # Send PENDING ACK
            if cmd_id:
                self.send_ack(cmd_id, "PENDING")
                
            if cmd == "OPEN_COMPARTMENT":
                self.simulate_open_sequence(cmd_id, comp_id)
            elif cmd == "RESET":
                logger.warning("RESET COMMAND RECEIVED - Entering pairing mode")
                if cmd_id:
                    self.send_ack(cmd_id, "COMPLETED")
                
        except Exception as e:
            logger.error(f"Error handling message: {e}")

    def send_ack(self, cmd_id, status):
        payload = {"command_id": cmd_id, "status": status}
        self.client.publish(self.topic_ack, json.dumps(payload))
        logger.info(f"ACK TX: {payload}")

    def simulate_open_sequence(self, cmd_id, comp_id):
        # ACK
        self.send_ack(cmd_id, "ACKNOWLEDGED")
        
        # Simulate servo opening
        logger.info(f"OLED: C{comp_id} OPEN - TAKE MEDICINE")
        time.sleep(1) # opening...
        
        self.client.publish(self.topic_evt, json.dumps({
            "event_id": f"evt_{int(time.time())}",
            "event": "COMPARTMENT_OPENED",
            "compartment_id": comp_id
        }))
        
        # We can either wait for a manual interactive command in the simulator to trigger IR,
        # or auto-trigger it after a few seconds for testing.
        logger.info("Waiting for IR interaction...")
        time.sleep(3)
        
        # IR Interaction detected
        logger.info(f"OLED: C{comp_id} DETECTED - CLOSING...")
        self.client.publish(self.topic_evt, json.dumps({
            "event_id": f"evt_{int(time.time())}",
            "event": "IR_INTERACTION_DETECTED",
            "compartment_id": comp_id
        }))
        
        time.sleep(1) # closing...
        
        # Closed
        self.client.publish(self.topic_evt, json.dumps({
            "event_id": f"evt_{int(time.time())}",
            "event": "COMPARTMENT_CLOSED",
            "compartment_id": comp_id
        }))
        
        # Complete Command
        if cmd_id:
            self.send_ack(cmd_id, "COMPLETED")

    def heartbeat_loop(self):
        while self.running:
            self.client.publish(self.topic_sts, json.dumps({"status": "ONLINE"}))
            self.client.publish(self.topic_tel, json.dumps({
                "uptime": int(time.time()),
                "wifi_rssi": -65,
                "firmware_version": "1.0.0",
                "sensor_status": {"ir": "OK", "servo": "OK"}
            }))
            time.sleep(30)

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python esp32_sim.py <DEVICE_ID>")
        sys.exit(1)
        
    device_id = sys.argv[1]
    sim = MediboxSimulator(device_id)
    sim.start()
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        sim.stop()
