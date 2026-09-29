'use client';

import { Activity, LayoutDashboard, Settings, Box, Bell, Pill, CalendarClock, PowerSquare, Wrench, Menu, X, CheckCircle, PackageOpen, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { PermissionModal } from '@/components/PermissionModal';
import { AnimatedBackground, TopProgressBar, SPRING_DRAWER, SPRING_SNAPPY, staggerContainer, staggerItem } from '@/components/ui/motion';

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
  const [userName, setUserName] = useState('Patient');
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setIsAdmin(session.user.email === 'admin@medibox.com');
        if (session.user.user_metadata?.full_name) {
          setUserName(session.user.user_metadata.full_name);
        } else if (session.user.email === 'demo@medibox.com' || session.user.email?.includes('demo')) {
          setUserName('SAKTHI');
        } else {
          setUserName(session.user.email?.split('@')[0] || 'Patient');
        }
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
    <div className="relative min-h-screen flex flex-col md:flex-row overflow-x-hidden">
      {/* 1. Global Animated Ambient Mesh Background & Route Bar */}
      <AnimatedBackground />
      <TopProgressBar />

      {/* 2. Mobile Top Header */}
      <div className="md:hidden bg-white/80 backdrop-blur-md border-b border-slate-200/80 p-4 flex justify-between items-center sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2">
          <motion.div 
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }}
            className="bg-blue-600 p-2 rounded-xl shadow-md shadow-blue-500/20"
          >
            <Activity className="w-5 h-5 text-white" />
          </motion.div>
          <span className="font-black tracking-tight text-slate-900 text-lg">Medibox</span>
        </div>
        <motion.button 
          whileTap={{ scale: 0.92 }}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="p-2.5 bg-slate-100/80 backdrop-blur-sm rounded-xl text-slate-700 hover:bg-slate-200 transition-colors"
          aria-label="Toggle Navigation Menu"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6 text-slate-900" /> : <Menu className="w-6 h-6 text-slate-900" />}
        </motion.button>
      </div>

      {/* 3. Mobile Right-Side Slide-Over Drawer */}
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

            {/* Right Drawer Panel with spring physics */}
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={SPRING_DRAWER}
              className="md:hidden fixed inset-y-0 right-0 w-72 bg-white/95 backdrop-blur-xl z-50 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto border-l border-white/60"
            >
              <div>
                <div className="flex items-center justify-between pb-6 border-b border-slate-100 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-xl shadow-md shadow-blue-500/20">
                      <Activity className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-black text-slate-900 text-lg">Medibox</span>
                  </div>
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                </div>

                <motion.nav 
                  variants={staggerContainer(0.04, 0.05)}
                  initial="hidden"
                  animate="visible"
                  className="space-y-1.5"
                >
                  {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <motion.div key={item.href} variants={staggerItem}>
                        <Link
                          href={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`relative flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all ${
                            isActive 
                              ? 'text-blue-700 font-bold' 
                              : 'text-slate-600 hover:bg-slate-100/60 font-semibold'
                          }`}
                        >
                          {/* Sliding Active Pill */}
                          {isActive && (
                            <motion.div
                              layoutId="active-mobile-nav-pill"
                              transition={SPRING_SNAPPY}
                              className="absolute inset-0 bg-blue-50/90 rounded-2xl shadow-sm -z-10 border border-blue-100"
                            />
                          )}
                          <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                          <span className="relative z-10">{item.label}</span>
                        </Link>
                      </motion.div>
                    );
                  })}
                </motion.nav>
              </div>

              <div className="pt-6 border-t border-slate-100 mt-6">
                <motion.button 
                  whileTap={{ scale: 0.96 }}
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-600 font-bold hover:bg-red-50/80 border border-red-100 transition-colors"
                >
                  <PowerSquare className="w-5 h-5" />
                  Sign Out
                </motion.button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* 4. Desktop Sidebar with Sliding Active Indicator */}
      <aside className="hidden md:flex w-64 bg-white/80 backdrop-blur-xl border-r border-slate-200/80 flex-col fixed h-full z-40">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-500/25"
            >
              <Activity className="w-6 h-6 text-white" />
            </motion.div>
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
                className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'text-blue-700 font-bold' 
                    : 'text-slate-500 hover:bg-slate-50/80 hover:text-slate-900 font-medium'
                }`}
              >
                {/* Desktop Sliding Active Pill */}
                {isActive && (
                  <motion.div
                    layoutId="active-desktop-nav-pill"
                    transition={SPRING_SNAPPY}
                    className="absolute inset-0 bg-blue-50 rounded-xl shadow-sm -z-10 border border-blue-100"
                  />
                )}
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'text-blue-600 scale-105' : 'text-slate-400'}`} />
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-2">
          <div className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-xs shadow-sm">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{userName}</p>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{isAdmin ? 'Admin' : 'Patient'}</p>
            </div>
          </div>

          <motion.button 
            whileTap={{ scale: 0.96 }}
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3 py-2 w-full rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 font-bold text-xs transition-colors group cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-slate-400 group-hover:text-red-600" />
            Sign Out
          </motion.button>
        </div>
      </aside>

      {/* 5. Main Viewport */}
      <main className="flex-1 md:ml-64 min-h-screen">
        <PermissionModal />
        <div className="p-4 md:p-8 pt-6">
          {children}
        </div>
      </main>
    </div>
  );
}
