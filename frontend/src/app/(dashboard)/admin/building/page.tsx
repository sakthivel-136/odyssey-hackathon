'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Wrench, FileCode2, Download, CheckCircle, Clock } from 'lucide-react';
import QRCode from 'react-qr-code';
import { useRouter } from 'next/navigation';

export default function AdminBuildingPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const { data } = await supabase.from('orders').select('*').eq('status', 'BUILDING').order('created_at', { ascending: false });
    if (data) setOrders(data);
    setLoading(false);
  };

  const generateCppCode = (boxName: string, numContainers: number) => {
    return `#include <WiFi.h>
#include <WiFiManager.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

String DEVICE_ID = "${boxName}";
String MQTT_CLIENT_ID = "${boxName}_" + String(random(1000, 9999));
const int NUM_CONTAINERS = ${numContainers};

const char* mqtt_server = "broker.hivemq.com"; 
const int mqtt_port = 1883;

WiFiClient espClient;
PubSubClient client(espClient);

#define RESET_BTN_PIN  0 
#define BUZZER_PIN     15

// Yellow LED for PRE-ALERT
#define PRE_ALERT_LED_PIN 27 

struct Compartment {
  uint8_t servoPin;
  uint8_t irPin;
  uint8_t ledG;
  uint8_t ledR;
  Servo servo;
  
  bool waitingForTake;
  unsigned long openedAt;
  
  // States for IR clearing & 5-second delay
  bool handDetected;
  unsigned long handRemovedAt;
  bool waitingToClose;
};

// Default pinouts for up to 6 compartments
Compartment comps[6] = {
  {25, 34, 4,  5,  Servo(), false, 0, false, 0, false},
  {13, 35, 18, 19, Servo(), false, 0, false, 0, false},
  {14, 36, 32, 33, Servo(), false, 0, false, 0, false},
  {26, 39, 21, 22, Servo(), false, 0, false, 0, false},
  {27, 32, 23, 1,  Servo(), false, 0, false, 0, false},
  {12, 33, 3,  2,  Servo(), false, 0, false, 0, false}
};

LiquidCrystal_I2C lcd(0x27, 16, 2);

int buzzerBeepsRemaining = 0;
unsigned long lastBuzzerToggle = 0;
bool buzzerState = false;

void setup() {
  Serial.begin(115200);
  Wire.begin();
  lcd.init();
  lcd.backlight();
  displayMessage("Smart Medibox", "Initializing...");

  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(PRE_ALERT_LED_PIN, OUTPUT);
  digitalWrite(PRE_ALERT_LED_PIN, LOW); // Off by default

  for (int i = 0; i < NUM_CONTAINERS; i++) {
    comps[i].servo.setPeriodHertz(50);
    comps[i].servo.attach(comps[i].servoPin, 500, 2400);
    comps[i].servo.write(0); // Close lid
    
    pinMode(comps[i].irPin, INPUT);
    pinMode(comps[i].ledG, OUTPUT);
    pinMode(comps[i].ledR, OUTPUT);
    
    // Idle state: Red ON, Green OFF
    digitalWrite(comps[i].ledR, HIGH);
    digitalWrite(comps[i].ledG, LOW);
  }

  WiFiManager wm;
  bool res = wm.autoConnect(DEVICE_ID.c_str());
  if (!res) ESP.restart();

  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);
  client.setKeepAlive(60);
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  unsigned long currentMillis = millis();

  // Buzzer non-blocking loop
  if (buzzerBeepsRemaining > 0 && currentMillis - lastBuzzerToggle >= 500) {
    lastBuzzerToggle = currentMillis;
    buzzerState = !buzzerState;
    digitalWrite(BUZZER_PIN, buzzerState ? HIGH : LOW);
    if (!buzzerState) buzzerBeepsRemaining--;
  } else if (buzzerBeepsRemaining <= 0) {
    digitalWrite(BUZZER_PIN, LOW);
  }

  // IR Sensor & Delay State Machine
  for (int i = 0; i < NUM_CONTAINERS; i++) {
    if (comps[i].waitingForTake) {
      int irVal = digitalRead(comps[i].irPin); // Assuming LOW = object detected

      if (irVal == LOW && !comps[i].handDetected) {
        // Hand just inserted
        comps[i].handDetected = true;
        Serial.println("Hand detected in compartment " + String(i + 1));
      } 
      else if (irVal == HIGH && comps[i].handDetected && !comps[i].waitingToClose) {
        // Hand just removed
        comps[i].handRemovedAt = currentMillis;
        comps[i].waitingToClose = true;
        comps[i].handDetected = false;
        Serial.println("Hand removed, starting 5s delay...");
      }

      // 5-Second Delay before closing
      if (comps[i].waitingToClose && (currentMillis - comps[i].handRemovedAt >= 5000)) {
        Serial.println("Closing lid after 5s delay.");
        comps[i].servo.write(0); // Close lid
        
        // Green OFF, Red ON
        digitalWrite(comps[i].ledG, LOW);
        digitalWrite(comps[i].ledR, HIGH);
        
        comps[i].waitingForTake = false;
        comps[i].waitingToClose = false;
        
        // Stop buzzer
        buzzerBeepsRemaining = 0;
        digitalWrite(BUZZER_PIN, LOW);
        
        // Notify Backend
        StaticJsonDocument<200> doc;
        doc["event"] = "IR_TRIGGERED";
        doc["compartment"] = i + 1;
        doc["device_id"] = DEVICE_ID;
        char buffer[200];
        serializeJson(doc, buffer);
        client.publish(("medibox/" + DEVICE_ID + "/events").c_str(), buffer);
      }
      
      // Emergency: Lid open for >30s and pill not taken
      if (!comps[i].waitingToClose && currentMillis - comps[i].openedAt > 30000) {
        StaticJsonDocument<200> doc;
        doc["event"] = "DOSE_MISSED";
        doc["compartment"] = i + 1;
        doc["device_id"] = DEVICE_ID;
        char buffer[200];
        serializeJson(doc, buffer);
        client.publish(("medibox/" + DEVICE_ID + "/events").c_str(), buffer);
        comps[i].openedAt = currentMillis; // Reset timer so it doesn't spam
      }
    }
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String msg;
  for (int i = 0; i < length; i++) msg += (char)payload[i];
  
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, msg);
  if (error) return;

  String cmd = doc["cmd"];
  int compNum = doc["compartment_number"];
  int idx = compNum - 1;

  if (cmd == "PRE_ALERT") {
    // 5 Mins Before: Glow Yellow/Ready LED
    digitalWrite(PRE_ALERT_LED_PIN, HIGH);
    buzzerBeepsRemaining = 2; // Two short beeps for attention
    displayMessage("Schedule Soon", "Get Ready!");
  }
  else if (cmd == "OPEN_LID" && idx >= 0 && idx < NUM_CONTAINERS) {
    // Exact Schedule Time!
    digitalWrite(PRE_ALERT_LED_PIN, LOW); // Turn off pre-alert LED
    
    // Green ON, Red OFF
    digitalWrite(comps[idx].ledG, HIGH);
    digitalWrite(comps[idx].ledR, LOW);
    
    comps[idx].servo.write(90); // Open lid
    comps[idx].waitingForTake = true;
    comps[idx].openedAt = millis();
    comps[idx].handDetected = false;
    comps[idx].waitingToClose = false;
    
    // Continuous beeping until pill is taken
    buzzerBeepsRemaining = 9999;
    
    displayMessage("Time for Meds!", "Comp " + String(compNum));
  }
}

void reconnect() {
  if (millis() - lastReconnectAttempt > 5000) {
    lastReconnectAttempt = millis();
    if (client.connect(MQTT_CLIENT_ID.c_str())) {
      client.subscribe(("medibox/" + DEVICE_ID + "/command").c_str());
    }
  }
}

void displayMessage(const String& line1, const String& line2) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1.substring(0, 16));
  lcd.setCursor(0, 1);
  lcd.print(line2.substring(0, 16));
}
`;
  };

  const markBuilt = async (id: string) => {
    if (!selectedOrder) return;
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    await supabase.from('orders').update({ status: 'BUILT' }).eq('id', id);
    await supabase.from('devices').insert({
      device_id: selectedOrder.box_name,
      device_name: selectedOrder.box_name,
      num_compartments: selectedOrder.num_containers,
      pairing_token: token,
      pairing_status: 'PENDING',
      status: 'OFFLINE'
    });
    setSelectedOrder({ ...selectedOrder, pairing_token: token } as any);
    setTimeout(() => {
      window.print();
      setSelectedOrder(null);
      fetchOrders();
    }, 500);
  };

  const cancelOrder = async (id: string) => {
    if (window.confirm("Are you sure you want to cancel this order?")) {
      await supabase.from('orders').update({ status: 'CANCELED' }).eq('id', id);
      setSelectedOrder(null);
      fetchOrders();
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 md:pb-0">
      <header className="border-b border-slate-200 pb-6 print:hidden">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <Wrench className="w-8 h-8 text-blue-600" /> Building Process
        </h1>
        <p className="text-slate-500 mt-2">Generate firmware and construct the physical IoT Medibox devices.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:hidden">
        <div className="lg:col-span-1 space-y-4">
          <h2 className="font-bold text-slate-700 uppercase tracking-wider text-sm mb-4">In Production</h2>
          {orders.length === 0 ? (
            <div className="text-slate-500 text-sm p-4 border border-slate-200 rounded-xl">No devices currently in building process.</div>
          ) : orders.map(order => (
            <div key={order.id} onClick={() => setSelectedOrder(order)} className={`p-5 rounded-2xl cursor-pointer border-2 transition ${selectedOrder?.id === order.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'}`}>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-slate-900">{order.customer_name}</h3>
                <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-full uppercase tracking-widest flex items-center gap-1"><Wrench className="w-3 h-3"/> Building</span>
              </div>
              <p className="text-xs font-medium text-slate-500 mt-1">Device: {order.box_name}</p>
              <p className="text-xs text-slate-400 mt-1">Ordered: {new Date(order.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>

        {selectedOrder ? (
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Manufacturing Details</h2>
                <div className="flex items-center gap-3">
                  <button onClick={() => markBuilt(selectedOrder.id)} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-md shadow-emerald-200 hover:bg-emerald-700 transition flex items-center gap-2">
                    <CheckCircle className="w-5 h-5"/> Build is Ready
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <FileCode2 className="w-5 h-5 text-slate-500" />
                    <span className="font-bold text-slate-700">medibox_firmware.ino</span>
                  </div>
                  <button onClick={() => {
                      const blob = new Blob([generateCppCode(selectedOrder.box_name, selectedOrder.num_containers > 10 ? selectedOrder.num_containers - 10 : selectedOrder.num_containers)], { type: 'text/plain' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${selectedOrder.box_name}_firmware.ino`;
                      a.click();
                    }} className="text-blue-600 hover:text-blue-700 font-bold text-sm flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg">
                    <Download className="w-4 h-4" /> Download .ino
                  </button>
                </div>
                <pre className="p-6 bg-slate-900 text-slate-300 overflow-x-auto text-xs font-mono h-96">
                  <code>{generateCppCode(selectedOrder.box_name, selectedOrder.num_containers > 10 ? selectedOrder.num_containers - 10 : selectedOrder.num_containers)}</code>
                </pre>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 bg-slate-50 rounded-3xl border border-slate-200 flex items-center justify-center p-12 text-center text-slate-400 font-medium">
            Select an order to view manufacturing details.
          </div>
        )}
      </div>
    </div>
  );
}
