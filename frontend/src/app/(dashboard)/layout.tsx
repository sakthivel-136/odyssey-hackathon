'use client';

import { Activity, LayoutDashboard, Settings, Box, Bell, Pill, CalendarClock, PowerSquare, Wrench, Menu, X, CheckCircle, PackageOpen } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { PermissionModal } from '@/components/PermissionModal';

const USER_NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/devices', label: 'Devices', icon: Box },
  { href: '/medicines', label: 'Medicines', icon: Pill },
  { href: '/schedules', label: 'Schedules', icon: CalendarClock },
  { href: '/control', label: 'Control Center', icon: PowerSquare },
  { href: '/history', label: 'History', icon: Activity },
  { href: '/reports', label: 'Reports', icon: Activity },
  { href: '/ai-insights', label: 'AI Insights', icon: Activity },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/orders', label: 'My Orders', icon: PackageOpen },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const ADMIN_NAV_ITEMS = [
  { href: '/admin', label: 'Revenue Dashboard', icon: Activity },
  { href: '/admin/orders', label: 'View Orders', icon: PackageOpen },
  { href: '/admin/building', label: 'Building Process', icon: Wrench },
  { href: '/admin/history', label: 'Order History', icon: CheckCircle },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setIsAdmin(session.user.email === 'admin@medibox.com');
      }
      setLoading(false);
    }
    checkAuth();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return null;

  const NAV_ITEMS = isAdmin ? ADMIN_NAV_ITEMS : USER_NAV_ITEMS;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-xl">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="font-black tracking-tight text-slate-900 text-lg">Medibox</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="p-2.5 bg-slate-100 rounded-xl text-slate-700 hover:bg-slate-200 transition-colors"
          aria-label="Toggle Navigation Menu"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6 text-slate-900" /> : <Menu className="w-6 h-6 text-slate-900" />}
        </button>
      </div>

      {/* Mobile Right-Side Slide-Over Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50"
            />

            {/* Right Drawer Panel */}
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="md:hidden fixed inset-y-0 right-0 w-72 bg-white z-50 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto"
            >
              <div>
                <div className="flex items-center justify-between pb-6 border-b border-slate-100 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-xl">
                      <Activity className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-black text-slate-900 text-lg">Medibox</span>
                  </div>
                  <button 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <nav className="space-y-1.5">
                  {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all ${
                          isActive 
                            ? 'bg-blue-50 text-blue-700 font-bold shadow-sm' 
                            : 'text-slate-600 hover:bg-slate-50 font-semibold'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-6 border-t border-slate-100 mt-6">
                <button 
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-600 font-bold hover:bg-red-50 border border-red-100 transition-colors"
                >
                  <PowerSquare className="w-5 h-5" />
                  Sign Out
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col fixed h-full z-40">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl shadow-sm">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-black tracking-tight text-slate-900 leading-tight">Medibox</h1>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                {isAdmin ? 'Admin Panel' : 'Smart Companion'}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700 font-bold shadow-sm' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-slate-500 hover:bg-slate-50 hover:text-red-600 font-medium transition-colors group"
          >
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-red-100">
              <span className="text-xs font-bold text-slate-500 group-hover:text-red-600">N</span>
            </div>
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 bg-slate-50 min-h-screen">
        <PermissionModal />
        <div className="p-4 md:p-8 pt-6">
          {children}
        </div>
      </main>
    </div>
  );
}
