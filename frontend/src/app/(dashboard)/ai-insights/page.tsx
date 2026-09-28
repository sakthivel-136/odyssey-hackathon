'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BrainCircuit, Sparkles, RefreshCw, AlertTriangle, CheckCircle2, Copy, Check, Clock, Pill, ShieldAlert, FileText, Info, Lightbulb, HeartPulse } from 'lucide-react';
import { motion } from 'framer-motion';

import { MotionButton, CardSkeleton, SPRING_SNAPPY, SPRING_GENTLE } from '@/components/ui/motion';

type MedicineGuide = {
  name: string;
  purpose: string;
  how_to_take: string;
  best_time: string;
  refill_status: string;
  safety_tip: string;
};

type AIPoint = {
  category: 'REFILL_WARNING' | 'SCHEDULE_OPTIMIZATION' | 'SAFETY_INTERACTION' | 'CAREGIVER_SUMMARY' | string;
  title: string;
  detail: string;
};

type AIInsightData = {
  compliance_score: number;
  patient_status: string;
  overview_title: string;
  overview_summary: string;
  medicine_guides?: MedicineGuide[];
  points: AIPoint[];
};

export default function AIInsightsPage() {
  const [data, setData] = useState<AIInsightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  async function fetchAIInsights() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }

    try {
      let res = await fetch('/api/ai/daily-insight', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (!res.ok) {
        res = await fetch('https://odyssey-hackathon.onrender.com/api/ai/daily-insight', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
      }
      if (res.ok) {
        const result = await res.json();
        setData(result.insight || null);
      }
    } catch (e) {
      console.error('Error fetching AI insights:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAIInsights();
  }, []);

  const handleRegenerate = async () => {
    setGenerating(true);
    await fetchAIInsights();
    setGenerating(false);
  };

  const handleCopyDoctorSummary = () => {
    if (!data) return;
    const textToCopy = `Smart Medibox Clinical Summary:\nScore: ${data.compliance_score}%\nStatus: ${data.patient_status}\n\nOverview:\n${data.overview_summary}\n\nTablet Guides:\n` +
      (data.medicine_guides || []).map(m => `• ${m.name}: ${m.purpose} | How to take: ${m.how_to_take}`).join('\n') +
      `\n\nKey Observations:\n` +
      (data.points || []).map(p => `• [${p.title}]: ${p.detail}`).join('\n');
      
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 px-4 sm:px-0 pb-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 animate-pulse">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">AI Clinical Intelligence</h2>
            <p className="text-xs text-slate-500 font-semibold">Gemini AI is analyzing your dosage compliance and real-world medicine guidelines...</p>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 border border-slate-200/80 shadow-sm space-y-4">
          <div className="h-6 w-52 bg-slate-200 rounded-xl animate-pulse" />
          <div className="h-4 w-full bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-4 w-3/4 bg-slate-200 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'REFILL_WARNING':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'SCHEDULE_OPTIMIZATION':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'SAFETY_INTERACTION':
        return <ShieldAlert className="w-5 h-5 text-amber-500" />;
      case 'CAREGIVER_SUMMARY':
        return <FileText className="w-5 h-5 text-purple-500" />;
      default:
        return <Sparkles className="w-5 h-5 text-indigo-500" />;
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'REFILL_WARNING':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'SCHEDULE_OPTIMIZATION':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'SAFETY_INTERACTION':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'CAREGIVER_SUMMARY':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 px-4 sm:px-0 pb-12">
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="pb-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <BrainCircuit className="w-8 h-8 text-indigo-600" />
            AI Health & Medicine Guide
          </h1>
          <p className="text-slate-500 mt-1 text-base">Real-world usage instructions, simple guidance, and clinical compliance analysis.</p>
        </div>
        <div className="flex items-center gap-3">
          <MotionButton
            variant="secondary"
            success={copied}
            onClick={handleCopyDoctorSummary}
            className="flex items-center gap-2 font-bold text-xs"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied Brief' : 'Copy Doctor Brief'}
          </MotionButton>
          <MotionButton
            variant="primary"
            loading={generating}
            onClick={handleRegenerate}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            Regenerate AI Analysis
          </MotionButton>
        </div>
      </motion.header>

      {/* Overview Card with Score Ring */}
      {data && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden"
        >
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3 flex-1">
              <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3.5 py-1.5 rounded-full text-xs font-black tracking-wider uppercase">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> AI Patient Intelligence Report
              </div>
              <h2 className="text-3xl font-black">{data.overview_title || 'Patient Health Analysis'}</h2>
              <p className="text-indigo-200 text-sm leading-relaxed">{data.overview_summary}</p>
            </div>

            {/* Score Badge */}
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md border border-white/15 p-6 rounded-2xl shrink-0">
              <div className="text-center">
                <span className="text-5xl font-black text-white">{data.compliance_score}%</span>
                <p className="text-xs font-bold text-indigo-300 uppercase tracking-wider mt-1">Adherence Score</p>
              </div>
              <div className="h-10 w-px bg-white/20" />
              <div className="text-left">
                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  data.patient_status === 'EXCELLENT' ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40' :
                  data.patient_status === 'WARNING' ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40' :
                  'bg-red-500/30 text-red-300 border border-red-500/40'
                }`}>
                  {data.patient_status || 'ON TRACK'}
                </span>
                <p className="text-xs text-indigo-200 font-semibold mt-1">Verified via IR Sensors</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Real-World Medicine Usage Guides */}
      {data?.medicine_guides && data.medicine_guides.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Pill className="w-6 h-6 text-indigo-600" />
            <h3 className="text-xl font-black text-slate-900">Real-World Tablet Usage Guides (Simple English)</h3>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {data.medicine_guides.map((guide, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
                      <HeartPulse className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-slate-900">{guide.name}</h4>
                      <p className="text-xs text-indigo-600 font-bold">{guide.refill_status}</p>
                    </div>
                  </div>
                  <span className="bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1 rounded-full">
                    Prescription Guide
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-blue-500" /> Purpose & Usage
                    </p>
                    <p className="text-slate-800 font-semibold">{guide.purpose}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> How to Take
                    </p>
                    <p className="text-slate-800 font-semibold">{guide.how_to_take}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-500" /> Best Time
                    </p>
                    <p className="text-slate-800 font-semibold">{guide.best_time}</p>
                  </div>

                  <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 space-y-1">
                    <p className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600" /> Safety Tip
                    </p>
                    <p className="text-amber-900 font-semibold">{guide.safety_tip}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Point-by-Point Structured Cards */}
      {data?.points && (
        <div className="space-y-4">
          <h3 className="text-xl font-black text-slate-900">Key Clinical Observations & Refill Projections</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.points.map((pt, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${getCategoryBadgeClass(pt.category)}`}>
                      {getCategoryIcon(pt.category)}
                      {pt.category.replace('_', ' ')}
                    </span>
                  </div>
                  <h4 className="text-lg font-black text-slate-900 mb-1">{pt.title}</h4>
                  <p className="text-slate-600 text-sm leading-relaxed font-medium">{pt.detail}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
