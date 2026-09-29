'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SlidersHorizontal, Settings2, ShieldCheck, AlertCircle } from 'lucide-react';

export default function ControlCenterPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [compartments, setCompartments] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Initial Data Fetch
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch(`/api/devices`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const data = await res.json();
      setDevices(data);
      if (data.length > 0) {
        setSelectedDevice(data[0].id);
        fetchCompartments(data[0].id, session?.access_token);
      } else {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const fetchCompartments = async (deviceId: string, token: string | undefined) => {
    const res = await fetch(`/api/compartments/${deviceId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setCompartments(data);
    setLoading(false);
  };

  // Realtime Subscription
  useEffect(() => {
    if (!selectedDevice) return;

    const channel = supabase
      .channel('compartments_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'compartments', filter: `device_id=eq.${selectedDevice}` },
        (payload) => {
          setCompartments((current) =>
            current.map((comp) => (comp.id === payload.new.id ? { ...comp, ...payload.new } : comp))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDevice]);

  const handleOpenCompartment = async (comp: any) => {
    if (!confirm(`Are you sure you want to open Compartment ${comp.compartment_number}?`)) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/compartments/test/servo`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        device_id: selectedDevice,
        compartment_number: comp.compartment_number
      })
    });
  };

  const handleCloseCompartment = async (comp: any) => {
    if (!confirm(`Are you sure you want to close Compartment ${comp.compartment_number}?`)) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/compartments/control/close`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        device_id: selectedDevice,
        compartment_number: comp.compartment_number
      })
    });
  };

  if (loading) {
    return <div className="animate-pulse flex p-8 justify-center">Loading Control Center...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <SlidersHorizontal className="w-8 h-8 text-blue-600" />
            Control Center
          </h1>
          <p className="text-slate-500 mt-1">Real-time status and manual hardware overrides.</p>
        </div>
        
        {devices.length > 0 && (
          <select 
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="p-2 border border-slate-200 rounded-lg bg-white shadow-sm font-medium"
          >
            {devices.map(d => (
              <option key={d.id} value={d.id}>{d.device_name}</option>
            ))}
          </select>
        )}
      </header>

      {devices.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500">
          No devices paired yet. Go to Devices to pair your first Medibox.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {compartments.map((comp) => {
            const medName = comp.medicine_compartments?.[0]?.medicines?.name || "Not Assigned";
            
            // Map the hardware state to UI styling
            let stateColor = "bg-slate-100 text-slate-700";
            let stateBadge = "border-slate-200";
            
            if (comp.current_state === 'OPEN' || comp.current_state === 'MANUAL_OPEN') {
              stateColor = "bg-emerald-100 text-emerald-700";
              stateBadge = "border-emerald-200 bg-emerald-50";
            } else if (comp.current_state === 'WAITING_FOR_INTERACTION') {
              stateColor = "bg-amber-100 text-amber-700 animate-pulse";
              stateBadge = "border-amber-200 bg-amber-50";
            } else if (comp.current_state === 'INTERACTION_DETECTED') {
              stateColor = "bg-blue-100 text-blue-700";
              stateBadge = "border-blue-200 bg-blue-50";
            } else if (comp.current_state === 'OPENING' || comp.current_state === 'CLOSING') {
              stateColor = "bg-indigo-100 text-indigo-700 animate-pulse";
              stateBadge = "border-indigo-200 bg-indigo-50";
            }

            const isOpen = comp.servo_status === 'OPEN' || comp.current_state === 'OPEN' || comp.current_state === 'MANUAL_OPEN';

            return (
              <div key={comp.id} className={`bg-white rounded-2xl p-6 border-2 transition-all ${stateBadge} shadow-sm`}>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">Compartment {comp.compartment_number}</h3>
                    <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      {medName}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider ${stateColor}`}>
                    {comp.current_state || comp.status}
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Servo Status</span>
                    <span className="font-medium text-slate-900">{comp.servo_status}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">IR Sensor</span>
                    <span className="font-medium text-slate-900">{comp.ir_status}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => handleOpenCompartment(comp)}
                    disabled={isOpen}
                    className="flex items-center justify-center gap-1.5 bg-blue-600 text-white p-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition text-xs shadow-sm shadow-blue-500/20"
                  >
                    <Settings2 className="w-4 h-4" />
                    OPEN {comp.compartment_number}
                  </button>
                  <button 
                    onClick={() => handleCloseCompartment(comp)}
                    disabled={!isOpen}
                    className="flex items-center justify-center gap-1.5 bg-slate-900 text-white p-3 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition text-xs shadow-sm"
                  >
                    <Settings2 className="w-4 h-4" />
                    CLOSE {comp.compartment_number}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
}
