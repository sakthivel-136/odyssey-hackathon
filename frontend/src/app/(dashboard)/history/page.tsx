'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Clock, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { motion } from 'framer-motion';

type DoseEvent = {
  id: string;
  created_at: string;
  status: 'taken' | 'missed' | 'skipped' | 'pending';
  scheduled_time: string | null;
  medicines?: {
    name: string;
    dosage: string;
  };
};

export default function HistoryPage() {
  const [events, setEvents] = useState<DoseEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const { data, error } = await supabase
          .from('dose_events')
          .select(`
            id,
            created_at,
            status,
            scheduled_time,
            medicines (
              name,
              dosage
            )
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching history:', error);
        }

        if (data) {
          // Cast the data to our type because Supabase nested selects can be tricky to type perfectly without generated types
          setEvents(data as unknown as DoseEvent[]);
        } else {
          setEvents([]);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 px-4 sm:px-0">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="pb-6 border-b border-slate-200"
      >
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <Clock className="w-8 h-8 text-blue-600" />
          Dose History
        </h1>
        <p className="text-slate-500 mt-2 text-lg">Review your past medication events and adherence.</p>
      </motion.header>

      <div className="relative">
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-200 hidden sm:block"></div>
        {events.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center shadow-sm">
            <h3 className="text-xl font-bold text-slate-800 mb-2">No History Yet</h3>
            <p className="text-slate-500">Your medication events will appear here once your device starts recording them.</p>
          </div>
        ) : (
        <div className="space-y-6">
          {events.map((event, index) => {
            const isTaken = event.status === 'taken';
            const dateObj = new Date(event.created_at);
            const dateStr = dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
            const timeStr = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
            const medName = event.medicines?.name || 'Unknown Medication';
            const medDosage = event.medicines?.dosage || '';

            return (
              <motion.div 
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative flex items-start gap-6 group"
              >
                <div className="hidden sm:flex relative z-10 w-16 h-16 rounded-full bg-white border-4 border-slate-50 items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                  {isTaken ? (
                    <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-7 h-7 text-red-500" />
                  )}
                </div>
                
                <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{medName} {medDosage}</h3>
                      <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
                        <Clock className="w-4 h-4" />
                        <span>{dateStr} at {timeStr}</span>
                      </div>
                    </div>
                    <div>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${
                        isTaken ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {isTaken ? 'Taken on time' : 'Missed Dose'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 rounded-xl p-4 flex items-start gap-3">
                    <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-600">
                      {isTaken 
                        ? 'Dose was successfully dispensed and taken from the smart device.' 
                        : 'Dose was not taken within the scheduled time window. An alert may have been sent to your emergency contact.'}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}
