'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Settings, User, BellRing, Shield, Smartphone, QrCode, Camera, CheckCircle2, AlertTriangle, Bell } from 'lucide-react';

function DeviceQRViewer() {
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchQR = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const devRes = await fetch('/api/devices', { headers: { 'Authorization': `Bearer ${session.access_token}` } });
      const devs = await devRes.json();
      if (devs.length > 0) {
        const qrRes = await fetch(`/api/devices/${devs[0].id}/qr`, { headers: { 'Authorization': `Bearer ${session.access_token}` } });
        if (qrRes.ok) {
          const data = await qrRes.json();
          setQrBase64(data.qr_code_base64);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {!qrBase64 ? (
        <button 
          onClick={fetchQR}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg text-sm font-bold transition"
        >
          <QrCode className="w-4 h-4" />
          {loading ? 'Generating QR...' : 'Show Device Recovery QR'}
        </button>
      ) : (
        <div className="bg-white p-4 rounded-xl border border-slate-200 inline-block text-center space-y-2">
          <img src={qrBase64} alt="Device QR Code" className="w-48 h-48 mx-auto border border-slate-100 rounded-lg" />
          <p className="text-xs text-slate-500 font-bold">Medibox Hardware Pairing Token</p>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const [email, setEmail] = useState('');
  const [notifPermission, setNotifPermission] = useState<string>('default');
  const [cameraPermission, setCameraPermission] = useState<string>('default');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setEmail(data.user.email || '');
    });

    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  const requestPushPermission = async () => {
    if (!('Notification' in window)) {
      alert("System notifications are not supported on this browser.");
      return;
    }
    try {
      const res = await Notification.requestPermission();
      setNotifPermission(res);
      if (res === 'granted') {
        new Notification("Smart Medibox Push Notifications Enabled! 🎉", {
          body: "You will now receive instant phone & browser alerts when your schedule starts or if a dose is missed."
        });
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const requestCameraPermission = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Camera API is not supported on this browser environment.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraPermission('granted');
      stream.getTracks().forEach(track => track.stop());
      alert("Camera permission granted successfully! You can now scan device pairing QR codes.");
    } catch (e) {
      setCameraPermission('denied');
      alert("Camera permission denied. Please allow camera access in your browser site settings.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <header>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <Settings className="w-8 h-8 text-blue-600" />
          Settings & Device Permissions
        </h1>
        <p className="text-slate-500 mt-1 text-base">Configure hardware pairing permissions, phone push alerts, and account settings.</p>
      </header>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Account */}
        <div className="p-6 border-b border-slate-100 flex items-start gap-4">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-900 text-lg">Account Profile</h3>
            <p className="text-sm text-slate-500 mt-0.5">Your registered Medibox patient account.</p>
            <div className="mt-4">
              <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
              <input type="text" readOnly value={email} className="w-full max-w-md p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium text-sm" />
            </div>
          </div>
        </div>

        {/* System Push Notifications */}
        <div className="p-6 border-b border-slate-100 flex items-start gap-4">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
            <BellRing className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">System Push Notifications</h3>
                <p className="text-sm text-slate-500 mt-0.5">Receive native phone & desktop alerts when schedule starts or doses are missed.</p>
              </div>
              <button
                onClick={requestPushPermission}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shrink-0 transition-all ${
                  notifPermission === 'granted'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                }`}
              >
                {notifPermission === 'granted' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Bell className="w-4 h-4" />}
                {notifPermission === 'granted' ? 'Notifications Allowed' : 'Enable Push Notifications'}
              </button>
            </div>
          </div>
        </div>

        {/* Camera Permission for QR Pairing */}
        <div className="p-6 border-b border-slate-100 flex items-start gap-4">
          <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Camera Access (QR Pairing)</h3>
                <p className="text-sm text-slate-500 mt-0.5">Allows scanning physical QR code stickers on your Medibox hardware.</p>
              </div>
              <button
                onClick={requestCameraPermission}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shrink-0 transition-all ${
                  cameraPermission === 'granted'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm'
                }`}
              >
                {cameraPermission === 'granted' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Camera className="w-4 h-4" />}
                {cameraPermission === 'granted' ? 'Camera Allowed' : 'Grant Camera Access'}
              </button>
            </div>
          </div>
        </div>

        {/* Device QR */}
        <div className="p-6 border-b border-slate-100 flex items-start gap-4">
          <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-900 text-lg">Device Recovery QR</h3>
            <p className="text-sm text-slate-500 mt-0.5">Scan this QR code to re-pair your Medibox if you lose the physical sticker.</p>
            <div className="mt-4">
              <DeviceQRViewer />
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="p-6 flex items-start gap-4 bg-red-50/30">
          <div className="w-10 h-10 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-900 text-lg">Danger Zone</h3>
            <p className="text-sm text-slate-500 mt-0.5">Manage device pairing and data deletion.</p>
            <div className="mt-6 space-y-4 max-w-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-red-200 rounded-2xl bg-white">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Unpair Device</h4>
                  <p className="text-xs text-slate-500">Unlink the physical device from your account.</p>
                </div>
                <button 
                  onClick={async () => {
                    if(!confirm("Are you sure you want to unpair your device? You will need to re-scan the QR code to connect it again.")) return;
                    const { data: { session } } = await supabase.auth.getSession();
                    const devRes = await fetch('/api/devices', { headers: { 'Authorization': `Bearer ${session?.access_token}` } });
                    const devs = await devRes.json();
                    if(devs.length > 0) {
                      await fetch(`/api/devices/${devs[0].id}/unpair`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${session?.access_token}` }
                      });
                      alert("Device Unpaired successfully.");
                      window.location.reload();
                    } else {
                      alert("No device paired.");
                    }
                  }}
                  className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-xl text-xs font-bold transition whitespace-nowrap"
                >
                  Unpair Device
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-red-200 rounded-2xl bg-white">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Factory Reset Data</h4>
                  <p className="text-xs text-slate-500">Delete all medicines, schedules, and history.</p>
                </div>
                <button 
                  onClick={async () => {
                    if(!confirm("WARNING: This will permanently delete ALL your medicines, schedules, and history. Are you absolutely sure?")) return;
                    const { data: { session } } = await supabase.auth.getSession();
                    await fetch('/api/devices/reset-data', {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${session?.access_token}` }
                    });
                    alert("All data wiped successfully.");
                    window.location.reload();
                  }}
                  className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-xl text-xs font-bold transition whitespace-nowrap"
                >
                  Factory Reset
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
