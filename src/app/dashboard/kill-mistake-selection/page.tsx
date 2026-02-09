
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
  Zap
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
    <div className="max-w-6xl mx-auto space-y-10 animate-fade-in py-8 px-4">
      <div className="space-y-4">
        <Button variant="ghost" asChild className="hover:bg-primary/5 -ml-2 text-muted-foreground font-black uppercase tracking-widest text-xs">
          <Link href="/dashboard/practice"><ChevronLeft className="mr-2 h-4 w-4" /> Retour au Dashboard</Link>
        </Button>
        <div className="flex items-center gap-4">
          <div className="bg-amber-100 p-3 rounded-2xl">
            <Brain className="h-10 w-10 text-amber-600" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-primary italic uppercase tracking-tighter flex items-center gap-3">
              Kill Mistake Strategy {isDemo && <span className="text-amber-500 text-sm">(DÉMO)</span>}
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs italic">Éliminez vos faiblesses une par une</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="rounded-[32px] border-none shadow-lg bg-white p-8 flex flex-col items-center justify-center text-center group transition-all hover:scale-[1.02]">
          <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 group-hover:rotate-6 transition-transform">
            <Target className="h-8 w-8 text-primary" />
          </div>
          <span className="text-5xl font-black text-slate-900 italic tracking-tighter">{stats.total}</span>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 italic">Questions à corriger</p>
        </Card>

        <Card className="rounded-[32px] border-none shadow-lg bg-white p-8 space-y-4 transition-all hover:scale-[1.02]">
          <div className="flex items-center gap-3 text-emerald-600 mb-2">
            <Layers className="h-5 w-5" />
            <h3 className="font-black uppercase italic text-xs tracking-widest">Par Domaine</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(stats.byDomain).map(([domain, count]) => (
              <div key={domain} className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">{domain === 'Process' ? 'Processus' : domain}</span>
                <Badge variant="secondary" className="font-black px-3 py-1 rounded-lg text-emerald-700 bg-emerald-50 border-emerald-100">{count}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-[32px] border-none shadow-lg bg-white p-8 space-y-4 transition-all hover:scale-[1.02]">
          <div className="flex items-center gap-3 text-amber-600 mb-2">
            <Zap className="h-5 w-5" />
            <h3 className="font-black uppercase italic text-xs tracking-widest">Par Approche</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(stats.byApproach).map(([approach, count]) => (
              <div key={approach} className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">{approach === 'Predictive' ? 'Waterfall' : approach}</span>
                <Badge variant="secondary" className="font-black px-3 py-1 rounded-lg text-amber-700 bg-amber-50 border-amber-100">{count}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="group cursor-pointer hover:shadow-2xl transition-all duration-500 border-4 border-slate-100 hover:border-primary/20 rounded-[48px] overflow-hidden bg-white">
          <Link href="/dashboard/kill-mistakes?mode=analyze" className="h-full flex flex-col">
            <CardHeader className="p-10 pb-0">
              <div className="bg-slate-50 w-20 h-20 rounded-[28px] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                <Search className="h-10 w-10 text-slate-400 group-hover:text-primary transition-colors" />
              </div>
              <CardTitle className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">
                1/ Analyser mes erreurs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-10 space-y-6 flex-1">
              <p className="text-slate-500 font-bold italic leading-relaxed text-base">
                Examinez les questions manquées et apprenez les justifications du Mindset PMI® pour corriger votre logique.
              </p>
              <div className="flex items-center text-primary font-black uppercase tracking-widest text-sm pt-4">
                Voir les analyses <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-2 transition-transform" />
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="group cursor-pointer hover:shadow-2xl transition-all duration-500 border-4 border-primary/10 rounded-[48px] overflow-hidden bg-primary text-white">
          <Link href="/dashboard/kill-mistakes?mode=redo" className="h-full flex flex-col">
            <CardHeader className="p-10 pb-0">
              <div className="bg-white/10 w-20 h-20 rounded-[28px] flex items-center justify-center mb-6">
                <Play className="h-10 w-10 fill-white" />
              </div>
              <CardTitle className="text-3xl font-black uppercase italic tracking-tighter">
                2/ Refaire les questions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-10 space-y-6 flex-1">
              <p className="text-primary-foreground/80 font-bold italic leading-relaxed text-base">
                Mettez-vous en situation réelle sur vos erreurs passées pour valider l'ancrage définitif des concepts.
              </p>
              <div className="flex items-center text-white font-black uppercase tracking-widest text-sm pt-4">
                Lancer l'entraînement <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-2 transition-transform" />
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
}
