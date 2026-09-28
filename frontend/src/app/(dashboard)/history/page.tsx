'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Clock, CheckCircle2, AlertCircle, Info, Filter, Search, Pill, ShieldCheck, PhoneCall } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type HistoryEvent = {
  id: string;
  event_date: string;
  scheduled_time: string;
  taken_time: string | null;
  status: 'COMPLETED' | 'MISSED' | 'IN_PROGRESS' | string;
  medicine_name: string;
  strength: string;
  dose_quantity: number;
  device_name: string;
  created_at: string;
};

export default function HistoryPage() {
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'COMPLETED' | 'MISSED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/history', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setEvents(data.events || []);
        }
      } catch (err) {
        console.error('Error fetching history:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, []);

  const filteredEvents = (events || []).filter(e => {
    const matchesStatus = filterStatus === 'ALL' || e.status === filterStatus;
    const matchesSearch = e.medicine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          e.status.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalDoses = events.length;
  const completedDoses = events.filter(e => e.status === 'COMPLETED').length;
  const missedDoses = events.filter(e => e.status === 'MISSED').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 px-4 sm:px-0 pb-12">
      {/* Header & Overview Stats */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Clock className="w-8 h-8 text-blue-600" />
              Medication History Log
            </h1>
            <p className="text-slate-500 mt-1 text-base">Real-time audit trail of all automated dosage events and IR sensor verifications.</p>
          </div>
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filterStatus === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({totalDoses})
            </button>
            <button
              onClick={() => setFilterStatus('COMPLETED')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filterStatus === 'COMPLETED' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-600 hover:text-emerald-600'
              }`}
            >
              Completed ({completedDoses})
            </button>
            <button
              onClick={() => setFilterStatus('MISSED')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filterStatus === 'MISSED' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-600 hover:text-red-600'
              }`}
            >
              Missed ({missedDoses})
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by medicine name or status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium"
          />
        </div>
      </motion.header>

      {/* Timeline List */}
      <div className="relative">
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-200 hidden sm:block"></div>

        {filteredEvents.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center shadow-sm">
            <Pill className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800 mb-1">No Events Found</h3>
            <p className="text-slate-400 text-sm">No dose events match your current filter criteria.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {filteredEvents.map((event, index) => {
                const isCompleted = event.status === 'COMPLETED';
                const isMissed = event.status === 'MISSED';
                const createdDate = new Date(event.created_at);
                const timeString = createdDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                const dateString = createdDate.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });

                return (
                  <motion.div 
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative flex items-start gap-6 group"
                  >
                    {/* Status Circle */}
                    <div className="hidden sm:flex relative z-10 w-16 h-16 rounded-full bg-white border-4 border-slate-50 items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                      {isCompleted ? (
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                      ) : isMissed ? (
                        <AlertCircle className="w-8 h-8 text-red-500" />
                      ) : (
                        <Clock className="w-8 h-8 text-amber-500 animate-pulse" />
                      )}
                    </div>
                    
                    {/* Event Card */}
                    <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-black text-slate-900">{event.medicine_name}</h3>
                            {event.strength && (
                              <span className="bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-lg font-bold">
                                {event.strength}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-slate-500 text-xs font-semibold mt-1.5">
                            <span className="flex items-center gap-1 text-slate-700">
                              <Clock className="w-3.5 h-3.5 text-blue-500" /> {dateString} at {timeString}
                            </span>
                            <span>•</span>
                            <span>Quantity: {event.dose_quantity} tablet(s)</span>
                          </div>
                        </div>

                        <div>
                          <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black tracking-wide ${
                            isCompleted 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : isMissed 
                              ? 'bg-red-100 text-red-800 border border-red-200' 
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {isCompleted ? '✓ TAKEN & VERIFIED' : isMissed ? '✕ DOSE MISSED' : '⌛ IN PROGRESS'}
                          </span>
                        </div>
                      </div>

                      {/* Detailed Footer Info */}
                      <div className={`rounded-2xl p-4 flex items-start gap-3 text-xs font-medium ${
                        isCompleted ? 'bg-emerald-50 text-emerald-900 border border-emerald-100' : 'bg-red-50 text-red-900 border border-red-100'
                      }`}>
                        {isCompleted ? (
                          <>
                            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold text-emerald-950">IR Sensor Verified</p>
                              <p className="text-emerald-700 mt-0.5">Lid opened for compartment and hand movement was verified by IR sensor. Inventory stock updated automatically.</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <PhoneCall className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold text-red-950">30s Missed Alert & Twilio Call Triggered</p>
                              <p className="text-red-700 mt-0.5">Lid was not accessed within 30 seconds. Twilio emergency voice call was dispatched to patient's phone and lid locked at 60s.</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
