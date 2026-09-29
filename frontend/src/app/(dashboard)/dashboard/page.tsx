'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Activity, Clock, Plus, Box, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  PageLoader,
  AdherenceRing,
  NumberCountUp,
  SyncPulse,
  MotionButton,
  staggerContainer,
  staggerItem,
  SPRING_GENTLE,
  SPRING_SNAPPY,
} from '@/components/ui/motion';

export default function DashboardPage() {
  const [device, setDevice] = useState<any>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adherenceRate, setAdherenceRate] = useState<number>(96);

  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      // 1. Fetch Adherence Rate from Reports
      (async () => {
        try {
          const repRes = await fetch('/api/reports/adherence', {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          });
          if (repRes.ok) {
            const repData = await repRes.json();
            if (repData && typeof repData.adherence_rate === 'number') {
              setAdherenceRate(repData.adherence_rate);
            }
          }
        } catch (e) {}
      })();

      // 2. Fetch Devices via API
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
                schedulesData.sort((a: any, b: any) => a.schedule_time.localeCompare(b.schedule_time));
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
    return <PageLoader message="Connecting to Smart Medibox..." />;
  }

  const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  
  let nextSchedule = null;
  for (const s of schedules) {
    if (s.schedule_time >= currentTime) {
      nextSchedule = s;
      break;
    }
  }
  if (!nextSchedule && schedules.length > 0) nextSchedule = schedules[0]; // Wrap around to tomorrow

  return (
    <motion.div 
      variants={staggerContainer(0.06, 0.05)}
      initial="hidden"
      animate="visible"
      className="max-w-5xl mx-auto space-y-8 pb-20 md:pb-0"
    >
      {/* 1. Header Greeting with subtle badge */}
      <motion.header variants={staggerItem} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Medication Dashboard 👋
          </h1>
          <p className="text-slate-500 font-medium mt-1">Real-time status and telemetry for your Smart Medibox.</p>
        </div>
        <div className="flex items-center gap-3">
          <SyncPulse 
            status={device?.device_status || 'ONLINE'} 
            label={device ? `${device.device_name || 'Medibox'} (${device.device_status})` : 'Offline'}
          />
        </div>
      </motion.header>

      {/* 4. Hero Stats & Adherence Ring Grid */}
      <motion.div variants={staggerItem} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Next Scheduled Dose Hero Card */}
        {nextSchedule ? (
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-7 text-white shadow-xl shadow-blue-500/25 col-span-1 md:col-span-2 relative overflow-hidden border border-blue-400/20">
            {/* Glowing Accent Circle in background */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full text-blue-100 text-xs font-bold uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Upcoming Next Dose
                </div>
                <h2 className="text-5xl font-black tracking-tight mt-1">{nextSchedule.schedule_time.substring(0, 5)}</h2>
                <p className="text-blue-100 font-semibold text-lg max-w-md pt-1">
                  {nextSchedule.schedule_items?.map((i: any) => `${i.dose_quantity}x ${i.medicines?.name || 'Vicks'}`).join(' • ') || 'Scheduled Medication'}
                </p>
                <div className="pt-2 flex items-center gap-2 text-xs text-blue-200 font-semibold">
                  <Clock className="w-4 h-4" />
                  <span>Compartment {nextSchedule.schedule_items?.[0]?.compartment_id?.substring(0, 4) || '1'} assigned</span>
                </div>
              </div>

              {/* Large Clock Icon with subtle float */}
              <motion.div 
                animate={{ y: [-3, 3, -3] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center shrink-0 border border-white/30 shadow-inner"
              >
                <Clock className="w-10 h-10 text-white" />
              </motion.div>
            </div>
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-3xl p-8 text-slate-500 flex flex-col items-center justify-center col-span-1 md:col-span-2 text-center shadow-sm">
            <Clock className="w-12 h-12 text-slate-300 mb-3" />
            <p className="font-bold text-slate-700 text-lg">No Schedules Configured Today</p>
            <p className="text-slate-400 text-sm mt-1">Set up your automated dosage times in Schedules.</p>
            <Link href="/schedules" className="text-blue-600 font-bold mt-4 hover:underline">
              Create New Schedule &rarr;
            </Link>
          </div>
        )}
        
        {/* Adherence & Hardware Ring Card */}
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col items-center justify-between hover:shadow-md transition">
          <div className="w-full flex justify-between items-center mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Adherence Score</span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Real-Time
            </span>
          </div>

          <div className="py-2">
            <AdherenceRing 
              percentage={adherenceRate} 
              status={adherenceRate >= 90 ? 'ON_TRACK' : 'LOW_STOCK'}
              size={130}
              strokeWidth={11}
              label="Adherence"
            />
          </div>

          <div className="w-full pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Hardware IR Status</span>
            <span className="text-slate-900 font-bold flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Active
            </span>
          </div>
        </div>
      </motion.div>
      
      {/* 5. Today's Interactive Dose Schedule Timeline */}
      <motion.div variants={staggerItem} className="bg-white/80 backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-sm p-6 md:p-8">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Clock className="w-6 h-6 text-blue-600" />
              Today's Medication Sequence
            </h3>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Automated servo compartment schedule</p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl">
            {schedules.length} Scheduled Dose{schedules.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        {schedules.length === 0 ? (
          <div className="text-center py-10 text-slate-400 font-semibold">
            No medication events scheduled for today.
          </div>
        ) : (
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[3.25rem] before:w-0.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:bg-slate-200">
            {schedules.map((s: any, idx: number) => {
              const isPast = s.schedule_time < currentTime;
              const isNext = s.id === nextSchedule?.id;

              return (
                <motion.div 
                  key={s.id} 
                  initial={{ opacity: 0, x: idx % 2 === 0 ? -15 : 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group"
                >
                  {/* Glowing Node Circle */}
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full border-4 border-white shadow-md shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10 transition-transform ${
                    isNext 
                      ? 'bg-blue-600 text-white ring-4 ring-blue-500/20 scale-110' 
                      : isPast 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {isPast ? (
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    ) : (
                      <Clock className="w-5 h-5" />
                    )}
                  </div>
                  
                  {/* Card Container with glassmorphism */}
                  <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-3xl border transition-all ${
                    isNext 
                      ? 'bg-blue-50/80 backdrop-blur-md border-blue-200 shadow-md ring-2 ring-blue-500/10' 
                      : 'bg-white/80 backdrop-blur-md border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-slate-900">{s.schedule_time.substring(0, 5)}</span>
                        {isNext && (
                          <span className="bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full animate-pulse">
                            Next
                          </span>
                        )}
                      </div>
                      {isPast ? (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full border border-emerald-200">
                          Past Time
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-700 bg-blue-100/80 px-2.5 py-1 rounded-full border border-blue-200">
                          Upcoming
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 pt-1">
                      {s.schedule_items?.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between text-sm text-slate-700 font-semibold bg-white/60 p-2.5 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            <span>{item.dose_quantity}x {item.medicines?.name || 'Vicks'}</span>
                          </div>
                          <span className="text-xs text-slate-400 font-medium">Comp {item.compartment_id ? item.compartment_id.substring(0, 4) : '1'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
