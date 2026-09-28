'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BrainCircuit, Sparkles, RefreshCw, AlertTriangle, CheckCircle2, Copy, Check, Clock, Pill, ShieldAlert, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

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
      const res = await fetch('/api/ai/daily-insight', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
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
    const summaryPoint = data.points?.find(p => p.category === 'CAREGIVER_SUMMARY') || data.points?.[0];
    const textToCopy = `Smart Medibox Clinical Summary:\nScore: ${data.compliance_score}%\nStatus: ${data.patient_status}\n\nOverview:\n${data.overview_summary}\n\nKey Observations:\n` +
      (data.points || []).map(p => `• [${p.title}]: ${p.detail}`).join('\n');
      
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-bold text-sm animate-pulse">Analyzing dosage history & telemetry with AI...</p>
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
            AI Health & Compliance Engine
          </h1>
          <p className="text-slate-500 mt-1 text-base">Real-time clinical analysis powered by LLM AI & Smart Medibox Telemetry.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyDoctorSummary}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied Summary' : 'Copy Doctor Brief'}
          </button>
          <button
            onClick={handleRegenerate}
            disabled={generating}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            Regenerate AI Analysis
          </button>
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

      {/* Point-by-Point Structured Cards */}
      {data?.points && (
        <div className="space-y-4">
          <h3 className="text-xl font-black text-slate-900">Key AI Clinical & Operational Insights</h3>

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
