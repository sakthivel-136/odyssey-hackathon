'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, IndianRupee, Activity, Crown, Zap, Shield, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminSaaSDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkAdmin() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.email !== 'admin@medibox.com') {
        router.push('/dashboard');
        return;
      }
      fetchData();
    }
    checkAdmin();
  }, []);

  const fetchData = async () => {
    // Fetch all orders for revenue calculations
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (data) setOrders(data);
    setLoading(false);
  };

  if (loading) return <div className="p-8 font-bold text-slate-500">Loading SaaS Metrics...</div>;

  // Calculate Metrics
  const basicOrders = orders.filter(o => o.num_containers === 1 || o.num_containers === 11);
  const proOrders = orders.filter(o => o.num_containers === 3 || o.num_containers === 13 || (o.num_containers !== 1 && o.num_containers !== 11 && o.num_containers !== 6 && o.num_containers !== 16));
  const ultraOrders = orders.filter(o => o.num_containers === 6 || o.num_containers === 16);

    const calculateMRR = (orderList: any[]) => {
    return orderList.reduce((acc, order) => {
      if (order.num_containers > 10) return acc + 150; // Premium Add-on is 150/mo
      return acc;
    }, 0);
  };
  
  const calculateHardwareSales = (orderList: any[]) => {
    return orderList.reduce((acc, order) => {
      if (order.num_containers === 1 || order.num_containers === 11) return acc + 4500;
      if (order.num_containers === 6 || order.num_containers === 16) return acc + 7000;
      return acc + 5000; // Pro is default fallback
    }, 0);
  };

  const totalMRR = calculateMRR(orders);
  const totalHardwareSales = calculateHardwareSales(orders);
  
  // Today's Revenue
  const today = new Date().toISOString().split('T')[0];
  const todaysOrders = orders.filter(o => o.created_at.startsWith(today));
  const todayMRR = calculateMRR(todaysOrders);
  const todayHardwareSales = calculateHardwareSales(todaysOrders);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 md:pb-0">
      <header className="border-b border-slate-200 pb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-600" /> SaaS Revenue Dashboard
          </h1>
          <p className="text-slate-500 mt-2">Live metrics for the Smart Medibox platform.</p>
        </div>
        <button onClick={() => router.push('/admin/orders')} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-800 transition">
          View Pending Hardware Builds
        </button>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 text-emerald-600 mb-2 font-bold text-sm uppercase tracking-wider">
            <IndianRupee className="w-4 h-4" /> Total MRR (Monthly)
          </div>
          <div className="text-4xl font-black text-slate-900">₹{totalRevenue.toLocaleString()}</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 text-blue-600 mb-2 font-bold text-sm uppercase tracking-wider">
            <TrendingUp className="w-4 h-4" /> Today's Sales
          </div>
          <div className="text-4xl font-black text-slate-900">₹{todayRevenue.toLocaleString()}</div>
          <div className="text-sm text-slate-500 mt-1">{todaysOrders.length} new subscribers today</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 text-purple-600 mb-2 font-bold text-sm uppercase tracking-wider">
            <Users className="w-4 h-4" /> Active Subscriptions
          </div>
          <div className="text-4xl font-black text-slate-900">{orders.length}</div>
        </div>
      </div>

      {/* Plan Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex items-center gap-4">
          <div className="bg-slate-200 p-4 rounded-2xl text-slate-600"><Shield className="w-8 h-8"/></div>
          <div>
            <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">Basic Plan</div>
            <div className="text-3xl font-black text-slate-900">{basicOrders.length} Users</div>
          </div>
        </div>
        
        <div className="bg-blue-50 p-6 rounded-3xl border border-blue-200 flex items-center gap-4">
          <div className="bg-blue-200 p-4 rounded-2xl text-blue-700"><Zap className="w-8 h-8"/></div>
          <div>
            <div className="text-sm font-bold text-blue-600 uppercase tracking-wider">Pro Plan</div>
            <div className="text-3xl font-black text-slate-900">{proOrders.length} Users</div>
          </div>
        </div>

        <div className="bg-purple-900 p-6 rounded-3xl border border-purple-800 flex items-center gap-4">
          <div className="bg-purple-800 p-4 rounded-2xl text-purple-300"><Crown className="w-8 h-8"/></div>
          <div>
            <div className="text-sm font-bold text-purple-400 uppercase tracking-wider">Ultra Plan</div>
            <div className="text-3xl font-black text-white">{ultraOrders.length} Users</div>
          </div>
        </div>
      </div>

      {/* User Segregation Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-black text-slate-900">Subscriber Database</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider font-bold">
                <th className="p-4 pl-6">Customer</th>
                <th className="p-4">Device ID</th>
                <th className="p-4">Plan Tier</th>
                <th className="p-4">Hardware</th>
<th className="p-4">MRR (Add-on)</th>
                <th className="p-4">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map(order => {
                const plan = order.num_containers === 1 ? 'Basic' : order.num_containers === 11 ? 'Basic+AI' : order.num_containers === 6 ? 'Ultra' : order.num_containers === 16 ? 'Ultra+AI' : order.num_containers === 13 ? 'Pro+AI' : 'Pro';
                const hwPrice = plan.includes('Basic') ? 4500 : plan.includes('Ultra') ? 7000 : 5000; const hasAddon = plan.includes('+AI');
                
                return (
                  <tr key={order.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 pl-6 font-bold text-slate-900">{order.customer_name}</td>
                    <td className="p-4 text-slate-500 font-mono text-sm">{order.box_name}</td>
                    <td className="p-4">
                      {plan === 'Basic' && <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold">Basic</span>}
                      {plan === 'Basic+AI' && <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">Basic + Addon</span>}
                      {plan === 'Pro' && <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">Pro</span>}
                      {plan === 'Pro+AI' && <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">Pro + Addon</span>}
                      {plan === 'Ultra' && <span className="bg-purple-200 text-purple-900 px-3 py-1 rounded-full text-xs font-bold">Ultra</span>}
{plan === 'Ultra+AI' && <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">Ultra + Addon</span>}
                    </td>
                    <td className="p-4 font-bold text-slate-700">₹{hwPrice}</td>
<td className="p-4 font-bold text-emerald-600">{hasAddon ? '₹150' : '-'}</td>
                    <td className="p-4 text-slate-400 text-sm">{new Date(order.created_at).toLocaleDateString()}</td>
                  </tr>
                )
              })}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">No subscribers found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
