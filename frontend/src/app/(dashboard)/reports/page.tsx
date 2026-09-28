'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart as BarChartIcon, Activity, Wifi, Package, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

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
        const res = await fetch('/api/reports/adherence', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
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
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-black text-slate-900 mb-1">Medicine Stock Inventory Monitor</h2>
        <p className="text-xs text-slate-500 mb-6">Real-time remaining tablet count vs low stock threshold</p>

        {(!data.inventory_status || data.inventory_status.length === 0) ? (
          <p className="text-slate-400 text-center py-6 text-sm">No medicines registered in inventory.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.inventory_status.map((item) => (
              <div key={item.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-base">{item.name}</h4>
                    <p className="text-xs text-slate-500 font-semibold">{item.strength || 'Standard Dose'}</p>
                  </div>
                  {item.is_low ? (
                    <span className="bg-red-100 text-red-700 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Low Stock
                    </span>
                  ) : (
                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider">
                      Stock OK
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1.5">
                    <span>Remaining Stock</span>
                    <span className={item.is_low ? 'text-red-600 font-black' : 'text-slate-900'}>{item.stock_quantity} / {item.low_stock_threshold + 20}</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${item.is_low ? 'bg-red-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, (item.stock_quantity / (item.low_stock_threshold + 20)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
