'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Pill, Plus, Save, X, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MedicinesPage() {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  
  // Refill State
  const [refillMed, setRefillMed] = useState<any>(null);
  const [refillAmount, setRefillAmount] = useState<number>(0);
  const [isRefilling, setIsRefilling] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    strength: '',
    dosage_form: 'Tablet',
    stock_quantity: 60,
    low_stock_threshold: 10
  });

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.from("medicines").select("*, medicine_compartments(*, compartments(*, devices(*)))").order('created_at', { ascending: false });
    if (data) setMedicines(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/medicines`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(formData)
    });
    setIsCreating(false);
    fetchData();
  };

  const handleStartRefill = async (med: any) => {
    const compData = med.medicine_compartments?.[0];
    if (!compData) {
      alert("This medicine is not assigned to any compartment yet! Please assign it in Device Setup first.");
      return;
    }
    
    setRefillMed(med);
    setRefillAmount(med.stock_quantity);
    
    // Tell backend to open lid
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/compartments/refill/open`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        device_id: compData.compartments.device_id,
        compartment_number: compData.compartments.compartment_number
      })
    });
  };

  const handleCompleteRefill = async () => {
    setIsRefilling(true);
    const compData = refillMed.medicine_compartments[0];
    
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/compartments/refill/close`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        device_id: compData.compartments.device_id,
        compartment_number: compData.compartments.compartment_number,
        medicine_id: refillMed.id,
        new_stock_quantity: refillAmount
      })
    });
    
    setRefillMed(null);
    setIsRefilling(false);
    fetchData();
  };

  if (loading) return <div className="p-8">Loading medicines...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 relative">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Pill className="w-8 h-8 text-blue-600" />
            Medicine Inventory
          </h1>
          <p className="text-slate-500 mt-1">Manage your medications and track stock levels.</p>
        </div>
        {!isCreating && (
          <button 
            onClick={() => setIsCreating(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition shadow-sm"
          >
            <Plus className="w-5 h-5" /> Add Medicine
          </button>
        )}
      </header>

      <AnimatePresence>
        {isCreating && (
          <motion.form 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onSubmit={handleSave} 
            className="bg-white p-6 rounded-2xl shadow-xl shadow-blue-900/5 border-2 border-blue-100"
          >
            <div className="flex justify-between mb-6">
              <h2 className="text-xl font-bold">New Medicine</h2>
              <button type="button" onClick={() => setIsCreating(false)}><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Strength (e.g., 500mg)</label>
                <input type="text" value={formData.strength} onChange={e => setFormData({...formData, strength: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Form</label>
                <select value={formData.dosage_form} onChange={e => setFormData({...formData, dosage_form: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition">
                  <option>Tablet</option>
                  <option>Capsule</option>
                  <option>Liquid</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Current Stock</label>
                <input type="number" required value={formData.stock_quantity || ''} onChange={e => setFormData({...formData, stock_quantity: e.target.value ? parseInt(e.target.value) : 0})} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" />
              </div>
            </div>
            
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 transition text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2">
              <Save className="w-5 h-5" /> Save Medicine
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {medicines.map((med, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={med.id} 
            className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition"
          >
            {med.stock_quantity <= med.low_stock_threshold && (
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-500"></div>
            )}
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-xl text-slate-900">{med.name}</h3>
                <p className="text-slate-500 text-sm font-medium">{med.strength} • {med.dosage_form}</p>
              </div>
              <div className="w-12 h-12 bg-slate-50 group-hover:bg-blue-50 transition rounded-full flex items-center justify-center">
                <Pill className="w-6 h-6 text-slate-400 group-hover:text-blue-500 transition" />
              </div>
            </div>
            
            <div className={`mt-6 p-5 rounded-2xl flex items-center justify-between ${
              med.stock_quantity <= med.low_stock_threshold ? 'bg-red-50 border border-red-100' : 'bg-slate-50 border border-slate-100'
            }`}>
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${med.stock_quantity <= med.low_stock_threshold ? 'text-red-700/70' : 'text-slate-500'}`}>
                  Stock Level
                </p>
                <p className={`text-3xl font-black flex items-center gap-2 ${med.stock_quantity <= med.low_stock_threshold ? 'text-red-700' : 'text-slate-900'}`}>
                  {med.stock_quantity}
                  {med.stock_quantity <= med.low_stock_threshold && <AlertTriangle className="w-6 h-6" />}
                </p>
              </div>
              
              <button 
                onClick={() => handleStartRefill(med)}
                className="bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 transition"
              >
                <RefreshCw className="w-4 h-4" />
                Refill
              </button>
            </div>
            
            {/* Status indicator if assigned to compartment */}
            {med.medicine_compartments?.[0] && (
               <div className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
                 <CheckCircle2 className="w-4 h-4" />
                 Loaded in Compartment {med.medicine_compartments[0].compartments.compartment_number}
               </div>
            )}
          </motion.div>
        ))}
        
        {medicines.length === 0 && (
          <div className="col-span-full text-center p-16 bg-white border-2 border-dashed border-slate-200 rounded-3xl">
            <Pill className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Medicines Added</h3>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">Start building your inventory to track stock levels and schedule doses.</p>
            <button 
              onClick={() => setIsCreating(true)}
              className="inline-flex bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition shadow-md"
            >
              Add Your First Medicine
            </button>
          </div>
        )}
      </div>

      {/* Refill Modal Overlay */}
      <AnimatePresence>
        {refillMed && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <RefreshCw className="w-8 h-8" />
              </div>
              
              <h2 className="text-2xl font-black text-center text-slate-900 mb-2">Refill {refillMed.name}</h2>
              <p className="text-center text-slate-500 mb-8">
                Compartment <strong className="text-slate-900">#{refillMed.medicine_compartments[0].compartments.compartment_number}</strong> has been opened on your Medibox. Please add the tablets.
              </p>
              
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-8">
                <label className="block text-sm font-bold text-slate-700 mb-3 text-center uppercase tracking-wide">
                  New Total Stock Quantity
                </label>
                <div className="flex items-center justify-center gap-4">
                  <button onClick={() => setRefillAmount(Math.max(0, refillAmount - 10))} className="w-12 h-12 rounded-full bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-100">-10</button>
                  <input 
                    type="number" 
                    value={refillAmount || ''}
                    onChange={e => setRefillAmount(e.target.value ? parseInt(e.target.value) : 0)}
                    className="w-24 text-center text-3xl font-black p-2 bg-transparent outline-none border-b-2 border-blue-500 focus:border-blue-600"
                  />
                  <button onClick={() => setRefillAmount(refillAmount + 10)} className="w-12 h-12 rounded-full bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-100">+10</button>
                </div>
              </div>
              
              <button 
                disabled={isRefilling}
                onClick={handleCompleteRefill}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-blue-200 transition flex justify-center items-center gap-2"
              >
                {isRefilling ? "Closing Lid..." : "Save & Close Lid"}
              </button>
              
              <p className="text-xs text-center text-slate-400 mt-4 font-medium">
                The lid will close automatically after 2 minutes if left unattended.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
