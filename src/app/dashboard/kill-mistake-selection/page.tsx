"use client";

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  ChevronLeft,
  Target,
  ArrowRight,
  Zap,
  Search,
  Play
} from 'lucide-react';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

const MOCK_MISTAKES = [
  { id: 'm1', tags: { domain: 'People', approach: 'Agile' }, status: 'wrong' },
  { id: 'm2', tags: { domain: 'People', approach: 'Hybrid' }, status: 'wrong' },
  { id: 'm3', tags: { domain: 'Process', approach: 'Predictive' }, status: 'wrong' },
  { id: 'm4', tags: { domain: 'Process', approach: 'Predictive' }, status: 'wrong' },
  { id: 'm5', tags: { domain: 'Process', approach: 'Agile' }, status: 'wrong' },
  { id: 'm6', tags: { domain: 'Business', approach: 'Hybrid' }, status: 'wrong' },
  { id: 'm7', tags: { domain: 'Process', approach: 'Agile' }, status: 'wrong' },
  { id: 'm8', tags: { domain: 'People', approach: 'Predictive' }, status: 'wrong' },
];

export default function KillMistakeSelectionPage() {
  const { user } = useUser();
  const db = useFirestore();
  const isDemo = user?.isAnonymous;
  
  const mistakesQuery = useMemoFirebase(() => {
    if (!user || isDemo) return null;
    return query(collection(db, 'users', user.uid, 'killMistakes'), where('status', '==', 'wrong'));
  }, [db, user, isDemo]);

  const { data: mistakes } = useCollection(mistakesQuery);

  const stats = useMemo(() => {
    const dataToProcess = isDemo ? MOCK_MISTAKES : (mistakes || []);
    const byDomain: Record<string, number> = { 'People': 0, 'Process': 0, 'Business': 0 };
    const byApproach: Record<string, number> = { 'Predictive': 0, 'Agile': 0, 'Hybrid': 0 };

    dataToProcess.forEach(m => {
      const d = m.tags?.domain;
      const a = m.tags?.approach;
      if (d && byDomain[d] !== undefined) byDomain[d]++;
      else if (d === 'Processus') byDomain['Process']++;
      
      if (a && byApproach[a] !== undefined) byApproach[a]++;
    });

    return { total: dataToProcess.length, byDomain, byApproach };
  }, [mistakes, isDemo]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in py-6 px-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="bg-amber-500 p-2.5 rounded-2xl shadow-lg">
          <Brain className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-black text-primary italic uppercase tracking-tighter flex items-center gap-3">
            KILL MISTAKE STRATEGY {isDemo && <span className="text-amber-500 text-sm">(DÉMO)</span>}
          </h1>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs italic">Éliminez vos faiblesses une par une</p>
        </div>
      </div>

      {/* Stats Row - Optimized with larger numbers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Card */}
        <Card className="rounded-[48px] border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] bg-white p-10 flex flex-col items-center justify-center text-center space-y-4">
          <div className="bg-indigo-50 p-4 rounded-3xl">
            <Target className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-1">
            <span className="text-8xl font-black text-slate-900 italic leading-none">{stats.total}</span>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest italic mt-2">Questions à corriger</p>
          </div>
        </Card>

        {/* Domain Card */}
        <Card className="rounded-[48px] border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] bg-white p-10 space-y-6">
          <div className="flex items-center gap-3 text-emerald-500 font-black uppercase text-[10px] tracking-widest italic">
            <Zap className="h-4 w-4" /> Par Domaine
          </div>
          <div className="space-y-5">
            {Object.entries(stats.byDomain).map(([domain, count]) => (
              <div key={domain} className="flex justify-between items-center group">
                <span className="text-xs font-black text-slate-500 uppercase tracking-tight">{domain === 'Process' ? 'Processus' : domain}</span>
                <span className="text-2xl font-black text-emerald-600 italic group-hover:scale-110 transition-transform">{count}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Approach Card */}
        <Card className="rounded-[48px] border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] bg-white p-10 space-y-6">
          <div className="flex items-center gap-3 text-amber-500 font-black uppercase text-[10px] tracking-widest italic">
            <Zap className="h-4 w-4" /> Par Approche
          </div>
          <div className="space-y-5">
            <div className="flex justify-between items-center group">
              <span className="text-xs font-black text-slate-500 uppercase tracking-tight">Waterfall</span>
              <span className="text-2xl font-black text-amber-600 italic group-hover:scale-110 transition-transform">{stats.byApproach.Predictive}</span>
            </div>
            <div className="flex justify-between items-center group">
              <span className="text-xs font-black text-slate-500 uppercase tracking-tight">Agile</span>
              <span className="text-2xl font-black text-amber-600 italic group-hover:scale-110 transition-transform">{stats.byApproach.Agile}</span>
            </div>
            <div className="flex justify-between items-center group">
              <span className="text-xs font-black text-slate-500 uppercase tracking-tight">Hybrid</span>
              <span className="text-2xl font-black text-amber-600 italic group-hover:scale-110 transition-transform">{stats.byApproach.Hybrid}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Simplified Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-6 pt-4">
        <Button 
          asChild 
          variant="outline" 
          className="flex-1 h-20 rounded-[24px] border-4 border-primary/20 hover:border-primary text-primary font-black uppercase tracking-widest text-lg italic shadow-xl group"
        >
          <Link href="/dashboard/kill-mistakes?mode=analyze" className="flex items-center justify-center gap-4">
            <div className="bg-primary/10 p-2 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
              <Search className="h-6 w-6" />
            </div>
            1/ Analyser mes erreurs
          </Link>
        </Button>

        <Button 
          asChild 
          className="flex-1 h-20 rounded-[24px] bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-lg italic shadow-2xl scale-105 transition-transform group"
        >
          <Link href="/dashboard/kill-mistake-redo-choice" className="flex items-center justify-center gap-4">
            <div className="bg-white/20 p-2 rounded-xl">
              <Play className="h-6 w-6 fill-white" />
            </div>
            2/ Refaire les questions
            <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform" />
          </Link>
        </Button>
      </div>

      <div className="flex justify-center pt-8">
        <Button variant="ghost" asChild className="text-slate-400 font-black uppercase tracking-widest text-[10px] hover:bg-transparent hover:text-primary">
          <Link href="/dashboard"><ChevronLeft className="mr-2 h-3 w-3" /> Retour au Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
