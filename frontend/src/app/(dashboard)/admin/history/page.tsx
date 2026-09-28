'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle, Clock, Download, Printer } from 'lucide-react';
import QRCode from 'react-qr-code';
import { useRouter } from 'next/navigation';

export default function AdminHistoryPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  // Track which order we are printing
  const [printOrder, setPrintOrder] = useState<any>(null);

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
    const { data } = await supabase.from('orders').select('*').eq('status', 'BUILT').order('created_at', { ascending: false });
    if (data) setOrders(data);
    setLoading(false);
  };

  const downloadQR = async (order: any) => {
    if (order.admin_qr_downloads >= 2) {
      alert("Security Limit Reached: You have already downloaded the QR code for this order the maximum number of times (2).");
      return;
    }
    
    // Increment download count
    const newCount = (order.admin_qr_downloads || 0) + 1;
    await supabase.from('orders').update({ admin_qr_downloads: newCount }).eq('id', order.id);
    
    // Set order for printing and trigger print
    setPrintOrder(order);
    setTimeout(() => {
      window.print();
      setPrintOrder(null);
      fetchOrders(); // Refresh to get updated count
    }, 500);
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 md:pb-0">
      <header className="border-b border-slate-200 pb-6 print:hidden">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <CheckCircle className="w-8 h-8 text-blue-600" /> Order History
        </h1>
        <p className="text-slate-500 mt-2">View completed manufacturing orders and securely access QR codes.</p>
      </header>

      <div className="space-y-4 print:hidden">
        {orders.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-500 font-medium shadow-sm">
            No completed orders yet.
          </div>
        ) : orders.map(order => (
          <div key={order.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition hover:shadow-md">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-bold text-xl text-slate-900">{order.customer_name}</h3>
                <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Built & Shipped</span>
              </div>
              <p className="text-sm text-slate-500 font-medium">Device: <span className="text-slate-700">{order.box_name}</span> • {order.num_containers} Compartments</p>
              <p className="text-xs text-slate-400 mt-1">Ordered on: {new Date(order.created_at).toLocaleString()}</p>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              {order.status === 'CANCELED' ? (
                <span className="text-sm font-bold text-slate-400 italic">Order was canceled.</span>
              ) : (
                <>
                  <button 
                    onClick={() => downloadQR(order)}
                    disabled={order.admin_qr_downloads >= 2}
                    className={`px-6 py-2.5 rounded-xl font-bold shadow-sm transition flex items-center justify-center gap-2 whitespace-nowrap ${
                      order.admin_qr_downloads >= 2 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                        : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {order.admin_qr_downloads >= 2 ? (
                      <>Limit Reached (2/2)</>
                    ) : (
                      <><Printer className="w-4 h-4" /> Download QR ({order.admin_qr_downloads || 0}/2)</>
                    )}
                  </button>
                  <span className="text-[10px] text-slate-400 font-medium">Admin is restricted to 2 downloads.</span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Print View for QR Code (Only visible when printing) */}
      {printOrder && (
        <div className="hidden print:block fixed inset-0 bg-white z-50 p-10">
          <div className="max-w-2xl mx-auto border-4 border-slate-900 p-12 rounded-3xl text-center">
            <h1 className="text-4xl font-black mb-2">MEDIBOX PAIRING QR</h1>
            <p className="text-xl text-slate-500 mb-8">{printOrder.box_name}</p>
            <div className="flex justify-center mb-8">
              <QRCode value={`{"device_id":"${printOrder.box_name}","type":"medibox"}`} size={256} />
            </div>
            <p className="font-bold text-slate-800">Scan this QR code in the Medibox App to pair your device.</p>
          </div>
        </div>
      )}
    </div>
  );
}
