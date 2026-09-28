'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const router = useRouter();

  useEffect(() => {
    // 1. Register Service Worker for Mobile OS System Notification Bar
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('Mobile Service Worker registered for Medibox Push:', reg.scope);
      }).catch((err) => {
        console.warn('Service Worker registration failed:', err);
      });
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }

    let intervalId: NodeJS.Timeout;

    const pollNotifications = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      try {
        let res = await fetch('/api/notifications', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (!res.ok) {
          res = await fetch('https://odyssey-hackathon.onrender.com/api/notifications', {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          });
        }
        if (!res.ok) return;
        
        const notifications = await res.json();
        
        if (notifications && Array.isArray(notifications) && notifications.length > 0) {
          const storedShown = localStorage.getItem('medibox_shown_notif_ids');
          const shownIds: string[] = storedShown ? JSON.parse(storedShown) : [];
          
          let newlyShownCount = 0;
          const updatedShownIds = [...shownIds];

          for (const notification of notifications) {
            if (!shownIds.includes(notification.id)) {
              updatedShownIds.push(notification.id);
              newlyShownCount++;

              // TRIGGER MOBILE OS SYSTEM NOTIFICATION BAR ALERT VIA SERVICE WORKER
              let shownViaSW = false;
              if ('serviceWorker' in navigator) {
                try {
                  const reg = await navigator.serviceWorker.ready;
                  await reg.showNotification(notification.title, {
                    body: notification.message,
                    icon: '/icon-192.png',
                    badge: '/icon-192.png',
                    vibrate: [300, 100, 300],
                    tag: notification.id,
                    data: { url: '/notifications' }
                  });
                  shownViaSW = true;
                } catch (swErr) {
                  console.warn("ServiceWorker showNotification error:", swErr);
                }
              }

              // Fallback for standard desktop windows
              if (!shownViaSW && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                try {
                  const nativeNotif = new Notification(notification.title, {
                    body: notification.message,
                    icon: '/icon-192.png'
                  });
                  nativeNotif.onclick = () => {
                    window.focus();
                    router.push('/notifications');
                  };
                } catch (e) {
                  console.warn("Desktop notification fallback error:", e);
                }
              }
            }
          }
          
          if (newlyShownCount > 0) {
            localStorage.setItem('medibox_shown_notif_ids', JSON.stringify(updatedShownIds.slice(-50)));
          }
        }
      } catch (error) {
        console.error("Error polling notifications:", error);
      }
    };

    intervalId = setInterval(pollNotifications, 8000);
    pollNotifications();

    return () => clearInterval(intervalId);
  }, [permission, router]);

  return <>{children}</>;
}
