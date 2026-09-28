'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BrainCircuit, Sparkles, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AIInsightsPage() {
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const res = await supabase.from("ai_insights")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
        
      if (res.data) setInsights(res.data);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return <div className="p-8 animate-pulse flex flex-col gap-4">
      <div className="h-10 bg-slate-200 rounded w-1/3"></div>
      <div className="h-4 bg-slate-200 rounded w-1/4"></div>
      <div className="h-32 bg-slate-200 rounded-2xl w-full mt-4"></div>
    </div>;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-8"
    >
      <header>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
          <BrainCircuit className="w-8 h-8 text-indigo-600" />
          AI Insights
        </h1>
        <p className="text-slate-500 mt-1">Smart analysis of your medication adherence and stock levels powered by Google Gemini.</p>
      </header>
      
      <div className="space-y-6">
        {insights.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-700">No Insights Yet</h3>
            <p className="text-slate-500 mt-2 max-w-md mx-auto">Your AI companion is analyzing your data. Check back tomorrow for your first daily insight!</p>
          </div>
        ) : (
          insights.map((insight, idx) => (
            <motion.div 
              key={insight.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-slate-900">{insight.title}</h3>
                  <p className="text-xs font-medium text-slate-400">
                    {new Date(insight.created_at).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
              
              <div className="bg-slate-50 p-5 rounded-2xl text-slate-700 font-medium whitespace-pre-wrap leading-relaxed border border-slate-100">
                {insight.description}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}
