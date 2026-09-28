'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Pill, Plus, X, RefreshCw, Link2, CheckCircle2, Package, Clock, ShieldCheck, AlertCircle, PackageOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MedicineListSkeleton, EmptyState, MotionButton, SPRING_SNAPPY, SPRING_GENTLE } from '@/components/ui/motion';

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

  // Refill Active Hardware Modal
  const [refillMed, setRefillMed] = useState<any>(null);
  const [refillComp, setRefillComp] = useState<any>(null);
  const [refillTimer, setRefillTimer] = useState<number>(60);
  const [refillStockInput, setRefillStockInput] = useState<number>(60);
  const [refilling, setRefilling] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const getCompartmentMedicineId = (comp: any) => {
    if (!comp?.medicine_compartments) return null;
    if (Array.isArray(comp.medicine_compartments)) {
      return comp.medicine_compartments[0]?.medicine_id || null;
    }
    return comp.medicine_compartments.medicine_id || null;
  };

  const getCompartmentMedicineName = (comp: any) => {
    if (!comp?.medicine_compartments) return null;
    if (Array.isArray(comp.medicine_compartments)) {
      return comp.medicine_compartments[0]?.medicines?.name || null;
    }
    return comp.medicine_compartments.medicines?.name || null;
  };

  async function fetchData() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }
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
        if (devs.length > 0) {
          await loadCompartments(devs[0].id, t);
          setSelectedDeviceId(devs[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function loadCompartments(deviceId: string, tok?: string) {
    const t = tok || token;
    const res = await fetch(`/api/compartments/${deviceId}`, {
      headers: { 'Authorization': `Bearer ${t}` }
    });
    if (res.ok) setCompartments(await res.json());
  }

  const handleCreateSave = async (e: React.FormEvent) => {
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
    const existing = (compartments || []).find(c => getCompartmentMedicineId(c) === med.id);
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

  // --- REFILL HARDWARE ACTION ---
  const handleStartRefill = async (med: any) => {
    const assigned = getAssignedCompartment(med);
    if (!assigned) {
      alert(`Please assign ${med.name} to a compartment first by clicking "Assign to Compartment".`);
      return;
    }

    if (!selectedDeviceId) {
      alert("No active Medibox device found.");
      return;
    }

    setRefillMed(med);
    setRefillComp(assigned);
    setRefillTimer(60);
    setRefillStockInput(60); // Default refill to full bottle 60

    // Send MQTT command to open lid
    try {
      await fetch('/api/compartments/refill/open', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: selectedDeviceId,
          compartment_number: assigned.compartment_number
        })
      });
    } catch (e) {
      console.error('Error opening lid for refill:', e);
    }
  };

  // 60-Second Auto Close Countdown Effect
  useEffect(() => {
    if (!refillMed) return;

    if (refillTimer <= 0) {
      handleCompleteRefill();
      return;
    }

    const timer = setInterval(() => {
      setRefillTimer(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [refillMed, refillTimer]);

  const handleCompleteRefill = async () => {
    if (!refillMed || !refillComp || refilling) return;
    setRefilling(true);

    try {
      await fetch('/api/compartments/refill/close', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: selectedDeviceId,
          compartment_number: refillComp.compartment_number,
          medicine_id: refillMed.id,
          new_stock_quantity: Number(refillStockInput) || 60
        })
      });
    } catch (e) {
      console.error('Error closing lid for refill:', e);
    } finally {
      setRefilling(false);
      setRefillMed(null);
      setRefillComp(null);
      fetchData();
    }
  };

  const getAssignedCompartment = (med: any) => {
    if (!compartments || !Array.isArray(compartments)) return undefined;
    if (med?.medicine_compartments && Array.isArray(med.medicine_compartments) && med.medicine_compartments.length > 0) {
      const compInfo = med.medicine_compartments[0]?.compartments;
      if (compInfo) return compInfo;
    }
    return compartments.find(c => getCompartmentMedicineId(c) === med.id);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        <div className="flex justify-between items-center pb-6 border-b border-slate-200">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-slate-200 rounded-xl animate-pulse" />
            <div className="h-4 w-64 bg-slate-200 rounded-lg animate-pulse" />
          </div>
          <div className="h-10 w-36 bg-slate-200 rounded-2xl animate-pulse" />
        </div>
        <MedicineListSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Pill className="w-8 h-8 text-blue-600" />
            Medicine Inventory
          </h1>
          <p className="text-slate-500 mt-1 text-base">Add medicines and assign them to physical compartments on your Medibox.</p>
        </div>
        <MotionButton
          onClick={() => setIsCreating(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2 shadow-md shadow-blue-500/20 text-sm shrink-0"
        >
          <Plus className="w-5 h-5" /> Add Medicine
        </MotionButton>
      </header>

      {/* Medicine Cards */}
      {!medicines || medicines.length === 0 ? (
        <EmptyState
          type="medicines"
          title="No Medicines Added"
          description="Add your first tablet or capsule to assign it to physical compartments on your Medibox."
          actionLabel="Add Medicine"
          onAction={() => setIsCreating(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(medicines || []).map((med) => {
            const assigned = getAssignedCompartment(med);
            return (
              <motion.div
                key={med.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.99 }}
                transition={SPRING_GENTLE}
                className="bg-white/80 backdrop-blur-md rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-5"
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">{med.name}</h3>
                    <p className="text-slate-500 text-sm font-semibold">{med.strength} • {med.dosage_form}</p>
                  </div>
                  <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold">
                    Dose: {med.dose_quantity || 1} tab
                  </span>
                </div>

                {/* Compartment Assignment Badge */}
                {assigned ? (
                  <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-4 py-2.5 rounded-2xl text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Assigned to Compartment {assigned.compartment_number}
                  </div>
                ) : (
                  <div
                    onClick={() => handleAssignOpen(med)}
                    className="flex items-center gap-2 bg-amber-50 text-amber-700 border border-amber-200 px-4 py-2.5 rounded-2xl text-xs font-bold cursor-pointer hover:bg-amber-100 transition-colors"
                  >
                    <Package className="w-4 h-4 text-amber-600" />
                    Not assigned — click to assign compartment
                  </div>
                )}

                {/* Stock Controls */}
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider font-extrabold text-slate-400">Current Stock</p>
                    <p className={`text-2xl font-black ${med.stock_quantity <= med.low_stock_threshold ? 'text-red-600' : 'text-slate-900'}`}>
                      {med.stock_quantity} <span className="text-sm font-medium text-slate-400">tablets</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAssignOpen(med)}
                      className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3.5 py-2.5 rounded-xl transition-colors"
                    >
                      <Link2 className="w-4 h-4" /> Slot
                    </button>
                    <button
                      onClick={() => handleStartRefill(med)}
                      className="flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-xl transition-colors shadow-sm"
                    >
                      <RefreshCw className="w-4 h-4" /> Refill Hardware
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* --- 1. REFILL HARDWARE ACTIVE MODAL --- */}
      <AnimatePresence>
        {refillMed && refillComp && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={SPRING_SNAPPY}
              className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-white/60 space-y-6 text-center"
            >
              {/* Dynamic Circular Countdown Ring with Animated Servo Icon */}
              <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <defs>
                    <linearGradient id="refill-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#2563EB" />
                      <stop offset="100%" stopColor="#10B981" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="72"
                    cy="72"
                    r="56"
                    stroke="#E2E8F0"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  <motion.circle
                    cx="72"
                    cy="72"
                    r="56"
                    stroke="url(#refill-gradient)"
                    strokeWidth="10"
                    strokeDasharray={2 * Math.PI * 56}
                    animate={{ strokeDashoffset: 2 * Math.PI * 56 * (1 - refillTimer / 60) }}
                    transition={{ duration: 1, ease: 'linear' }}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>

                {/* Center Servo Status */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <PackageOpen className="w-8 h-8 text-blue-600 animate-pulse mb-1" />
                  <span className="text-2xl font-black text-slate-900 tracking-tight font-mono">{refillTimer}s</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Time Left</span>
                </div>
              </div>

              <div>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider border border-emerald-200">
                  Compartment {refillComp.compartment_number} Lid OPEN
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-3">Refilling {refillMed.name}</h2>
                <p className="text-slate-500 text-sm mt-1 leading-relaxed">
                  Lid is physically open on your Medibox. Fill your tablets into Compartment {refillComp.compartment_number}.
                </p>
              </div>

              {/* Set New Stock Input */}
              <div className="text-left space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">New Total Stock Quantity</label>
                <input
                  type="number"
                  value={refillStockInput}
                  onChange={(e) => setRefillStockInput(Number(e.target.value))}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl font-black text-slate-900 text-center text-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
                />
              </div>

              {/* Action Button */}
              <MotionButton
                onClick={handleCompleteRefill}
                loading={refilling}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl text-sm shadow-md"
              >
                Done Refilling — Close Lid Now
              </MotionButton>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- 2. ADD MEDICINE MODAL --- */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <h2 className="text-xl font-black text-slate-900">Add New Medicine</h2>
                <button onClick={() => setIsCreating(false)} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-1">Medicine Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Vicks 500mg"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-1">Dosage Strength</label>
                    <input
                      type="text"
                      placeholder="e.g., 500mg"
                      value={formData.strength}
                      onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-1">Dosage Form</label>
                    <select
                      value={formData.dosage_form}
                      onChange={(e) => setFormData({ ...formData, dosage_form: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                    >
                      <option>Tablet</option>
                      <option>Capsule</option>
                      <option>Syrup</option>
                      <option>Injection</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-1">Initial Stock Quantity</label>
                  <input
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: Number(e.target.value) })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button type="button" onClick={() => setIsCreating(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm">Save Medicine</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- 3. ASSIGN COMPARTMENT MODAL --- */}
      <AnimatePresence>
        {assignMed && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Assign to Compartment</h2>
                  <p className="text-xs text-slate-500 font-semibold">Select slot for {assignMed.name}</p>
                </div>
                <button onClick={() => setAssignMed(null)} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {(!compartments || compartments.length === 0) ? (
                  <p className="text-slate-400 text-center py-4">No compartments found. Pair your Medibox device first.</p>
                ) : (
                  (compartments || []).map((comp) => {
                    const occupiedBy = getCompartmentMedicineName(comp);
                    const occupiedMedId = getCompartmentMedicineId(comp);
                    const isOccupiedByOther = occupiedBy && occupiedMedId !== assignMed.id;
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
                          <p className="text-xs text-slate-500 font-semibold">
                            {isOccupiedByOther
                              ? `Occupied by ${occupiedBy}`
                              : occupiedMedId === assignMed.id
                              ? '✅ Currently assigned here'
                              : 'Empty — available'}
                          </p>
                        </div>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button onClick={() => setAssignMed(null)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
                <button
                  onClick={handleAssignSave}
                  disabled={assigning || !selectedCompartmentId}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2"
                >
                  {assigning ? 'Saving...' : 'Save Assignment'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
