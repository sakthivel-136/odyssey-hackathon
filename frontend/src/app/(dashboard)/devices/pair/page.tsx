'use client';

import { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Box, CheckCircle2, AlertCircle, Keyboard, QrCode } from 'lucide-react';

export default function PairDevicePage() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualId, setManualId] = useState('');
  const router = useRouter();
  
  const handleManualPair = async (e: any) => {
    e.preventDefault();
    handleScan([{ rawValue: JSON.stringify({ type: 'medibox', device_id: manualId, pairing_token: '000000' }) }]);
  };

  const handleScan = async (result: any) => {
    if (!result || !result[0] || loading) return;
    
    try {
      setLoading(true);
      const data = JSON.parse(result[0].rawValue);
      
      // Support both the legacy printed QR codes and the new secure ones
      const isLegacy = data.type === 'medibox';
      const isSecure = data.type === 'SMART_MEDIBOX';
      
      if ((!isLegacy && !isSecure) || !data.device_id) {
        throw new Error('Invalid Medibox QR Code');
      }

      // If they scan an old printed QR code that lacks a token, use the fallback we injected into the DB
      if (isSecure && !data.pairing_token) {
        throw new Error('Secure QR Code missing pairing token');
      }
      const finalToken = data.pairing_token || '000000';
      data.pairing_token = finalToken;

      const { data: sessionData } = await supabase.auth.getSession();
      
      const res = await fetch(`/api/devices/pair`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session?.access_token}`
        },
        body: JSON.stringify({
          device_id: data.device_id,
          pairing_token: data.pairing_token
        })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to pair device');
      }
      
      setSuccess(`Successfully paired with ${data.device_id}`);
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
      
    } catch (e: any) {
      setError(e.message || 'Error processing QR code');
      setLoading(false);
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Box className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Pair New Medibox</h1>
        <p className="text-slate-500 mt-2">Scan the QR code located on your physical Smart Medibox device.</p>
      </div>

      <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm relative p-6">
        
        {manualMode ? (
          <form onSubmit={handleManualPair} className="flex flex-col gap-4 py-8">
            <p className="text-center text-slate-600 mb-2 font-medium">Enter your Medibox ID directly</p>
            <input 
              type="text" 
              placeholder="e.g. Odyssey Medibox" 
              value={manualId}
              onChange={e => setManualId(e.target.value)}
              className="p-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-center focus:border-blue-500 outline-none"
              required
            />
            <button type="submit" className="bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition">
              Pair Device
            </button>
          </form>
        ) : (
          <div className="rounded-2xl overflow-hidden relative">
            <Scanner
              onScan={handleScan}
              onError={(err) => console.error(err)}
              formats={['qr_code']}
              components={{
                onOff: true,
                torch: true,
                zoom: true,
                finder: true,
              }}
              styles={{
                container: { width: '100%' }
              }}
            />
          </div>
        )}

        <button 
          onClick={() => setManualMode(!manualMode)}
          className="w-full mt-4 flex items-center justify-center gap-2 text-slate-500 hover:text-slate-800 font-bold py-3 bg-slate-50 rounded-xl transition"
        >
          {manualMode ? <><QrCode className="w-5 h-5"/> Switch to Camera</> : <><Keyboard className="w-5 h-5"/> Enter ID Manually</>}
        </button>
        
        {loading && !success && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center backdrop-blur-sm">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-6 flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="font-medium text-sm">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="mt-6 flex items-center gap-3 p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="font-medium text-sm">{success}</p>
        </div>
      )}
    </div>
  );
}
