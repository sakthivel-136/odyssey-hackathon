'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Activity } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    console.log("Checking session...");
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Session resolved:", session ? "YES" : "NO");
      if (session) {
        console.log("Pushing to /dashboard");
        router.push('/dashboard');
      } else {
        console.log("Pushing to /login");
        router.push('/login');
      }
    }).catch(err => {
      console.error("Session error:", err);
      router.push('/login');
    });
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-pulse flex flex-col items-center">
        <Activity className="text-blue-600 w-12 h-12 mb-4" />
        <p className="text-slate-500 font-medium">Loading Smart Medibox...</p>
      </div>
    </div>
  );
}
