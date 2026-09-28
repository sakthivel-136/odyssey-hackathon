'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const router = useRouter();

  useEffect(() => {
    // Request permission safely (some browsers block this on mount)
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        Notification.requestPermission().then(setPermission).catch(e => console.warn(e));
      } catch (e) {
        console.warn("Could not request notification permission on mount:", e);
      }
    } else if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    let intervalId: NodeJS.Timeout;

    const pollNotifications = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      try {
        const res = await fetch('/api/notifications', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (!res.ok) return;
        
        const notifications = await res.json();
        
        if (notifications && notifications.length > 0) {
          const idsToMarkRead = [];
          
          for (const notification of notifications) {
            // Only trigger if permission is granted
            if (permission === 'granted' || Notification.permission === 'granted') {
              try {
                const nativeNotif = new Notification(notification.title, {
                  body: notification.message,
                  icon: '/icon.png', // Optional icon
                  silent: true // Prevents NotAllowedError: play() on some browsers
                });
                
                nativeNotif.onclick = () => {
                  window.focus();
                  router.push('/notifications');
                };
              } catch (e) {
                console.warn("Failed to show notification:", e);
              }
            }
            
            idsToMarkRead.push(notification.id);
          }
          
          // Mark as read so we don't notify again
          await fetch('/api/notifications/mark-read', {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ notification_ids: idsToMarkRead })
          });
        }
      } catch (error) {
        console.error("Error polling notifications:", error);
      }
    };

    // Poll every 10 seconds
    intervalId = setInterval(pollNotifications, 10000);
    // Initial poll
    pollNotifications();

    return () => clearInterval(intervalId);
  }, [permission, router]);

  return <>{children}</>;
}
