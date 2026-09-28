'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Bell, ShieldAlert, CheckCircle2, Clock, AlertTriangle, BellRing } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { TimelineSkeleton, EmptyState, SPRING_SNAPPY, SPRING_GENTLE } from '@/components/ui/motion';

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

      try {
        let res = await fetch('/api/notifications', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (!res.ok) {
          res = await fetch('https://odyssey-hackathon.onrender.com/api/notifications', {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          });
        }
        if (res.ok) {
          const data = await res.json();
          setNotifications(data || []);
        }
      } catch (e) {
        console.error('Error fetching notifications:', e);
      } finally {
        setLoading(false);
      }
    }
    
    fetchNotifications();
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 px-4 sm:px-0 pb-12">
        <div className="h-10 w-64 bg-slate-200 rounded-2xl animate-pulse" />
        <TimelineSkeleton />
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
        <p className="text-slate-500 mt-1 text-base">Real-time alerts for schedule starts, taken doses, missed alerts, and stock warnings.</p>
      </motion.header>

      {notifications.length === 0 ? (
        <EmptyState
          type="notifications"
          title="All Caught Up!"
          description="You have no unread alarms or system warnings. Medibox is monitoring your doses automatically."
        />
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {notifications.map((notif, idx) => {
              const isError = notif.type === 'error' || notif.title.includes('MISSED');
              const isSuccess = notif.type === 'success' || notif.title.includes('Verified');
              const isWarning = notif.type === 'warning' || notif.title.includes('Stock');
              
              const createdDate = new Date(notif.created_at);
              const timeString = createdDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
              const dateString = createdDate.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });

              return (
                <motion.div 
                  key={notif.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: idx * 0.04 }}
                  className={`bg-white p-5 rounded-3xl border-l-4 shadow-sm flex items-start gap-4 border-y border-r border-slate-200 transition-all ${
                    isError 
                      ? 'border-l-red-500' 
                      : isSuccess 
                      ? 'border-l-emerald-500' 
                      : isWarning 
                      ? 'border-l-amber-500' 
                      : 'border-l-blue-500'
                  }`}
                >
                  <div className={`p-3 rounded-2xl shrink-0 h-min ${
                    isError 
                      ? 'bg-red-50 text-red-600' 
                      : isSuccess 
                      ? 'bg-emerald-50 text-emerald-600' 
                      : isWarning 
                      ? 'bg-amber-50 text-amber-600' 
                      : 'bg-blue-50 text-blue-600'
                  }`}>
                    {isError ? (
                      <ShieldAlert className="w-6 h-6" />
                    ) : isSuccess ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : isWarning ? (
                      <AlertTriangle className="w-6 h-6" />
                    ) : (
                      <Clock className="w-6 h-6" />
                    )}
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
