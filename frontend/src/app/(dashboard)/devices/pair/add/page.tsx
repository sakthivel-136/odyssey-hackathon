'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Smartphone, Wifi, QrCode, CheckCircle2, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AddDevicePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [deviceId, setDeviceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handlePair = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) throw new Error('Not authenticated');

      // Check if device exists and is available
      const { data: device, error: fetchError } = await supabase
        .from('devices')
        .select('*')
        .eq('device_id', deviceId)
        .single();

      if (fetchError || !device) {
        throw new Error('Device not found. Check the ID on your box.');
      }

      if (device.user_id && device.user_id !== user.id) {
        throw new Error('This device is already paired to another account.');
      }

      // Claim the device
      const { error: updateError } = await supabase
        .from('devices')
        .update({ user_id: user.id, status: 'ONLINE' })
        .eq('device_id', deviceId);

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => {
        router.push('/devices');
      }, 3000);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-20 md:pb-0">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Add New Medibox</h1>
        <p className="text-slate-500 mt-2">Follow the steps below to connect your Medibox to your home Wi-Fi and pair it to your account.</p>
      </header>

      <div className="bg-white rounded-3xl p-6 md:p-10 border border-slate-200 shadow-sm relative overflow-hidden">
        
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-100">
          <motion.div 
            className="h-full bg-blue-600"
            initial={{ width: '0%' }}
            animate={{ width: `${(step / 3) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <div className="flex gap-4 md:gap-8 mb-12 relative z-10 pt-4">
          <div className={`flex flex-col items-center flex-1 ${step >= 1 ? 'text-blue-600' : 'text-slate-400'}`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mb-3 ${step >= 1 ? 'bg-blue-100' : 'bg-slate-100'}`}>1</div>
            <p className="text-sm font-bold text-center">Power On</p>
          </div>
          <div className={`flex flex-col items-center flex-1 ${step >= 2 ? 'text-blue-600' : 'text-slate-400'}`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mb-3 ${step >= 2 ? 'bg-blue-100' : 'bg-slate-100'}`}>2</div>
            <p className="text-sm font-bold text-center">Connect Wi-Fi</p>
          </div>
          <div className={`flex flex-col items-center flex-1 ${step >= 3 ? 'text-blue-600' : 'text-slate-400'}`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mb-3 ${step >= 3 ? 'bg-blue-100' : 'bg-slate-100'}`}>3</div>
            <p className="text-sm font-bold text-center">Pair Device</p>
          </div>
        </div>

        <div className="min-h-[300px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col items-center text-center"
              >
                <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6">
                  <Smartphone className="w-12 h-12" />
                </div>
                <h2 className="text-2xl font-bold mb-4">Plug in your Medibox</h2>
                <p className="text-slate-600 mb-8 max-w-md">
                  Plug your Medibox into a power outlet. The LCD screen will turn on and say <strong>"MEDIBOX BOOTING"</strong>. Wait about 5 seconds until it says <strong>"WIFI SETUP MODE"</strong>.
                </p>
                <button 
                  onClick={() => setStep(2)}
                  className="bg-blue-600 text-white px-8 py-3.5 rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-lg shadow-blue-200 flex items-center gap-2"
                >
                  It's ready <ChevronRight className="w-5 h-5" />
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col items-center text-center"
              >
                <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6">
                  <Wifi className="w-12 h-12" />
                </div>
                <h2 className="text-2xl font-bold mb-4">Connect to the Medibox Network</h2>
                <div className="text-slate-600 mb-8 max-w-md text-left space-y-4">
                  <p>1. Open the Wi-Fi settings on your phone or laptop.</p>
                  <p>2. Connect to the network starting with <strong>Medibox-</strong></p>
                  <p>3. Enter the setup password: <strong>setup1234</strong></p>
                  <p>4. A portal will automatically pop up. Select your Home Wi-Fi and enter your home password to connect the box to the internet.</p>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setStep(1)}
                    className="bg-slate-100 text-slate-700 px-6 py-3.5 rounded-xl font-bold text-lg hover:bg-slate-200 transition"
                  >
                    Back
                  </button>
                  <button 
                    onClick={() => setStep(3)}
                    className="bg-blue-600 text-white px-8 py-3.5 rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-lg shadow-blue-200 flex items-center gap-2"
                  >
                    I connected it <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col items-center text-center"
              >
                <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6">
                  <QrCode className="w-12 h-12" />
                </div>
                <h2 className="text-2xl font-bold mb-4">Pair to your Account</h2>
                <p className="text-slate-600 mb-6 max-w-md">
                  Your Medibox is now connected to the internet! Check the LCD screen to find your unique <strong>Device ID</strong>, or scan the QR code provided in the box.
                </p>

                {success ? (
                  <div className="bg-emerald-50 text-emerald-700 p-6 rounded-2xl border border-emerald-200 flex flex-col items-center w-full max-w-md">
                    <CheckCircle2 className="w-12 h-12 mb-2" />
                    <h3 className="font-bold text-lg">Paired Successfully!</h3>
                    <p className="text-emerald-600">Redirecting to your dashboard...</p>
                  </div>
                ) : (
                  <form onSubmit={handlePair} className="w-full max-w-md">
                    <input
                      type="text"
                      placeholder="e.g. Odyssey Medibox"
                      required
                      value={deviceId}
                      onChange={(e) => setDeviceId(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-200 px-5 py-4 rounded-xl font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 mb-4 transition"
                    />
                    
                    {error && (
                      <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4 flex items-center gap-3 text-left">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm font-medium">{error}</span>
                      </div>
                    )}

                    <div className="flex gap-4">
                      <button 
                        type="button"
                        onClick={() => setStep(2)}
                        className="bg-slate-100 text-slate-700 px-6 py-3.5 rounded-xl font-bold text-lg hover:bg-slate-200 transition"
                      >
                        Back
                      </button>
                      <button 
                        type="submit"
                        disabled={loading || !deviceId}
                        className="flex-1 bg-emerald-600 text-white px-8 py-3.5 rounded-xl font-bold text-lg hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Pair Device'}
                      </button>
                    </div>
                  </form>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
