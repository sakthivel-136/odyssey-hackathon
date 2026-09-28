'use client';

import { useState, useEffect } from 'react';
import { Bell, Camera, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function PermissionModal() {
  const [showModal, setShowModal] = useState(false);

  const [notifState, setNotifState] = useState<'default' | 'granted' | 'denied'>('default');
  const [cameraState, setCameraState] = useState<'default' | 'granted' | 'denied'>('default');

  const [optOutNotif, setOptOutNotif] = useState(false);
  const [optOutCamera, setOptOutCamera] = useState(false);

  useEffect(() => {
    // Check initial notification status & opt-outs
    const storedOptNotif = localStorage.getItem('opt_out_notifications') === 'true';
    const storedOptCam = localStorage.getItem('opt_out_camera') === 'true';
    const storedCamGranted = localStorage.getItem('camera_permission_granted') === 'true';

    setOptOutNotif(storedOptNotif);
    setOptOutCamera(storedOptCam);

    let nPermission: 'default' | 'granted' | 'denied' = 'default';
    if ('Notification' in window) {
      nPermission = Notification.permission;
      setNotifState(nPermission);
    }

    let cPermission: 'default' | 'granted' | 'denied' = storedCamGranted ? 'granted' : 'default';
    setCameraState(cPermission);

    // Determine if modal should show
    const needsNotif = nPermission === 'default' && !storedOptNotif;
    const needsCam = cPermission === 'default' && !storedOptCam;

    if (needsNotif || needsCam) {
      // Delay slightly so it smoothly animates in after login
      const timer = setTimeout(() => setShowModal(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleRequestNotification = async () => {
    if (!('Notification' in window)) {
      alert("System notifications are not supported on this browser.");
      return;
    }
    try {
      const res = await Notification.requestPermission();
      setNotifState(res);
      if (res === 'granted') {
        new Notification("Smart Medibox Push Notifications Enabled! 🎉", {
          body: "You will now receive instant phone alerts when your schedule starts or if a dose is missed."
        });
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleRequestCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Camera API is not supported on this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraState('granted');
      localStorage.setItem('camera_permission_granted', 'true');
      stream.getTracks().forEach(track => track.stop());
    } catch (e) {
      setCameraState('denied');
      alert("Camera permission denied. You can enable it anytime in Settings.");
    }
  };

  const handleOptOutNotifChange = (checked: boolean) => {
    setOptOutNotif(checked);
    localStorage.setItem('opt_out_notifications', checked ? 'true' : 'false');
  };

  const handleOptOutCameraChange = (checked: boolean) => {
    setOptOutCamera(checked);
    localStorage.setItem('opt_out_camera', checked ? 'true' : 'false');
  };

  const handleDone = () => {
    setShowModal(false);
  };

  if (!showModal) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-6 relative overflow-hidden"
        >
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">App Permissions</h2>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">Enable features for the best Medibox experience.</p>
              </div>
            </div>
            <button
              onClick={handleDone}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {/* 1. Push Notifications Permission Card */}
            {notifState === 'default' && (
              <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <motion.div 
                      animate={{ rotate: [-12, 12, -8, 8, 0] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                      className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl shadow-sm"
                    >
                      <Bell className="w-5 h-5 text-indigo-600" />
                    </motion.div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Push Notifications</h4>
                      <p className="text-xs text-slate-500">Get alerts when schedule starts or doses are missed.</p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleRequestNotification}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-indigo-500/20 shrink-0 cursor-pointer"
                  >
                    Allow Alerts
                  </motion.button>
                </div>

                <label className="flex items-center gap-2 pt-1 border-t border-slate-200/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={optOutNotif}
                    onChange={(e) => handleOptOutNotifChange(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-500 font-medium">I don't need notification alerts (Don't ask again)</span>
                </label>
              </div>
            )}

            {notifState === 'granted' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center gap-3 text-emerald-800 text-xs font-bold shadow-sm"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Push Notifications Allowed! You will receive live alerts.</span>
              </motion.div>
            )}

            {/* 2. Camera Access Permission Card */}
            {cameraState === 'default' && (
              <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <motion.div 
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                      className="p-3 bg-purple-100 text-purple-600 rounded-2xl shadow-sm"
                    >
                      <Camera className="w-5 h-5 text-purple-600" />
                    </motion.div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Camera Access (QR Pairing)</h4>
                      <p className="text-xs text-slate-500">Scan physical QR codes on your Medibox hardware.</p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleRequestCamera}
                    className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-purple-500/20 shrink-0 cursor-pointer"
                  >
                    Allow Camera
                  </motion.button>
                </div>

                <label className="flex items-center gap-2 pt-1 border-t border-slate-200/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={optOutCamera}
                    onChange={(e) => handleOptOutCameraChange(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-xs text-slate-500 font-medium">I don't need camera QR scanning (Don't ask again)</span>
                </label>
              </div>
            )}

            {cameraState === 'granted' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center gap-3 text-emerald-800 text-xs font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Camera Permission Granted! Ready for QR code pairing.</span>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={handleDone}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-2xl text-sm transition shadow-sm"
            >
              Continue to Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
