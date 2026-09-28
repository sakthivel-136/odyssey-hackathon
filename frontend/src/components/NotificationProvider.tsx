'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const router = useRouter();

  useEffect(() => {
    if ('Notification' in window) {
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
        
        if (notifications && Array.isArray(notifications) && notifications.length > 0) {
          // Read previously shown notification IDs from localStorage
          const storedShown = localStorage.getItem('medibox_shown_notif_ids');
          const shownIds: string[] = storedShown ? JSON.parse(storedShown) : [];
          
          let newlyShownCount = 0;
          const updatedShownIds = [...shownIds];

          for (const notification of notifications) {
            // Check if this notification was already shown
            if (!shownIds.includes(notification.id)) {
              updatedShownIds.push(notification.id);
              newlyShownCount++;

              // Trigger native push notification banner if permission is granted
              if (permission === 'granted' || (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted')) {
                try {
                  const nativeNotif = new Notification(notification.title, {
                    body: notification.message,
                    icon: '/icon.png',
                    silent: false
                  });
                  
                  nativeNotif.onclick = () => {
                    window.focus();
                    router.push('/notifications');
                  };
                } catch (e) {
                  console.warn("Failed to pop native push banner:", e);
                }
              }
            }
          }
          
          // Save updated shown IDs (keep last 50)
          if (newlyShownCount > 0) {
            localStorage.setItem('medibox_shown_notif_ids', JSON.stringify(updatedShownIds.slice(-50)));
          }
        }
      } catch (error) {
        console.error("Error polling notifications:", error);
      }
    };

    // Poll every 8 seconds
    intervalId = setInterval(pollNotifications, 8000);
    pollNotifications();

    return () => clearInterval(intervalId);
  }, [permission, router]);

  return <>{children}</>;
}
