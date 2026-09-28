'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Play, Pause, Clock, FastForward, Info } from 'lucide-react';

export default function DemoModePage() {
  const [demoTime, setDemoTime] = useState('07:59:50');
  const [status, setStatus] = useState('STOPPED'); // STOPPED, RUNNING

  const handleSetTime = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/demo/set-time`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ demo_time: demoTime })
    });
    alert(`Demo time set to ${demoTime}`);
  };

  const handlePlay = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/demo/play`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${session?.access_token}` }
    });
    setStatus('RUNNING');
  };

  const handlePause = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/demo/pause`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${session?.access_token}` }
    });
    setStatus('STOPPED');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
          <Clock className="w-8 h-8 text-blue-600" />
          Demo Mode Engine
        </h1>
        <p className="text-slate-500 mt-1">Control the system clock to test multi-compartment sequence logic.</p>
      </header>

      <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500 rounded-full blur-3xl opacity-20 pointer-events-none"></div>

        <div className="flex flex-col items-center justify-center py-8">
          <p className="text-slate-400 font-medium tracking-widest uppercase text-sm mb-4">
            System Clock
          </p>
          <input 
            type="time" 
            step="1"
            value={demoTime}
            onChange={(e) => setDemoTime(e.target.value)}
            className="text-6xl font-bold bg-transparent text-center outline-none focus:ring-0 w-full mb-8"
          />

          <div className="flex gap-4">
            <button 
              onClick={handleSetTime}
              className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-medium transition"
            >
              Set Time
            </button>

            {status === 'STOPPED' ? (
              <button 
                onClick={handlePlay}
                className="bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-3 rounded-xl font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <Play className="w-5 h-5 fill-current" /> Play
              </button>
            ) : (
              <button 
                onClick={handlePause}
                className="bg-amber-500 hover:bg-amber-400 text-white px-8 py-3 rounded-xl font-bold transition flex items-center gap-2 shadow-lg shadow-amber-500/20"
              >
                <Pause className="w-5 h-5 fill-current" /> Pause
              </button>
            )}
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 mt-8 flex items-start gap-3 border border-slate-700">
          <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-sm text-slate-300 leading-relaxed">
            When Demo Mode is running, the FastAPI backend evaluates schedules against this virtual clock rather than the server's real time. 
            Set the clock to 5 seconds before a scheduled dose (e.g., 07:59:55 AM) to watch the sequence orchestrator trigger the MQTT commands automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
