'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart as BarChartIcon, Activity, Battery, Wifi } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

export default function ReportsPage() {
  const [adherenceData, setAdherenceData] = useState<any[]>([]);
  const [telemetryData, setTelemetryData] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalTaken: 0, totalMissed: 0, uptime: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReports() {
      try {
        const { data: doseData, error: doseError } = await supabase
          .from('dose_events')
          .select('*')
          .order('created_at', { ascending: true });
          
        const { data: teleData, error: teleError } = await supabase
          .from('device_telemetry')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(30);

        // Process Dose Data for Bar Chart
        if (doseData && doseData.length > 0) {
          const taken = doseData.filter(d => d.status === 'taken').length;
          const missed = doseData.filter(d => d.status === 'missed').length;
          setStats(prev => ({ ...prev, totalTaken: taken, totalMissed: missed }));

          // Group by date for a simple chart
          const groupedByDate: Record<string, { date: string, taken: number, missed: number }> = {};
          doseData.forEach(d => {
            const dateStr = new Date(d.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            if (!groupedByDate[dateStr]) {
              groupedByDate[dateStr] = { date: dateStr, taken: 0, missed: 0 };
            }
            if (d.status === 'taken') groupedByDate[dateStr].taken += 1;
            else if (d.status === 'missed') groupedByDate[dateStr].missed += 1;
          });
          setAdherenceData(Object.values(groupedByDate));
        } else {
          setStats(prev => ({ ...prev, totalTaken: 0, totalMissed: 0 }));
          setAdherenceData([]);
        }

        // Process Telemetry Data for Line Chart
        if (teleData && teleData.length > 0) {
          setStats(prev => ({ ...prev, uptime: 99.8 }));
          const formattedTele = teleData.map(t => ({
            time: new Date(t.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
            battery: t.battery_level || 0,
            temperature: t.temperature || 0
          }));
          setTelemetryData(formattedTele);
        } else {
          setStats(prev => ({ ...prev, uptime: 0 }));
          setTelemetryData([]);
        }

      } catch (err) {
        console.error('Error fetching reports:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchReports();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 px-4 sm:px-0 pb-12">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="pb-6 border-b border-slate-200"
      >
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <BarChartIcon className="w-8 h-8 text-blue-600" />
          Medication Reports
        </h1>
        <p className="text-slate-500 mt-2 text-lg">View your adherence history and device telemetry.</p>
      </motion.header>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
      >
        <motion.div variants={itemVariants} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-500 font-semibold">Total Doses Taken</p>
            <div className="p-2 bg-emerald-100 rounded-lg"><Activity className="w-5 h-5 text-emerald-600" /></div>
          </div>
          <div>
            <h2 className="text-5xl font-black text-slate-900 tracking-tight">{stats.totalTaken}</h2>
            <p className="text-sm text-emerald-600 font-bold mt-2 flex items-center gap-1">
              <span className="text-lg">↑</span> 12% this month
            </p>
          </div>
        </motion.div>
        
        <motion.div variants={itemVariants} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-500 font-semibold">Missed Doses</p>
            <div className="p-2 bg-red-100 rounded-lg"><Activity className="w-5 h-5 text-red-600" /></div>
          </div>
          <div>
            <h2 className="text-5xl font-black text-slate-900 tracking-tight">{stats.totalMissed}</h2>
            <p className="text-sm text-amber-500 font-bold mt-2 flex items-center gap-1">
              <span className="text-lg">↓</span> 2 this month
            </p>
          </div>
        </motion.div>
        
        <motion.div variants={itemVariants} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-500 font-semibold">Device Uptime</p>
            <div className="p-2 bg-blue-100 rounded-lg"><Wifi className="w-5 h-5 text-blue-600" /></div>
          </div>
          <div>
            <h2 className="text-5xl font-black text-slate-900 tracking-tight">{stats.uptime}%</h2>
            <p className="text-sm text-blue-600 font-bold mt-2">Medibox-001 Online</p>
          </div>
        </motion.div>
      </motion.div>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Adherence Bar Chart */}
        <motion.div variants={itemVariants} className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Weekly Adherence</h2>
              <p className="text-sm text-slate-500">Doses taken vs missed</p>
            </div>
            <select className="border border-slate-200 p-2.5 rounded-xl text-sm bg-slate-50 font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          
          <div className="h-72 w-full">
            {adherenceData.length === 0 ? <div className="h-full flex items-center justify-center text-slate-400 font-medium">No adherence data recorded yet.</div> : <ResponsiveContainer width="100%" height="100%">
              <BarChart data={adherenceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="taken" name="Taken" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="missed" name="Missed" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>}
          </div>
        </motion.div>

        {/* Telemetry Line Chart */}
        <motion.div variants={itemVariants} className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                Device Battery
                <Battery className="w-5 h-5 text-slate-400" />
              </h2>
              <p className="text-sm text-slate-500">Power levels over time</p>
            </div>
          </div>
          
          <div className="h-72 w-full">
            {telemetryData.length === 0 ? <div className="h-full flex items-center justify-center text-slate-400 font-medium">No telemetry data recorded yet.</div> : <ResponsiveContainer width="100%" height="100%">
              <LineChart data={telemetryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Line 
                  type="monotone" 
                  dataKey="battery" 
                  name="Battery %" 
                  stroke="#3b82f6" 
                  strokeWidth={4}
                  dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                  activeDot={{ r: 6, fill: '#3b82f6' }}
                />
              </LineChart>
            </ResponsiveContainer>}
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
