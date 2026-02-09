
"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  Play, 
  Search, 
  ChevronLeft,
  Target,
  ArrowRight,
  Layers,
  Zap,
  LayoutGrid,
  History
} from 'lucide-react';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';

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
      if (a && byApproach[a] !== undefined) byApproach[a]++;
    });

    return { total: dataToProcess.length, byDomain, byApproach };
  }, [mistakes, isDemo]);

  return (
    <div className="max-w-6xl mx-auto space-y-4 animate-fade-in py-2 px-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Button variant="ghost" asChild className="hover:bg-primary/5 -ml-2 text-muted-foreground font-black uppercase tracking-widest text-[9px] h-7">
            <Link href="/dashboard/practice"><ChevronLeft className="mr-1 h-3 w-3" /> Dashboard</Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-1.5 rounded-lg">
              <Brain className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-primary italic uppercase tracking-tighter flex items-center gap-2">
                Kill Mistake Strategy {isDemo && <span className="text-amber-500 text-[10px]">(DÉMO)</span>}
              </h1>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px] italic">Éliminez vos faiblesses une par une</p>
            </div>
          </div>
        </div>

        <div className="bg-white px-6 py-2 rounded-2xl border-2 flex items-center gap-4 shadow-sm">
          <div className="flex flex-col items-center">
            <span className="text-2xl font-black text-primary italic leading-none">{stats.total}</span>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">Total erreurs</span>
          </div>
          <div className="h-8 w-px bg-slate-100" />
          <div className="flex gap-3">
            {Object.entries(stats.byDomain).map(([d, c]) => (
              <div key={d} className="flex flex-col items-center">
                <span className="text-xs font-black text-slate-700">{c}</span>
                <span className="text-[7px] font-bold text-slate-400 uppercase">{d.substring(0, 4)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {/* Card 1: Analyser */}
        <Card className="group cursor-pointer hover:shadow-lg transition-all border-2 border-slate-100 hover:border-primary/20 rounded-2xl overflow-hidden bg-white">
          <Link href="/dashboard/kill-mistakes?mode=analyze" className="h-full flex flex-col p-5 space-y-3">
            <div className="bg-slate-50 w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Search className="h-5 w-5 text-slate-400 group-hover:text-primary transition-colors" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg font-black uppercase italic tracking-tighter text-slate-900 leading-tight">
                1/ Analyser
              </CardTitle>
              <p className="text-slate-500 font-bold italic leading-relaxed text-[10px]">
                Examinez les questions manquées et apprenez les justifications PMI®.
              </p>
            </div>
            <div className="flex items-center text-primary font-black uppercase tracking-widest text-[8px] pt-1">
              Voir les analyses <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </Card>

        {/* Card 2: Refaire (Libre) */}
        <Card className="group cursor-pointer hover:shadow-lg transition-all border-2 border-slate-100 hover:border-emerald-500/20 rounded-2xl overflow-hidden bg-white">
          <Link href="/dashboard/kill-mistakes?mode=redo" className="h-full flex flex-col p-5 space-y-3">
            <div className="bg-emerald-50 w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <LayoutGrid className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg font-black uppercase italic tracking-tighter text-slate-900 leading-tight">
                2/ Mode Libre
              </CardTitle>
              <p className="text-slate-500 font-bold italic leading-relaxed text-[10px]">
                Répondez librement aux questions et voyez le résultat immédiat.
              </p>
            </div>
            <div className="flex items-center text-emerald-600 font-black uppercase tracking-widest text-[8px] pt-1">
              Choisir les questions <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </Card>

        {/* Card 3: Session (Linéaire) */}
        <Card className="group cursor-pointer hover:shadow-lg transition-all border-2 border-primary/10 rounded-2xl overflow-hidden bg-primary text-white">
          <Link href="/dashboard/kill-mistakes?mode=session" className="h-full flex flex-col p-5 space-y-3">
            <div className="bg-white/10 w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Zap className="h-5 w-5 fill-white" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg font-black uppercase italic tracking-tighter leading-tight">
                3/ Mode Session
              </CardTitle>
              <p className="text-white/70 font-bold italic leading-relaxed text-[10px]">
                Parcours linéaire sans interruption. Résultats à la fin uniquement.
              </p>
            </div>
            <div className="flex items-center text-white font-black uppercase tracking-widest text-[8px] pt-1">
              Lancer la session <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </Card>
      </div>

      <div className="bg-muted/20 rounded-xl p-4 border flex items-center justify-between text-slate-500">
        <div className="flex items-center gap-3">
          <History className="h-4 w-4 opacity-50" />
          <p className="text-[10px] font-bold italic uppercase tracking-wider">
            La répétition espacée est la clé du succès. Revenez régulièrement sur vos erreurs.
          </p>
        </div>
      </div>
    </div>
  );
}
