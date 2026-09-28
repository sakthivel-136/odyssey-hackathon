'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Bell, ShieldAlert, CheckCircle2, Clock, AlertTriangle, Info, BellRing } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotifications() {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
        
      if (data) setNotifications(data);
      setLoading(false);
      
      // Mark unread as read
      if (data && data.some(n => !n.is_read)) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', session.user.id)
          .eq('is_read', false);
      }
    }
    
    fetchNotifications();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 px-4 sm:px-0 pb-12">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="pb-6 border-b border-slate-200"
      >
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <Bell className="w-8 h-8 text-blue-600" />
          System & Dose Notifications
        </h1>
        <p className="text-slate-500 mt-1 text-base">Real-time database alerts for schedule starts, missed doses, and inventory warnings.</p>
      </motion.header>

      {notifications.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center shadow-sm">
          <BellRing className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-slate-800 mb-1">All Caught Up!</h3>
          <p className="text-slate-400 text-sm">No recent alerts or notifications in your account.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {notifications.map((notif, idx) => {
              const isError = notif.type === 'error' || notif.title.includes('MISSED');
              const isWarning = notif.type === 'warning' || notif.title.includes('Warning') || notif.title.includes('Stock');
              
              const createdDate = new Date(notif.created_at);
              const timeString = createdDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
              const dateString = createdDate.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });

              return (
                <motion.div 
                  key={notif.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`bg-white p-5 rounded-3xl border-l-4 shadow-sm flex items-start gap-4 border-y border-r border-slate-200 transition-all ${
                    isError ? 'border-l-red-500' : isWarning ? 'border-l-amber-500' : 'border-l-blue-500'
                  }`}
                >
                  <div className={`p-3 rounded-2xl shrink-0 h-min ${
                    isError ? 'bg-red-50 text-red-600' : isWarning ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {isError ? <ShieldAlert className="w-6 h-6" /> : isWarning ? <AlertTriangle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-black text-slate-900 text-base">{notif.title}</h3>
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0">
                        {dateString} at {timeString}
                      </span>
                    </div>
                    <p className="text-slate-600 text-sm font-medium leading-relaxed">{notif.message}</p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
