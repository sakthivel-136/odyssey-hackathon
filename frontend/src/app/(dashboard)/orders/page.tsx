'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Settings, Clock, PackageOpen, ArrowRight, CheckCircle, Wrench, XCircle, Download, Zap, Shield, Crown } from 'lucide-react';
import QRCode from 'react-qr-code';
import { motion } from 'framer-motion';

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [premiumAddon, setPremiumAddon] = useState<boolean>(false);
  const [formData, setFormData] = useState({ customer_name: '', box_name: '' });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
      
    if (data) setOrders(data);
    setLoading(false);
  };

  const getContainersForPlan = (plan: string) => {
    if (plan === 'Basic') return premiumAddon ? 11 : 1;
    if (plan === 'Pro') return premiumAddon ? 13 : 3;
    if (plan === 'Ultra') return premiumAddon ? 16 : 6;
    return 3;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) {
      alert("Please select a subscription plan first!");
      return;
    }
    
    setSubmitting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    // Check if box_name is already taken
    const { data: existingBox } = await supabase
      .from('orders')
      .select('id')
      .eq('box_name', formData.box_name)
      .maybeSingle();

    if (existingBox) {
      alert("This Box Name is already taken! Please choose a unique name (e.g., 'Medibox-Alpha-1').");
      setSubmitting(false);
      return;
    }
    
    const { error } = await supabase.from('orders').insert({
      user_id: session.user.id,
      customer_name: formData.customer_name,
      box_name: formData.box_name,
      num_boxes: 1,
      num_containers: getContainersForPlan(selectedPlan),
      status: 'PENDING',
      admin_qr_downloads: 0
    });

    if (error) {
      alert("Error placing order: " + error.message);
    } else {
      alert("Order placed successfully! Welcome to the " + selectedPlan + " plan!");
      setFormData({ customer_name: '', box_name: '' });
      setSelectedPlan(null);
      fetchOrders();
    }
    setSubmitting(false);
  };

  const handleDownloadQR = () => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20 md:pb-0">
      <header className="text-center mb-12 pt-8">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">
          Choose Your Smart Medibox Plan
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
          Get the ultimate medical adherence companion. Our SaaS subscription includes the physical IoT hardware delivered to your door.
        </p>
      </header>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {/* Basic Plan */}
        <motion.div 
          whileHover={{ y: -5 }}
          onClick={() => setSelectedPlan('Basic')}
          className={`relative bg-white rounded-3xl p-8 border-2 cursor-pointer transition-all ${selectedPlan === 'Basic' ? 'border-blue-500 shadow-xl shadow-blue-200/50 scale-105' : 'border-slate-200 hover:border-blue-300'}`}
        >
          <div className="absolute top-0 right-0 p-6 opacity-20"><Shield className="w-16 h-16 text-slate-500" /></div>
          <h3 className="text-2xl font-black text-slate-900 mb-2">Basic</h3>
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-4xl font-black text-blue-600">₹2,000</span>
            <span className="text-slate-500 font-medium">One-Time</span>
          </div>
          <ul className="space-y-4 mb-8 text-slate-600 font-medium">
            <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-blue-500"/> 1 Compartment Hardware</li>
            <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-blue-500"/> Standard App Access</li>
            <li className="flex items-center gap-3 text-slate-400"><XCircle className="w-5 h-5"/> Features Require Add-on</li>
          </ul>
        </motion.div>

        {/* Pro Plan */}
        <motion.div 
          whileHover={{ y: -5 }}
          onClick={() => setSelectedPlan('Pro')}
          className={`relative bg-white rounded-3xl p-8 border-2 cursor-pointer transition-all ${selectedPlan === 'Pro' ? 'border-blue-500 shadow-xl shadow-blue-200/50 scale-105 z-10' : 'border-slate-200 hover:border-blue-300'}`}
        >
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wider shadow-lg">Most Popular</div>
          <div className="absolute top-0 right-0 p-6 opacity-20"><Zap className="w-16 h-16 text-blue-500" /></div>
          <h3 className="text-2xl font-black text-slate-900 mb-2">Pro</h3>
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-4xl font-black text-blue-600">₹2,750</span>
            <span className="text-slate-500 font-medium">One-Time</span>
          </div>
          <ul className="space-y-4 mb-8 text-slate-600 font-medium">
            <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-blue-500"/> 3 Compartments Hardware</li>
            <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-blue-500"/> Standard App Access</li>
            <li className="flex items-center gap-3 text-slate-400"><XCircle className="w-5 h-5"/> Features Require Add-on</li>
          </ul>
        </motion.div>

        {/* Ultra Plan */}
        <motion.div 
          whileHover={{ y: -5 }}
          onClick={() => setSelectedPlan('Ultra')}
          className={`relative bg-slate-900 rounded-3xl p-8 border-2 cursor-pointer transition-all ${selectedPlan === 'Ultra' ? 'border-purple-500 shadow-xl shadow-purple-500/30 scale-105' : 'border-slate-800 hover:border-slate-700'}`}
        >
          <div className="absolute top-0 right-0 p-6 opacity-20"><Crown className="w-16 h-16 text-purple-400" /></div>
          <h3 className="text-2xl font-black text-white mb-2">Ultra</h3>
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-4xl font-black text-purple-400">₹3,999</span>
            <span className="text-slate-400 font-medium">One-Time</span>
          </div>
          <ul className="space-y-4 mb-8 text-slate-300 font-medium">
            <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-purple-400"/> 6 Compartments Hardware</li>
            <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-purple-400"/> Standard App Access</li>
            <li className="flex items-center gap-3 text-slate-500"><XCircle className="w-5 h-5"/> Features Require Add-on</li>
          </ul>
        </motion.div>
      </div>

      {/* Place Order Form (Only visible if a plan is selected) */}
      {selectedPlan && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/20 max-w-3xl mx-auto"
        >
          <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
            Complete {selectedPlan} Plan Order <ArrowRight className="w-5 h-5 text-slate-400"/>
          </h2>
          
          {selectedPlan && (
            <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl mb-6 flex items-start gap-3 cursor-pointer" onClick={() => setPremiumAddon(!premiumAddon)}>
              <input type="checkbox" checked={premiumAddon} onChange={() => {}} className="mt-1 w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" />
              <div>
                <p className="font-bold text-indigo-900">Add Premium Alert Package (+₹150/mo)</p>
                <p className="text-sm text-indigo-700 mt-1">Unlock AI Insights, Voice Calls, and Unlimited SMS alerts for your Smart Medibox.</p>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700">Full Name</label>
              <input required type="text" value={formData.customer_name} onChange={e => setFormData({...formData, customer_name: e.target.value})} placeholder="John Doe" className="w-full p-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition" />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700">Device Name (e.g., Mom's Medibox)</label>
              <input required type="text" value={formData.box_name} onChange={e => setFormData({...formData, box_name: e.target.value})} placeholder="MEDIBOX-001" className="w-full p-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition" />
            </div>

            <button disabled={submitting} type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
              <PackageOpen className="w-6 h-6" /> {submitting ? 'Processing Payment...' : `Purchase Hardware (₹${selectedPlan === 'Ultra' ? '3,999' : selectedPlan === 'Pro' ? '2,750' : '2,000'})${premiumAddon ? ' + Software Add-on (₹150/mo)' : ''}`}
            </button>
          </form>
        </motion.div>
      )}

      {/* Order History */}
      <div className="max-w-4xl mx-auto pt-12">
        <h2 className="text-2xl font-black text-slate-900 mb-6">Your Subscriptions</h2>
        
        {loading ? (
          <div className="text-slate-500">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="text-slate-500 bg-white p-8 rounded-2xl border border-slate-200 text-center">You haven't placed any orders yet.</div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold text-lg text-slate-900">{order.box_name}</h3>
                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">{order.num_containers === 1 ? 'Basic' : order.num_containers === 11 ? 'Basic + AI' : order.num_containers === 6 ? 'Ultra' : order.num_containers === 16 ? 'Ultra + AI' : order.num_containers === 13 ? 'Pro + AI' : 'Pro'} Plan</span>
                  </div>
                  <p className="text-sm text-slate-500">{order.num_containers > 10 ? order.num_containers - 10 : order.num_containers} Compartments Hardware • Ordered on {new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                
                <div className="flex flex-col items-start md:items-end gap-3">
                  {order.status === 'PENDING' && (
                    <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-1"><Clock className="w-4 h-4"/> Pending Build</span>
                  )}
                  {order.status === 'BUILDING' && (
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-1"><Wrench className="w-4 h-4"/> Manufacturing</span>
                  )}
                  {order.status === 'CANCELED' && (
                    <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-1"><XCircle className="w-4 h-4"/> Canceled</span>
                  )}

                  {order.status === 'BUILT' && (
                    <div className="flex items-center gap-4">
                      <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-1"><CheckCircle className="w-4 h-4"/> Active Subscription</span>
                      <button onClick={handleDownloadQR} className="print:hidden text-blue-600 hover:text-blue-800 bg-blue-50 p-2 rounded-lg transition" title="Print/Download QR Code">
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Print view for QR */}
                {order.status === 'BUILT' && (
                  <div className="hidden print:block fixed inset-0 bg-white z-50 p-10">
                    <div className="max-w-2xl mx-auto border-4 border-slate-900 p-12 rounded-3xl text-center">
                      <h1 className="text-4xl font-black mb-2">MEDIBOX PAIRING QR</h1>
                      <p className="text-xl text-slate-500 mb-8">{order.box_name}</p>
                      <div className="flex justify-center mb-8">
                        <QRCode value={`{"device_id":"${order.box_name}","type":"medibox"}`} size={256} />
                      </div>
                      <p className="font-bold text-slate-800">Scan this QR code in the Medibox App to pair your device.</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
