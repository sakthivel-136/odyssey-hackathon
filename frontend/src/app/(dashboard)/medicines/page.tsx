'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Pill, Plus, X, RefreshCw, Link2, CheckCircle2, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MedicinesPage() {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [compartments, setCompartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');

  // Add Medicine Modal
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    strength: '',
    dosage_form: 'Tablet',
    stock_quantity: 60,
    low_stock_threshold: 10
  });

  // Assign Compartment Modal
  const [assignMed, setAssignMed] = useState<any>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [selectedCompartmentId, setSelectedCompartmentId] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const t = session.access_token;
    setToken(t);
    const headers = { 'Authorization': `Bearer ${t}` };

    try {
      // Fetch medicines
      const medRes = await fetch('/api/medicines', { headers });
      if (medRes.ok) setMedicines(await medRes.json());

      // Fetch devices
      const devRes = await fetch('/api/devices', { headers });
      if (devRes.ok) {
        const devs = await devRes.json();
        setDevices(devs);
        // Load compartments for first device by default
        if (devs.length > 0) {
          await loadCompartments(devs[0].id, t);
          setSelectedDeviceId(devs[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const loadCompartments = async (deviceId: string, tok?: string) => {
    const t = tok || token;
    const res = await fetch(`/api/compartments/${deviceId}`, {
      headers: { 'Authorization': `Bearer ${t}` }
    });
    if (res.ok) setCompartments(await res.json());
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/medicines', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    setIsCreating(false);
    setFormData({ name: '', strength: '', dosage_form: 'Tablet', stock_quantity: 60, low_stock_threshold: 10 });
    fetchData();
  };

  const handleAssignOpen = async (med: any) => {
    setAssignMed(med);
    setSelectedCompartmentId('');
    // Pre-select the compartment this medicine is already assigned to
    const existing = (compartments || []).find(c =>
      c.medicine_compartments?.some((mc: any) => mc.medicine_id === med.id)
    );
    if (existing) setSelectedCompartmentId(existing.id);
  };

  const handleAssignSave = async () => {
    if (!selectedCompartmentId) return;
    setAssigning(true);
    await fetch('/api/compartments/assign', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        compartment_id: selectedCompartmentId,
        medicine_id: assignMed.id,
        quantity: assignMed.stock_quantity || 60
      })
    });
    setAssigning(false);
    setAssignMed(null);
    fetchData();
  };

  const getAssignedCompartment = (med: any) => {
    if (!compartments || !Array.isArray(compartments)) return undefined;
    return compartments.find(c =>
      c.medicine_compartments?.some((mc: any) => mc.medicine_id === med.id)
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <Pill className="w-8 h-8 text-blue-600" /> Medicine Inventory
          </h1>
          <p className="text-slate-500 mt-1">Add medicines and assign them to compartments on your Medibox.</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-200"
        >
          <Plus className="w-5 h-5" /> Add Medicine
        </button>
      </div>

      {/* Medicine Cards */}
      {!medicines || medicines.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl">
          <Pill className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-bold text-slate-400 text-lg">No Medicines Added</p>
          <p className="text-slate-400 text-sm mt-1">Click "Add Medicine" to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(medicines || []).map((med) => {
            const assigned = getAssignedCompartment(med);
            return (
              <motion.div
                key={med.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">{med.name}</h3>
                    <p className="text-slate-500 text-sm">{med.strength} • {med.dosage_form}</p>
                  </div>
                  <button
                    onClick={() => handleAssignOpen(med)}
                    title="Assign to Compartment"
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${assigned ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-600'}`}
                  >
                    <Link2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Compartment Assignment Badge */}
                {assigned ? (
                  <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-xl text-sm font-bold mb-3">
                    <CheckCircle2 className="w-4 h-4" />
                    Assigned to Compartment {assigned.compartment_number}
                  </div>
                ) : (
                  <div
                    onClick={() => handleAssignOpen(med)}
                    className="flex items-center gap-2 bg-amber-50 text-amber-600 px-3 py-2 rounded-xl text-sm font-bold mb-3 cursor-pointer hover:bg-amber-100 transition-colors"
                  >
                    <Package className="w-4 h-4" />
                    Not assigned to any compartment — click to assign
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Stock Level</p>
                    <p className={`text-2xl font-black ${med.stock_quantity <= med.low_stock_threshold ? 'text-red-600' : 'text-slate-900'}`}>
                      {med.stock_quantity}
                    </p>
                  </div>
                  <button className="flex items-center gap-1.5 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-xl transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" /> Refill
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Medicine Modal */}
      <AnimatePresence>
        {isCreating && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setIsCreating(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-20 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[500px] bg-white rounded-3xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="flex justify-between items-center p-6 border-b border-slate-100">
                <h2 className="text-xl font-black text-slate-900">Add New Medicine</h2>
                <button onClick={() => setIsCreating(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Medicine Name *</label>
                  <input
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Metformin"
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Strength</label>
                    <input
                      value={formData.strength}
                      onChange={e => setFormData({ ...formData, strength: e.target.value })}
                      placeholder="e.g. 500mg"
                      className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Form</label>
                    <select
                      value={formData.dosage_form}
                      onChange={e => setFormData({ ...formData, dosage_form: e.target.value })}
                      className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {['Tablet', 'Capsule', 'Syrup', 'Injection', 'Drops'].map(f => (
                        <option key={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Initial Stock Quantity</label>
                  <input
                    type="number" min="1"
                    value={formData.stock_quantity}
                    onChange={e => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) })}
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setIsCreating(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold">Save Medicine</button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Assign Compartment Modal */}
      <AnimatePresence>
        {assignMed && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setAssignMed(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-20 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[480px] bg-white rounded-3xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="flex justify-between items-center p-6 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Assign to Compartment</h2>
                  <p className="text-slate-500 text-sm mt-0.5">Pick which physical slot holds <strong>{assignMed.name}</strong></p>
                </div>
                <button onClick={() => setAssignMed(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-3">
                {!compartments || compartments.length === 0 ? (
                  <p className="text-slate-400 text-center py-4">No compartments found. Make sure your Medibox device is paired.</p>
                ) : (
                  (compartments || []).map((comp) => {
                    const occupiedBy = comp.medicine_compartments?.[0]?.medicines?.name;
                    const isOccupiedByOther = occupiedBy && comp.medicine_compartments?.[0]?.medicine_id !== assignMed.id;
                    const isSelected = selectedCompartmentId === comp.id;

                    return (
                      <button
                        key={comp.id}
                        onClick={() => !isOccupiedByOther && setSelectedCompartmentId(comp.id)}
                        disabled={isOccupiedByOther}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : isOccupiedByOther
                            ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                            : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          {comp.compartment_number}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-slate-900">Compartment {comp.compartment_number}</p>
                          <p className="text-sm text-slate-500">
                            {isOccupiedByOther
                              ? `Occupied by ${occupiedBy}`
                              : comp.medicine_compartments?.[0]?.medicine_id === assignMed.id
                              ? '✅ Currently assigned here'
                              : 'Empty — available'}
                          </p>
                        </div>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })
                )}

                <div className="flex justify-end gap-3 pt-3">
                  <button onClick={() => setAssignMed(null)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
                  <button
                    onClick={handleAssignSave}
                    disabled={!selectedCompartmentId || assigning}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2"
                  >
                    {assigning ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Assign
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
