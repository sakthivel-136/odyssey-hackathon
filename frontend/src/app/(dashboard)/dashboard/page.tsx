'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Activity, Clock, Plus, BrainCircuit, Box, FastForward } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const [device, setDevice] = useState<any>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [insight, setInsight] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Demo State
  const [userEmail, setUserEmail] = useState<string>('');
  const [simulatedTime, setSimulatedTime] = useState<string>('');

  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUserEmail(session.user.email || '');
      
      // 1. Fetch AI Insight (Non-blocking)
      (async () => {
        try {
          const aiRes = await fetch('/api/ai/daily-insight', {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          });
          if (aiRes.ok) {
            const aiData = await aiRes.json();
            setInsight(aiData.insight);
          }
        } catch (e) {}
      })();

      // 2. Fetch Devices via API to bypass RLS issues
      try {
        const devRes = await fetch('/api/devices', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (devRes.ok) {
          const devicesData = await devRes.json();
          if (devicesData && devicesData.length > 0) {
            setDevice(devicesData[0]);
            
            // 3. Fetch Schedules
            const schedRes = await fetch('/api/schedules', {
              headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (schedRes.ok) {
              const schedulesData = await schedRes.json();
              if (schedulesData) {
                // Sort by time
                schedulesData.sort((a:any, b:any) => a.schedule_time.localeCompare(b.schedule_time));
                setSchedules(schedulesData);
              }
            }
          }
        }
      } catch (e) {}
      
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <Activity className="text-blue-600 w-12 h-12 mb-4" />
          <p className="text-slate-500 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const realTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  const currentTime = simulatedTime || realTime;
  
  let nextSchedule = null;
  
  for (const s of schedules) {
    if (s.schedule_time >= currentTime) {
      nextSchedule = s;
      break;
    }
  }
  if (!nextSchedule && schedules.length > 0) nextSchedule = schedules[0]; // Wrap around to tomorrow

  const triggerDemo = async () => {
    if (!device) return alert("No device found to trigger.");
    try {
      await fetch('/api/demo/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: device.device_id })
      });
      alert('Hardware alarm successfully triggered! The physical box should now dispense.');
    } catch (e) {
      console.error(e);
      alert('Failed to trigger hardware.');
    }
  };

  const isDemo = userEmail === 'demo@medibox.com';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-8 pb-20 md:pb-0"
    >
      <header>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          Good Morning 👋
        </h1>
        <p className="text-slate-500 mt-1">Here is your live medication overview.</p>
      </header>
      
      {/* Demo Time Travel Simulator Panel */}
      {isDemo && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 border-2 border-yellow-300 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div>
            <h3 className="font-black text-xl text-yellow-900 flex items-center gap-2 mb-1">
              <FastForward className="w-6 h-6 text-yellow-600"/> Time Travel Simulator
            </h3>
            <p className="text-sm text-yellow-800 font-medium">Use this panel during your demo pitch to fake the time and trigger the physical Medibox instantly!</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border-2 border-yellow-200">
              <span className="text-xs font-bold text-yellow-600 uppercase tracking-wider">Fake Time</span>
              <input 
                type="time" 
                value={currentTime} 
                onChange={(e) => setSimulatedTime(e.target.value)}
                className="font-mono font-bold text-lg text-yellow-900 bg-transparent outline-none"
              />
            </div>
            <button 
              onClick={triggerDemo} 
              className="bg-yellow-500 hover:bg-yellow-600 text-white font-black uppercase tracking-wider py-3 px-6 rounded-xl whitespace-nowrap transition shadow-md shadow-yellow-500/20 active:scale-95"
            >
              Trigger Hardware Now
            </button>
          </div>
        </motion.div>
      )}

      {/* AI Insight Banner */}
      {insight && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-indigo-900 to-blue-900 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-blue-900/20 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <BrainCircuit className="w-48 h-48" />
          </div>
          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <BrainCircuit className="w-5 h-5 text-blue-300" />
              <span className="text-blue-300 font-bold uppercase tracking-wider text-xs">Gemini AI Analysis</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black mb-3 text-white leading-tight">{insight.title}</h2>
            <div className="text-blue-100 text-lg leading-relaxed whitespace-pre-wrap font-medium">
              {insight.description}
            </div>
          </div>
        </motion.div>
      )}

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {nextSchedule ? (
          <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-lg shadow-blue-200 col-span-1 md:col-span-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-blue-200 font-bold tracking-wider text-sm mb-1 uppercase">Next Scheduled Dose</p>
                <h2 className="text-4xl font-black">{nextSchedule.schedule_time.substring(0, 5)}</h2>
                <p className="text-blue-100 mt-2 font-medium text-lg">
                  {nextSchedule.schedule_items.map((i:any) => `${i.dose_quantity}x ${i.medicines.name}`).join(' • ')}
                </p>
              </div>
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <Clock className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-100 border border-slate-200 rounded-3xl p-6 text-slate-500 flex flex-col items-center justify-center col-span-1 md:col-span-2 text-center">
            <CalendarIcon className="w-10 h-10 text-slate-300 mb-3" />
            <p className="font-medium text-slate-600">No schedules set.</p>
            <Link href="/schedules" className="text-blue-600 font-bold mt-2 hover:underline">Create a schedule</Link>
          </div>
        )}
        
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 font-bold tracking-wider text-xs mb-2 uppercase">Device Status</p>
              {device ? (
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                  <span className={`w-3.5 h-3.5 rounded-full ${device.device_status === 'ONLINE' ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></span>
                  {device.device_status}
                </h2>
              ) : (
                <h2 className="text-xl font-bold text-slate-400">No Device</h2>
              )}
            </div>
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-slate-400" />
            </div>
          </div>
          {device ? (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-sm font-medium text-slate-600">{device.device_id}</p>
              <p className="text-xs text-slate-400">{device.device_name}</p>
            </div>
          ) : (
            <Link href="/devices/pair" className="mt-4 text-sm font-bold text-blue-600 bg-blue-50 py-2 px-3 rounded-lg text-center">Pair Device</Link>
          )}
        </div>
      </div>
      
      {/* Timeline */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8">
        <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-2">
          Today's Schedule
        </h3>
        
        {schedules.length === 0 ? (
          <div className="text-center py-8 text-slate-500">No schedules configured for today.</div>
        ) : (
          <div className="space-y-8 relative before:absolute before:inset-0 before:ml-[3.25rem] before:w-0.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:bg-slate-100">
            {schedules.map((s:any, idx:number) => {
              const isPast = s.schedule_time < currentTime;
              return (
                <div key={s.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10">
                    <Clock className="w-4 h-4" />
                  </div>
                  
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-5 rounded-2xl border border-slate-200 shadow-sm group-hover:shadow-md group-hover:border-blue-200 transition">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-black text-slate-900">{s.schedule_time.substring(0,5)}</span>
                      {isPast ? (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">Completed</span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">Upcoming</span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {s.schedule_items.map((item:any) => (
                        <div key={item.id} className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                          {item.dose_quantity}x {item.medicines.name} <span className="text-xs text-slate-400 ml-auto">Comp {item.compartment_id.substring(0,4)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function CalendarIcon(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
}
