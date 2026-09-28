'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Bell, ShieldAlert, Zap, Info } from 'lucide-react';

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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
        
      if (data) setNotifications(data);
      setLoading(false);
      
      // Mark as read
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

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
          <Bell className="w-8 h-8 text-blue-600" />
          Notifications
        </h1>
        <p className="text-slate-500 mt-1">Recent system alerts and messages.</p>
      </header>

      {notifications.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center shadow-sm">
          <h3 className="text-xl font-bold text-slate-800 mb-2">You're all caught up!</h3>
          <p className="text-slate-500">You don't have any notifications right now.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map(notif => {
            const isAlert = notif.type === 'alert' || notif.type === 'error';
            const isSuccess = notif.type === 'success';
            
            return (
              <div 
                key={notif.id}
                className={`bg-white p-5 rounded-2xl border-l-4 shadow-sm flex gap-4 border-y border-r border-slate-200 ${
                  isAlert ? 'border-l-amber-500' : isSuccess ? 'border-l-emerald-500' : 'border-l-blue-500'
                } ${!notif.is_read ? 'bg-slate-50' : ''}`}
              >
                <div className={`p-3 rounded-full shrink-0 h-min ${
                  isAlert ? 'bg-amber-50 text-amber-600' : isSuccess ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  {isAlert ? <ShieldAlert className="w-5 h-5" /> : isSuccess ? <Zap className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{notif.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{notif.message}</p>
                  <p className="text-xs text-slate-400 mt-2">{new Date(notif.created_at).toLocaleString()}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
