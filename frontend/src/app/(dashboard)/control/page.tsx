'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SlidersHorizontal, Settings2, ShieldCheck, Loader2 } from 'lucide-react';

export default function ControlCenterPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [compartments, setCompartments] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<{ [key: string]: 'OPEN' | 'CLOSE' | null }>({});

  // Initial Data Fetch
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      try {
        let res = await fetch(`/api/devices`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        if (!res.ok) {
          res = await fetch(`https://odyssey-hackathon.onrender.com/api/devices`, {
            headers: { 'Authorization': `Bearer ${session?.access_token}` }
          });
        }
        if (res.ok) {
          const data = await res.json();
          setDevices(data);
          if (data.length > 0) {
            setSelectedDevice(data[0].id);
            fetchCompartments(data[0].id, session?.access_token);
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      } catch (e) {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const fetchCompartments = async (deviceId: string, token: string | undefined) => {
    try {
      let res = await fetch(`/api/compartments/${deviceId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        res = await fetch(`https://odyssey-hackathon.onrender.com/api/compartments/${deviceId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      if (res.ok) {
        const data = await res.json();
        setCompartments(data);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
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
    const compKey = `${comp.compartment_number}`;
    setActionLoading((prev) => ({ ...prev, [compKey]: 'OPEN' }));

    // Optimistically update UI immediately so status reflects OPEN
    setCompartments((current) =>
      current.map((c) =>
        c.compartment_number === comp.compartment_number
          ? { ...c, servo_status: 'OPEN', current_state: 'MANUAL_OPEN' }
          : c
      )
    );

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const payload = {
        device_id: selectedDevice,
        compartment_number: comp.compartment_number
      };

      let res = await fetch(`/api/compartments/test/servo`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        await fetch(`https://odyssey-hackathon.onrender.com/api/compartments/test/servo`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      }
    } catch (e) {
      console.error('Failed to send open command:', e);
    } finally {
      setActionLoading((prev) => ({ ...prev, [compKey]: null }));
    }
  };

  const handleCloseCompartment = async (comp: any) => {
    const compKey = `${comp.compartment_number}`;
    setActionLoading((prev) => ({ ...prev, [compKey]: 'CLOSE' }));

    // Optimistically update UI immediately so status reflects CLOSED
    setCompartments((current) =>
      current.map((c) =>
        c.compartment_number === comp.compartment_number
          ? { ...c, servo_status: 'CLOSED', current_state: 'IDLE' }
          : c
      )
    );

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const payload = {
        device_id: selectedDevice,
        compartment_number: comp.compartment_number
      };

      let res = await fetch(`/api/compartments/control/close`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        await fetch(`https://odyssey-hackathon.onrender.com/api/compartments/control/close`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      }
    } catch (e) {
      console.error('Failed to send close command:', e);
    } finally {
      setActionLoading((prev) => ({ ...prev, [compKey]: null }));
    }
  };

  if (loading) {
    return <div className="animate-pulse flex p-8 justify-center font-bold text-slate-500">Loading Control Center...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <SlidersHorizontal className="w-8 h-8 text-blue-600" />
            Control Center
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Real-time status and manual hardware overrides.</p>
        </div>
        
        {devices.length > 0 && (
          <select 
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="p-2.5 border border-slate-200 rounded-xl bg-white shadow-sm font-bold text-slate-800 text-sm outline-none"
          >
            {devices.map(d => (
              <option key={d.id} value={d.id}>{d.device_name}</option>
            ))}
          </select>
        )}
      </header>

      {devices.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center text-slate-500 font-medium">
          No devices paired yet. Go to Devices to pair your first Medibox.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {compartments.map((comp) => {
            const medName = comp.medicine_compartments?.[0]?.medicines?.name || "Not Assigned";
            const compKey = `${comp.compartment_number}`;
            const isActing = actionLoading[compKey];
            
            // Map hardware state to badge styling
            let stateColor = "bg-slate-100 text-slate-700";
            let stateBadge = "border-slate-200";
            
            if (comp.current_state === 'OPEN' || comp.current_state === 'MANUAL_OPEN' || comp.servo_status === 'OPEN') {
              stateColor = "bg-emerald-100 text-emerald-800";
              stateBadge = "border-emerald-300 bg-emerald-50/50";
            } else if (comp.current_state === 'WAITING_FOR_INTERACTION') {
              stateColor = "bg-amber-100 text-amber-800 animate-pulse";
              stateBadge = "border-amber-300 bg-amber-50/50";
            } else if (comp.current_state === 'INTERACTION_DETECTED') {
              stateColor = "bg-blue-100 text-blue-800";
              stateBadge = "border-blue-300 bg-blue-50/50";
            } else if (comp.current_state === 'OPENING' || comp.current_state === 'CLOSING') {
              stateColor = "bg-indigo-100 text-indigo-800 animate-pulse";
              stateBadge = "border-indigo-300 bg-indigo-50/50";
            }

            return (
              <div key={comp.id} className={`bg-white rounded-3xl p-6 border-2 transition-all ${stateBadge} shadow-sm space-y-5`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-black text-slate-900 text-lg">Compartment {comp.compartment_number}</h3>
                    <p className="text-xs text-slate-500 font-semibold flex items-center gap-1 mt-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      {medName}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase ${stateColor}`}>
                    {comp.current_state || comp.servo_status || comp.status || 'CLOSED'}
                  </div>
                </div>

                <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs">
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-500">Servo Motor</span>
                    <span className="font-bold text-slate-900">{comp.servo_status || 'CLOSED'}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-500">IR Sensor</span>
                    <span className="font-bold text-slate-900">{comp.ir_status || 'CLEAR'}</span>
                  </div>
                </div>

                {/* Direct Action Buttons - Always Enabled & Clickable */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button 
                    onClick={() => handleOpenCompartment(comp)}
                    disabled={isActing === 'OPEN'}
                    className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white py-3 px-2 rounded-2xl font-bold transition text-xs shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
                  >
                    {isActing === 'OPEN' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Settings2 className="w-4 h-4" />
                    )}
                    {isActing === 'OPEN' ? 'OPENING...' : `OPEN ${comp.compartment_number}`}
                  </button>

                  <button 
                    onClick={() => handleCloseCompartment(comp)}
                    disabled={isActing === 'CLOSE'}
                    className="flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white py-3 px-2 rounded-2xl font-bold transition text-xs shadow-md shadow-slate-900/10 cursor-pointer disabled:opacity-50"
                  >
                    {isActing === 'CLOSE' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Settings2 className="w-4 h-4" />
                    )}
                    {isActing === 'CLOSE' ? 'CLOSING...' : `CLOSE ${comp.compartment_number}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
