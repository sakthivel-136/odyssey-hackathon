'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, Plus, Save, X, Box, Clock, Pill } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [compartments, setCompartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCreating, setIsCreating] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    device_id: '',
    schedule_time: '08:00',
    items: [] as any[]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers = { 'Authorization': `Bearer ${session?.access_token}` };
    
    try {
      const schRes = await fetch(`/api/schedules`, { headers });
      if (schRes.ok) setSchedules(await schRes.json());
      
      const devRes = await fetch(`/api/devices`, { headers });
      if (devRes.ok) {
        const devs = await devRes.json();
        setDevices(devs);
        if (devs.length > 0) {
          handleDeviceChange(devs[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    }
    
    setLoading(false);
  };

  const handleDeviceChange = async (device_id: string) => {
    setNewSchedule(prev => ({ ...prev, device_id, items: [] }));
    const { data: { session } } = await supabase.auth.getSession();
    const compRes = await fetch(`/api/compartments/${device_id}`, {
      headers: { 'Authorization': `Bearer ${session?.access_token}` }
    });
    if (compRes.ok) {
      setCompartments(await compRes.json());
    }
  };

  const addStep = () => {
    setNewSchedule({
      ...newSchedule,
      items: [
        ...newSchedule.items,
        { compartment_id: '', medicine_id: '', dose_quantity: 1, step_order: newSchedule.items.length + 1 }
      ]
    });
  };

  const removeStep = (index: number) => {
    const updatedItems = [...newSchedule.items];
    updatedItems.splice(index, 1);
    updatedItems.forEach((item, i) => {
      item.step_order = i + 1;
    });
    setNewSchedule({ ...newSchedule, items: updatedItems });
  };

  const saveSchedule = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    const finalizedItems = newSchedule.items.map(item => {
      if (!item.medicine_id && item.compartment_id) {
        const comp = compartments.find(c => c.id === item.compartment_id);
        const medId = comp?.medicine_compartments?.[0]?.medicine_id;
        return { ...item, medicine_id: medId };
      }
      return item;
    });

    const payload = {
      ...newSchedule,
      schedule_time: newSchedule.schedule_time + ':00', // API might expect HH:MM:SS
      items: finalizedItems
    };

    const res = await fetch(`/api/schedules`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      setIsCreating(false);
      setNewSchedule({ device_id: devices[0]?.id || '', schedule_time: '08:00', items: [] });
      fetchData();
    } else {
      alert("Failed to create schedule.");
    }
  };

  if (loading) return (
    <div className="flex h-[50vh] items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 relative pb-20">
      <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Calendar className="w-7 h-7" />
            </div>
            Schedules
          </h1>
          <p className="text-slate-500 mt-2 text-sm font-medium">Manage and automate your medication routine.</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-md hover:shadow-blue-200"
        >
          <Plus className="w-5 h-5" />
          Create
        </button>
      </header>

      {/* Existing Schedules */}
      <div className="space-y-4">
        {schedules.map((sch) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            key={sch.id} 
            className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-6 items-start"
          >
            <div className="md:w-32 shrink-0 text-center md:text-left">
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
                {sch.schedule_time.substring(0, 5)}
              </h3>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Daily</p>
              <div className="mt-4">
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${sch.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                  {sch.is_active ? 'Active' : 'Paused'}
                </span>
              </div>
            </div>
            
            <div className="flex-1 w-full bg-slate-50/50 rounded-xl p-4 border border-slate-100">
              <h4 className="font-bold text-slate-400 text-xs uppercase tracking-wider mb-3">Dose Sequence</h4>
              <div className="space-y-2">
                {sch.schedule_items.sort((a: any, b: any) => a.step_order - b.step_order).map((item: any) => (
                  <div key={item.id} className="flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <div className="bg-slate-100 text-slate-400 text-xs font-black w-6 h-6 rounded flex items-center justify-center shrink-0">
                      {item.step_order}
                    </div>
                    <div className="flex-1 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Pill className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{item.medicines?.name || 'Unknown Medicine'}</p>
                        <p className="text-xs text-slate-500 font-medium">Compartment {item.compartments.compartment_number}</p>
                      </div>
                    </div>
                    <div className="font-black text-slate-900 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-sm">
                      x{item.dose_quantity}
                    </div>
                  </div>
                ))}
                {sch.schedule_items.length === 0 && (
                  <div className="text-sm text-slate-400 italic py-2">No items in this schedule.</div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
        
        {schedules.length === 0 && !isCreating && (
          <div className="text-center p-16 bg-white border border-slate-100 rounded-3xl shadow-sm">
            <Calendar className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">No schedules yet</h3>
            <p className="text-slate-500 mb-6">Create your first medication schedule to automate dispensing.</p>
            <button 
              onClick={() => setIsCreating(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
            >
              Create Schedule
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isCreating && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
              onClick={() => setIsCreating(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              className="fixed inset-x-4 top-20 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[600px] bg-white rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Create Schedule</h2>
                <button 
                  onClick={() => setIsCreating(false)} 
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1">
                <div className="space-y-6">
                  {/* Device & Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Select Device</label>
                      <select 
                        value={newSchedule.device_id}
                        onChange={(e) => handleDeviceChange(e.target.value)}
                        className="w-full p-3.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                      >
                        <option value="" disabled>Choose Device</option>
                        {devices.map(d => (
                          <option key={d.id} value={d.id}>{d.device_name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Time
                      </label>
                      <input 
                        type="time" 
                        value={newSchedule.schedule_time}
                        onChange={(e) => setNewSchedule({...newSchedule, schedule_time: e.target.value})}
                        className="w-full p-3.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Medications */}
                  {newSchedule.device_id && (
                    <div className="space-y-3">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Medications to Dispense</label>
                      
                      <div className="space-y-3">
                        <AnimatePresence>
                          {newSchedule.items.map((item, index) => (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              key={index} 
                              className="flex gap-3 items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                            >
                              <div className="bg-slate-100 text-slate-500 w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0">
                                {index + 1}
                              </div>
                              
                              <div className="flex-1">
                                <select 
                                  value={item.compartment_id}
                                  onChange={(e) => {
                                    const newItems = [...newSchedule.items];
                                    newItems[index].compartment_id = e.target.value;
                                    setNewSchedule({...newSchedule, items: newItems});
                                  }}
                                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="" disabled>Select Medicine...</option>
                                  {compartments.map(c => {
                                    const medName = c.medicine_compartments?.[0]?.medicines?.name || 'Empty Compartment';
                                    return (
                                      <option key={c.id} value={c.id}>{medName} (Comp {c.compartment_number})</option>
                                    );
                                  })}
                                </select>
                              </div>

                              <div className="w-20">
                                <input 
                                  type="number" 
                                  min="1"
                                  value={item.dose_quantity}
                                  onChange={(e) => {
                                    const newItems = [...newSchedule.items];
                                    newItems[index].dose_quantity = parseInt(e.target.value) || 1;
                                    setNewSchedule({...newSchedule, items: newItems});
                                  }}
                                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-center outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              <button 
                                onClick={() => removeStep(index)}
                                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                      
                      <button 
                        onClick={addStep}
                        className="w-full py-3.5 border-2 border-dashed border-slate-200 bg-white text-slate-500 font-bold rounded-xl hover:border-blue-400 hover:text-blue-600 transition-all flex items-center justify-center gap-2 mt-2"
                      >
                        <Plus className="w-5 h-5" /> Add Medication
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 bg-white border-t border-slate-100 flex justify-end gap-3">
                <button 
                  onClick={() => setIsCreating(false)}
                  className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={saveSchedule}
                  disabled={!newSchedule.device_id || newSchedule.items.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all hover:shadow-lg hover:shadow-blue-200 disabled:opacity-50 disabled:hover:shadow-none"
                >
                  <Save className="w-5 h-5" /> Save Schedule
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
