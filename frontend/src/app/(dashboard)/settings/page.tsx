'use client';

import { Settings, User, BellRing, Smartphone, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';

function DeviceQRViewer() {
  const [device, setDevice] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/devices', { headers: { 'Authorization': `Bearer ${session.access_token}` } });
      if (res.ok) {
        const devs = await res.json();
        if (devs && devs.length > 0) setDevice(devs[0]);
      }
    }
    load();
  }, []);

  if (!device) return <p className="text-sm text-slate-400">No active device paired.</p>;

  return (
    <div className="bg-slate-50 p-4 inline-block rounded-xl border border-slate-200">
      <QRCode value={JSON.stringify({ device_id: device.device_id, wifi: "WIFI:S:Medibox-Setup;T:WPA;P:setup1234;;" })} size={128} />
      <p className="text-xs text-center text-slate-500 mt-2 font-mono">{device.device_id}</p>
    </div>
  );
}

export default function SettingsPage() {
  const [email, setEmail] = useState('');
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setEmail(data.user.email || '');
    });
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
          <Settings className="w-8 h-8 text-blue-600" />
          Settings
        </h1>
        <p className="text-slate-500 mt-1">Manage your account and app preferences.</p>
      </header>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Account */}
        <div className="p-6 border-b border-slate-100 flex items-start gap-4">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-900">Account</h3>
            <p className="text-sm text-slate-500 mt-1">Manage your email and security preferences.</p>
            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
              <input type="text" readOnly value={email} className="w-full max-w-md p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700" />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="p-6 border-b border-slate-100 flex items-start gap-4">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shrink-0">
            <BellRing className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-900">Push Notifications</h3>
            <p className="text-sm text-slate-500 mt-1">Configure when Medibox alerts you.</p>
            
            <div className="mt-4 space-y-3 max-w-md">
              <label className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Missed Dose Alerts</span>
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-blue-600" />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Low Stock Warnings</span>
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-blue-600" />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Device Offline Alerts</span>
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-blue-600" />
              </label>
            </div>
          </div>
        </div>

        {/* Support */}
        <div className="p-6 border-b border-slate-100 flex items-start gap-4">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-900">Privacy & Support</h3>
            <p className="text-sm text-slate-500 mt-1">Read our policies or contact technical support.</p>
            <div className="mt-4 flex gap-4">
              <button className="text-sm font-medium text-blue-600 hover:underline">Privacy Policy</button>
              <button className="text-sm font-medium text-blue-600 hover:underline">Contact Support</button>
            </div>
          </div>
        </div>

        {/* Device QR */}
        <div className="p-6 border-b border-slate-100 flex items-start gap-4">
          <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-900">Device Recovery QR</h3>
            <p className="text-sm text-slate-500 mt-1">Scan this to re-pair your Medibox if you lose the physical sticker.</p>
            <div className="mt-4">
              <DeviceQRViewer />
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="p-6 flex items-start gap-4 bg-red-50/30">
          <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-900">Danger Zone</h3>
            <p className="text-sm text-slate-500 mt-1">Manage device pairing and data deletion.</p>
            <div className="mt-6 space-y-4 max-w-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-red-200 rounded-xl bg-white">
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
                  className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-lg text-sm font-bold transition whitespace-nowrap"
                >
                  Unpair Device
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-red-200 rounded-xl bg-white">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Wipe My Data</h4>
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
                  className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-bold transition whitespace-nowrap"
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
