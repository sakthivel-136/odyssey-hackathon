'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, Plus, X, Clock, Pill, CheckCircle2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');

  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  // New schedule state
  const [scheduleTime, setScheduleTime] = useState('08:00');
  const [deviceId, setDeviceId] = useState('');
  // Selected medicines with dose quantity: [ { medicine_id, dose_quantity } ]
  const [selectedMeds, setSelectedMeds] = useState<any[]>([]);

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
      // Fetch schedules
      const schRes = await fetch('/api/schedules', { headers });
      if (schRes.ok) setSchedules(await schRes.json());

      // Fetch devices
      const devRes = await fetch('/api/devices', { headers });
      if (devRes.ok) {
        const devs = await devRes.json();
        setDevices(devs);
        if (devs.length > 0) setDeviceId(devs[0].id);
      }

      // Fetch medicines (only those assigned to a compartment)
      const medRes = await fetch('/api/medicines', { headers });
      if (medRes.ok) setMedicines(await medRes.json());

    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const toggleMedicine = (medId: string) => {
    const exists = selectedMeds.find(m => m.medicine_id === medId);
    if (exists) {
      setSelectedMeds(selectedMeds.filter(m => m.medicine_id !== medId));
    } else {
      setSelectedMeds([...selectedMeds, { medicine_id: medId, dose_quantity: 1 }]);
    }
  };

  const updateDoseQty = (medId: string, qty: number) => {
    setSelectedMeds(selectedMeds.map(m =>
      m.medicine_id === medId ? { ...m, dose_quantity: qty } : m
    ));
  };

  const saveSchedule = async () => {
    if (!deviceId || selectedMeds.length === 0 || !scheduleTime) return;
    setSaving(true);

    // Build schedule_items from selected medicines
    // The backend will look up which compartment each medicine belongs to
    const payload = {
      device_id: deviceId,
      schedule_time: scheduleTime + ':00',
      medicines: selectedMeds // [ { medicine_id, dose_quantity } ]
    };

    const res = await fetch('/api/schedules', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    setSaving(false);
    if (res.ok) {
      setIsCreating(false);
      setSelectedMeds([]);
      setScheduleTime('08:00');
      fetchData();
    } else {
      const err = await res.json();
      alert('Error: ' + (err.detail || 'Failed to save schedule'));
    }
  };

  const deleteSchedule = async (scheduleId: string) => {
    if (!confirm('Delete this schedule?')) return;
    await fetch(`/api/schedules/${scheduleId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchData();
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-600" /> Schedules
          </h1>
          <p className="text-slate-500 mt-1">Set times and medicines — your Medibox opens each compartment automatically.</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-200"
        >
          <Plus className="w-5 h-5" /> Create Schedule
        </button>
      </div>

      {/* How it works callout */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6 text-sm text-blue-800">
        <strong>How it works:</strong> Select a time and medicines. At schedule time, the Medibox opens <strong>Compartment 1</strong> first. After you take the pill and the IR sensor detects it, it automatically opens <strong>Compartment 2</strong>, and so on.
      </div>

      {/* Schedules List */}
      {schedules.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-bold text-slate-400 text-lg">No Schedules Yet</p>
          <p className="text-slate-400 text-sm mt-1">Create your first schedule to start automatic dispensing.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((sched) => (
            <motion.div
              key={sched.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-5"
            >
              {/* Time */}
              <div className="bg-blue-600 text-white rounded-2xl px-5 py-3 text-center min-w-[90px]">
                <p className="text-2xl font-black leading-none">{formatTime(sched.schedule_time)}</p>
              </div>

              {/* Steps */}
              <div className="flex-1">
                <div className="flex flex-wrap gap-2">
                  {sched.schedule_items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-bold">
                      <span className="w-5 h-5 bg-blue-600 text-white rounded-md flex items-center justify-center text-xs font-black">
                        {idx + 1}
                      </span>
                      {item.medicines?.name || item.compartments?.compartment_number
                        ? (item.medicines?.name || `Comp ${item.compartments?.compartment_number}`)
                        : `Step ${idx + 1}`}
                      {item.dose_quantity > 1 && <span className="text-blue-600">×{item.dose_quantity}</span>}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-2 font-medium">
                  {sched.is_active ? '🟢 Active' : '⚫ Inactive'} · Opens compartments one by one after each pill is taken
                </p>
              </div>

              {/* Delete */}
              <button
                onClick={() => deleteSchedule(sched.id)}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Schedule Modal */}
      <AnimatePresence>
        {isCreating && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setIsCreating(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 60, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 60, scale: 0.97 }}
              className="fixed inset-x-4 top-16 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[580px] bg-white rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center p-6 border-b border-slate-100">
                <h2 className="text-2xl font-black text-slate-900">Create Schedule</h2>
                <button onClick={() => setIsCreating(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-6">

                {/* Device + Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Device</label>
                    <select
                      value={deviceId}
                      onChange={e => setDeviceId(e.target.value)}
                      className="w-full p-3.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {devices.map(d => (
                        <option key={d.id} value={d.id}>{d.device_name || d.device_id}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Time
                    </label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={e => setScheduleTime(e.target.value)}
                      className="w-full p-3.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Medicine Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Select Medicines to Dispense
                  </label>

                  {medicines.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-4 border border-dashed border-slate-200 rounded-xl">
                      No medicines found. Add medicines first and assign them to compartments.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {medicines.map((med, idx) => {
                        const selected = selectedMeds.find(m => m.medicine_id === med.id);
                        const assignedComp = med.medicine_compartments?.[0]?.compartments?.compartment_number;

                        return (
                          <div
                            key={med.id}
                            className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                              selected
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-slate-200 hover:border-blue-300'
                            }`}
                            onClick={() => toggleMedicine(med.id)}
                          >
                            {/* Step number */}
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                              {selected ? (selectedMeds.findIndex(m => m.medicine_id === med.id) + 1) : idx + 1}
                            </div>

                            {/* Medicine Info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-900">{med.name}</p>
                              <p className="text-xs text-slate-500">
                                {med.strength} · {med.dosage_form}
                                {assignedComp
                                  ? <span className="ml-2 text-green-600 font-bold">→ Compartment {assignedComp}</span>
                                  : <span className="ml-2 text-amber-500 font-bold">⚠ Not assigned to compartment</span>
                                }
                              </p>
                            </div>

                            {/* Dose Quantity */}
                            {selected && (
                              <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={() => updateDoseQty(med.id, Math.max(1, (selected.dose_quantity || 1) - 1))}
                                  className="w-7 h-7 rounded-lg bg-white border border-slate-200 font-black text-slate-600 hover:bg-slate-50 flex items-center justify-center"
                                >-</button>
                                <span className="w-6 text-center font-black text-slate-900">{selected.dose_quantity}</span>
                                <button
                                  onClick={() => updateDoseQty(med.id, (selected.dose_quantity || 1) + 1)}
                                  className="w-7 h-7 rounded-lg bg-white border border-slate-200 font-black text-slate-600 hover:bg-slate-50 flex items-center justify-center"
                                >+</button>
                              </div>
                            )}

                            {selected && <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Preview */}
                {selectedMeds.length > 0 && (
                  <div className="bg-slate-50 rounded-2xl p-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Dispensing Order Preview</p>
                    <div className="space-y-2">
                      {selectedMeds.map((sm, i) => {
                        const med = medicines.find(m => m.id === sm.medicine_id);
                        const comp = med?.medicine_compartments?.[0]?.compartments?.compartment_number;
                        return (
                          <div key={sm.medicine_id} className="flex items-center gap-3 text-sm">
                            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-black text-xs">{i + 1}</span>
                            <span className="font-bold text-slate-900">{med?.name}</span>
                            <span className="text-slate-400">×{sm.dose_quantity}</span>
                            {comp
                              ? <span className="ml-auto text-green-600 font-bold text-xs">Compartment {comp} opens</span>
                              : <span className="ml-auto text-red-500 font-bold text-xs">⚠ No compartment!</span>
                            }
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-slate-500 mt-3">Each compartment opens only after the previous pill is taken.</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={saveSchedule}
                  disabled={!deviceId || selectedMeds.length === 0 || saving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all"
                >
                  {saving
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <CheckCircle2 className="w-5 h-5" />
                  }
                  Save Schedule
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
