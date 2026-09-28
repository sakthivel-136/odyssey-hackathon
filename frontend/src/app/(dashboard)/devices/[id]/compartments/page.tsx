'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Box, Settings, CheckCircle2, Play, Cpu } from 'lucide-react';

export default function CompartmentSetupPage() {
  const params = useParams();
  const deviceId = params.id as string;
  
  const [compartments, setCompartments] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Fetch Compartments
      const compRes = await fetch(`/api/compartments/${deviceId}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const compData = await compRes.json();
      setCompartments(compData);
      
      // Fetch user's medicines for assignment
      const medRes = await fetch(`/api/medicines`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const medData = await medRes.json();
      setMedicines(medData);
      
      setLoading(false);
    };
    fetchData();
  }, [deviceId]);

  const handleTestServo = async (compNumber: number) => {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/compartments/test/servo`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ device_id: deviceId, compartment_number: compNumber })
    });
    alert("Servo test command sent.");
  };
  
  const handleTestIR = async (compNumber: number) => {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/compartments/test/ir`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ device_id: deviceId, compartment_number: compNumber })
    });
    alert("IR test command sent. Please interact with the sensor.");
  };

  const handleAssignMedicine = async (compartmentId: string, medicineId: string, quantity: number) => {
    if (!medicineId) return;
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/compartments/assign`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        compartment_id: compartmentId,
        medicine_id: medicineId,
        quantity: quantity
      })
    });
    alert("Medicine assigned!");
  };

  if (loading) return <div className="p-8">Loading setup...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
          <Settings className="w-8 h-8 text-blue-600" />
          Compartment Setup
        </h1>
        <p className="text-slate-500 mt-1">Configure and test the physical compartments for this Medibox.</p>
      </header>

      <div className="space-y-6">
        {compartments.map((comp) => {
          const currentMed = comp.medicine_compartments?.[0]?.medicines;
          
          return (
            <div key={comp.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-8">
              
              {/* Info & Tests */}
              <div className="flex-1 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-2xl text-slate-700">
                    {comp.compartment_number}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">Compartment {comp.compartment_number}</h3>
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Servo
                      </span>
                      <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> IR Sensor
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => handleTestServo(comp.compartment_number)}
                    className="flex-1 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 flex items-center justify-center gap-2"
                  >
                    <Cpu className="w-4 h-4" /> Test Servo
                  </button>
                  <button 
                    onClick={() => handleTestIR(comp.compartment_number)}
                    className="flex-1 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" /> Test IR
                  </button>
                </div>
              </div>

              {/* Assignment */}
              <div className="flex-1 bg-slate-50 rounded-xl p-5 border border-slate-100">
                <h4 className="font-medium text-slate-900 mb-4">Assign Medicine</h4>
                
                <div className="space-y-4">
                  <select 
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
                    defaultValue={currentMed?.id || ""}
                    onChange={(e) => handleAssignMedicine(comp.id, e.target.value, 60)}
                  >
                    <option value="" disabled>Select a medicine...</option>
                    {medicines.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.strength})</option>
                    ))}
                  </select>
                  
                  {currentMed ? (
                    <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-emerald-100">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <p className="text-sm font-medium text-slate-700">
                        Assigned: {currentMed.name}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-2">No medicine assigned.</p>
                  )}
                </div>
              </div>

            </div>
          )
        })}
      </div>
    </div>
  );
}
