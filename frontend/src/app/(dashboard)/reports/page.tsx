'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart as BarChartIcon, Activity, AlertTriangle, CheckCircle2, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

import { ReportsSkeleton, NumberCountUp, SPRING_SNAPPY, SPRING_GENTLE } from '@/components/ui/motion';

type ReportData = {
  total: number;
  completed: number;
  missed: number;
  adherence_rate: number;
  weekly_trend: { day: string; date: string; taken: number; missed: number; adherence: number }[];
  hourly_distribution: { time: string; doses: number }[];
  inventory_status: { id: string; name: string; strength: string; stock_quantity: number; low_stock_threshold: number; is_low: boolean }[];
  uptime: number;
};

// Helper function: Calculates nearby round max (e.g., 68 -> 70, 59 -> 60, 8 -> 10)
function getNearbyRoundMax(stock: number): number {
  if (stock <= 0) return 10;
  const ceilTen = Math.ceil(stock / 10) * 10;
  return ceilTen === stock ? ceilTen + 10 : ceilTen;
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData>({
    total: 0,
    completed: 0,
    missed: 0,
    adherence_rate: 100,
    weekly_trend: [],
    hourly_distribution: [],
    inventory_status: [],
    uptime: 99.9
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReports() {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      try {
        let res = await fetch('/api/reports/adherence', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (!res.ok) {
          res = await fetch('https://odyssey-hackathon.onrender.com/api/reports/adherence', {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          });
        }
        if (res.ok) {
          const reportRes = await res.json();
          setData(reportRes);
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
      <div className="max-w-6xl mx-auto space-y-8 px-4 sm:px-0 pb-12">
        <div className="h-10 w-72 bg-slate-200 rounded-2xl animate-pulse" />
        <ReportsSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 px-4 sm:px-0 pb-12">
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="pb-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <BarChartIcon className="w-8 h-8 text-blue-600" />
            Medication Analytics & Reports
          </h1>
          <p className="text-slate-500 mt-1 text-base">Comprehensive performance reports, dose compliance tracking, and inventory analytics.</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-3 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Device Health</p>
            <p className="text-sm font-black text-slate-900">{data.uptime}% Uptime Online</p>
          </div>
        </div>
      </motion.header>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Adherence Rate</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Activity className="w-4 h-4" /></div>
          </div>
          <div>
            <h2 className="text-4xl font-black text-slate-900">{data.adherence_rate}%</h2>
            <p className={`text-xs font-bold mt-2 flex items-center gap-1 ${data.adherence_rate >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {data.adherence_rate >= 80 ? '✓ Excellent Adherence' : '⚠ Action Required'}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Doses Taken</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle2 className="w-4 h-4" /></div>
          </div>
          <div>
            <h2 className="text-4xl font-black text-slate-900">{data.completed}</h2>
            <p className="text-xs text-slate-500 font-semibold mt-2">IR sensor verified</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Missed Doses</span>
            <div className="p-2 bg-red-50 text-red-600 rounded-xl"><AlertTriangle className="w-4 h-4" /></div>
          </div>
          <div>
            <h2 className="text-4xl font-black text-slate-900">{data.missed}</h2>
            <p className="text-xs text-red-500 font-semibold mt-2">Twilio alerts fired</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Total Scheduled</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl"><Package className="w-4 h-4" /></div>
          </div>
          <div>
            <h2 className="text-4xl font-black text-slate-900">{data.total}</h2>
            <p className="text-xs text-purple-600 font-semibold mt-2">Dose events recorded</p>
          </div>
        </div>
      </div>

      {/* Visual Recharts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Weekly Adherence Chart */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-black text-slate-900">Weekly Dosage Trend</h2>
              <p className="text-xs text-slate-500">Pills taken vs missed over the last 7 days</p>
            </div>
          </div>
          
          <div className="h-64 w-full">
            {(!data.weekly_trend || data.weekly_trend.length === 0) ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">No dosage trend recorded yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.weekly_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '15px' }} />
                  <Bar dataKey="taken" name="Taken" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="missed" name="Missed" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Hourly Distribution Chart */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-black text-slate-900">Time-of-Day Distribution</h2>
              <p className="text-xs text-slate-500">Hourly dosage breakdown (6:00 AM - 9:00 PM)</p>
            </div>
          </div>
          
          <div className="h-64 w-full">
            {(!data.hourly_distribution || data.hourly_distribution.length === 0) ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">No hourly data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.hourly_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="doses" name="Scheduled Doses" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* Real-time Inventory & Stock Levels */}
      <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
        <h2 className="text-xl font-black text-slate-900 mb-1">Medicine Stock Inventory Monitor</h2>
        <p className="text-xs text-slate-500 font-semibold mb-6">Real-time remaining tablet count vs rounded upper max stock</p>

        {(!data.inventory_status || data.inventory_status.length === 0) ? (
          <p className="text-slate-400 text-center py-6 text-sm">No medicines registered in inventory.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.inventory_status.map((item) => {
              const maxStock = getNearbyRoundMax(item.stock_quantity);
              const percentage = Math.min(100, Math.round((item.stock_quantity / maxStock) * 100));

              return (
                <div key={item.id} className="bg-white/70 backdrop-blur-sm border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-base">{item.name}</h4>
                      <p className="text-xs text-slate-500 font-semibold">{item.strength || 'Standard Dose'}</p>
                    </div>
                    {item.is_low ? (
                      <span className="bg-red-100 text-red-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 border border-red-200 animate-pulse">
                        <AlertTriangle className="w-3 h-3" /> Low Stock
                      </span>
                    ) : (
                      <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border border-emerald-200">
                        Stock OK
                      </span>
                    )}
                  </div>

                  <div className="mt-5">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-2">
                      <span>Current Stock</span>
                      <span className={item.is_low ? 'text-red-600 font-black' : 'text-slate-900'}>
                        {item.stock_quantity} / {maxStock}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200/80 h-3 rounded-full overflow-hidden p-0.5">
                      <motion.div 
                        initial={{ width: 0 }}
                        whileInView={{ width: `${percentage}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                        className={`relative h-full rounded-full overflow-hidden ${item.is_low ? 'bg-red-500' : 'bg-emerald-500'}`}
                      >
                        {/* Shimmer sweep */}
                        <motion.div
                          animate={{ x: ['-100%', '200%'] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none"
                        />
                      </motion.div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
