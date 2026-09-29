'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Box, Plus } from 'lucide-react';
import Link from 'next/link';

export default function DevicesPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDevices = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const res = await fetch(`/api/devices`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      
      let data = [];
      if (res.ok) {
        try {
          data = await res.json();
        } catch(e) {
          console.error("JSON parse error:", e);
        }
      }
      
      if (Array.isArray(data)) {
        setDevices(data);
      } else {
        console.error("Failed to load devices:", data);
        setDevices([]);
      }
      setLoading(false);
    };
    fetchDevices();
  }, []);

  if (loading) return <div className="p-8">Loading devices...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Box className="w-8 h-8 text-blue-600" />
            My Devices
          </h1>
          <p className="text-slate-500 mt-1">Manage your connected Smart Medibox units.</p>
        </div>
        <Link 
          href="/devices/pair"
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Pair New Device
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {devices.map(dev => (
          <div key={dev.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-xl text-slate-900">{dev.device_name}</h3>
                  <p className="text-slate-500 text-sm font-mono mt-1">ID: {dev.device_id}</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> ONLINE
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">Model</p>
                  <p className="font-medium text-slate-900">{dev.device_model}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">Firmware</p>
                  <p className="font-medium text-slate-900">v{dev.firmware_version}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {devices.length === 0 && (
          <div className="col-span-2 text-center p-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
            <Box className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">No Devices Paired</h3>
            <p className="text-slate-500 mb-6">Connect your physical Medibox to your account to get started.</p>
            <Link 
              href="/devices/pair"
              className="inline-flex bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition"
            >
              Pair Device Now
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
