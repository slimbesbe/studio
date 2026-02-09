
"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  Search, 
  ChevronLeft,
  Target,
  ArrowRight,
  Zap,
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

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Card */}
        <Card className="rounded-[48px] border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] bg-white p-10 flex flex-col items-center justify-center text-center space-y-4">
          <div className="bg-indigo-50 p-4 rounded-3xl">
            <Target className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-1">
            <span className="text-6xl font-black text-slate-900 italic leading-none">{stats.total}</span>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Questions à corriger</p>
          </div>
        </Card>

        {/* Domain Card */}
        <Card className="rounded-[48px] border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] bg-white p-10 space-y-6">
          <div className="flex items-center gap-3 text-emerald-500 font-black uppercase text-[10px] tracking-widest italic">
            <Zap className="h-4 w-4" /> Par Domaine
          </div>
          <div className="space-y-4">
            {Object.entries(stats.byDomain).map(([domain, count]) => (
              <div key={domain} className="flex justify-between items-center group">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-tight">{domain === 'Process' ? 'Processus' : domain}</span>
                <span className="bg-emerald-50 text-emerald-600 h-7 w-10 rounded-full flex items-center justify-center font-black text-xs group-hover:scale-110 transition-transform">{count}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Approach Card */}
        <Card className="rounded-[48px] border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] bg-white p-10 space-y-6">
          <div className="flex items-center gap-3 text-amber-500 font-black uppercase text-[10px] tracking-widest italic">
            <Zap className="h-4 w-4" /> Par Approche
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center group">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-tight">Waterfall</span>
              <span className="bg-amber-50 text-amber-600 h-7 w-10 rounded-full flex items-center justify-center font-black text-xs group-hover:scale-110 transition-transform">{stats.byApproach.Predictive}</span>
            </div>
            <div className="flex justify-between items-center group">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-tight">Agile</span>
              <span className="bg-amber-50 text-amber-600 h-7 w-10 rounded-full flex items-center justify-center font-black text-xs group-hover:scale-110 transition-transform">{stats.byApproach.Agile}</span>
            </div>
            <div className="flex justify-between items-center group">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-tight">Hybrid</span>
              <span className="bg-amber-50 text-amber-600 h-7 w-10 rounded-full flex items-center justify-center font-black text-xs group-hover:scale-110 transition-transform">{stats.byApproach.Hybrid}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Action Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Card 1: Analyser */}
        <Card className="rounded-[60px] border-none shadow-[0_30px_60px_rgba(0,0,0,0.08)] bg-white p-14 space-y-8 group hover:scale-[1.02] transition-all">
          <div className="bg-slate-50 w-20 h-20 rounded-[32px] flex items-center justify-center">
            <Search className="h-10 w-10 text-slate-300 group-hover:text-primary transition-colors" />
          </div>
          <div className="space-y-4">
            <CardTitle className="text-4xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">
              1/ Analyser mes erreurs
            </CardTitle>
            <p className="text-slate-500 font-bold italic leading-relaxed text-base max-w-sm">
              Examinez les questions manquées et apprenez les justifications du Mindset PMI® pour corriger votre logique.
            </p>
          </div>
          <Button variant="ghost" asChild className="p-0 text-primary hover:bg-transparent font-black uppercase tracking-[0.2em] text-xs h-auto">
            <Link href="/dashboard/kill-mistakes?mode=analyze" className="flex items-center gap-2">
              Voir les analyses <ArrowRight className="h-4 w-4 group-hover:translate-x-2 transition-transform" />
            </Link>
          </Button>
        </Card>

        {/* Card 2: Refaire */}
        <Card className="rounded-[60px] border-none shadow-[0_30px_60px_rgba(63,81,181,0.2)] bg-primary p-14 space-y-8 group hover:scale-[1.02] transition-all text-white relative overflow-hidden">
          <div className="absolute -top-10 -right-10 bg-white/10 h-40 w-40 rounded-full" />
          <div className="bg-white/10 w-20 h-20 rounded-[32px] flex items-center justify-center">
            <Play className="h-10 w-10 fill-white" />
          </div>
          <div className="space-y-4 relative z-10">
            <CardTitle className="text-4xl font-black uppercase italic tracking-tighter leading-none">
              2/ Refaire les questions
            </CardTitle>
            <p className="text-white/70 font-bold italic leading-relaxed text-base max-w-sm">
              Mettez-vous en situation réelle sur vos erreurs passées pour valider l'ancrage définitif des concepts.
            </p>
          </div>
          <Button variant="ghost" asChild className="p-0 text-white hover:bg-transparent hover:text-white/80 font-black uppercase tracking-[0.2em] text-xs h-auto relative z-10">
            <Link href="/dashboard/kill-mistake-redo-choice" className="flex items-center gap-2">
              Lancer l'entraînement <ArrowRight className="h-4 w-4 group-hover:translate-x-2 transition-transform" />
            </Link>
          </Button>
        </Card>
      </div>

      <div className="flex justify-center pt-4">
        <Button variant="ghost" asChild className="text-slate-400 font-black uppercase tracking-widest text-[10px]">
          <Link href="/dashboard"><ChevronLeft className="mr-2 h-3 w-3" /> Retour au Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
