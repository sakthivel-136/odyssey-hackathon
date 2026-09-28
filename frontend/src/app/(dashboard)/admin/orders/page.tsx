'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Settings, Clock, PackageOpen, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminPendingOrdersPage() {
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
      fetchOrders();
    }
    checkAdmin();
  }, []);

  const fetchOrders = async () => {
    const { data } = await supabase.from('orders').select('*').eq('status', 'PENDING').order('created_at', { ascending: false });
    if (data) setOrders(data);
    setLoading(false);
  };

  const moveToBuilding = async (id: string) => {
    await supabase.from('orders').update({ status: 'BUILDING' }).eq('id', id);
    fetchOrders(); // Refresh list
  };

  const cancelOrder = async (id: string) => {
    if (window.confirm("Are you sure you want to cancel this order?")) {
      await supabase.from('orders').update({ status: 'CANCELED' }).eq('id', id);
      fetchOrders();
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 md:pb-0">
      <header className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <PackageOpen className="w-8 h-8 text-blue-600" /> Pending Orders
        </h1>
        <p className="text-slate-500 mt-2">Review new customer orders and move them to the building process.</p>
      </header>

      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-500 font-medium shadow-sm">
            No pending orders at the moment.
          </div>
        ) : orders.map(order => (
          <div key={order.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition hover:shadow-md">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-bold text-xl text-slate-900">{order.customer_name}</h3>
                <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-1"><Clock className="w-3 h-3"/> Pending</span>
              </div>
              <p className="text-sm text-slate-500 font-medium">Device: <span className="text-slate-700">{order.box_name}</span> • {order.num_containers > 10 ? order.num_containers - 10 : order.num_containers} Compartments</p>
              <p className="text-xs text-slate-400 mt-1">Ordered on: {new Date(order.created_at).toLocaleString()}</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => cancelOrder(order.id)}
                className="text-red-500 hover:bg-red-50 px-4 py-3 rounded-xl font-bold transition flex items-center justify-center whitespace-nowrap"
              >
                Cancel
              </button>
              <button 
                onClick={() => moveToBuilding(order.id)}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-md shadow-blue-200 hover:bg-blue-700 transition flex items-center justify-center gap-2 whitespace-nowrap"
              >
                Move to Building Process <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
