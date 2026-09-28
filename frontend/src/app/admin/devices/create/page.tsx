'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function AdminDeviceCreatePage() {
  const [formData, setFormData] = useState({
    device_name: 'Smart Medibox V1',
    device_model: 'V1-PRO',
    compartment_count: 3,
    firmware_version: '1.0.0'
  });
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch(`/api/admin/devices/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      setResult(data);
    } catch (e) {
      console.error(e);
      alert("Failed to generate device");
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Form */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h1 className="text-2xl font-bold text-slate-900 mb-6">Device Provisioning (Admin)</h1>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Device Name</label>
              <input 
                type="text" 
                value={formData.device_name}
                onChange={e => setFormData({...formData, device_name: e.target.value})}
                className="w-full p-3 border rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Model</label>
              <input 
                type="text" 
                value={formData.device_model}
                onChange={e => setFormData({...formData, device_model: e.target.value})}
                className="w-full p-3 border rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Number of Compartments</label>
              <input 
                type="number" 
                min="1" max="10"
                value={formData.compartment_count}
                onChange={e => setFormData({...formData, compartment_count: parseInt(e.target.value)})}
                className="w-full p-3 border rounded-lg"
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-slate-900 text-white p-3 rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Device'}
            </button>
          </form>
        </div>

        {/* Result QR */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center min-h-[400px]">
          {result ? (
            <div className="text-center">
              <h2 className="font-bold text-emerald-600 mb-4 text-xl">Device Generated ✓</h2>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                <Image 
                  src={result.qr_code_base64} 
                  alt="Device QR Code" 
                  width={250} 
                  height={250}
                  className="mx-auto mix-blend-multiply"
                />
              </div>
              
              <p className="text-sm font-mono text-slate-600 bg-slate-100 p-2 rounded">
                ID: {result.device.device_id}
              </p>
              
              <div className="mt-6 flex flex-col gap-2">
                <a 
                  href={result.qr_code_base64} 
                  download={`medibox-qr-${result.device.device_id}.png`}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  Download QR Code
                </a>
                <p className="text-xs text-slate-500">
                  Print this QR code and attach it to the physical device.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-slate-400">Generate a device to view its QR code</p>
          )}
        </div>

      </div>
    </div>
  );
}
