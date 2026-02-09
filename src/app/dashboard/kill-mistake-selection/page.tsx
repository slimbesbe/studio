
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
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in py-4 px-4">
      <div className="space-y-2">
        <Button variant="ghost" asChild className="hover:bg-primary/5 -ml-2 text-muted-foreground font-black uppercase tracking-widest text-[10px] h-8">
          <Link href="/dashboard/practice"><ChevronLeft className="mr-2 h-3 w-3" /> Retour au Dashboard</Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="bg-amber-100 p-2 rounded-xl">
            <Brain className="h-8 w-8 text-amber-600" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-primary italic uppercase tracking-tighter flex items-center gap-2">
              Kill Mistake Strategy {isDemo && <span className="text-amber-500 text-xs">(DÉMO)</span>}
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] italic">Éliminez vos faiblesses une par une</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="rounded-3xl border-none shadow-md bg-white p-6 flex flex-col items-center justify-center text-center group transition-all hover:scale-[1.02]">
          <div className="h-12 w-14 bg-primary/10 rounded-xl flex items-center justify-center mb-2 group-hover:rotate-6 transition-transform">
            <Target className="h-6 w-6 text-primary" />
          </div>
          <span className="text-4xl font-black text-slate-900 italic tracking-tighter">{stats.total}</span>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">Questions à corriger</p>
        </Card>

        <Card className="rounded-3xl border-none shadow-md bg-white p-6 space-y-3 transition-all hover:scale-[1.02]">
          <div className="flex items-center gap-2 text-emerald-600 mb-1">
            <Layers className="h-4 w-4" />
            <h3 className="font-black uppercase italic text-[10px] tracking-widest">Par Domaine</h3>
          </div>
          <div className="space-y-2">
            {Object.entries(stats.byDomain).map(([domain, count]) => (
              <div key={domain} className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase">{domain === 'Process' ? 'Processus' : domain}</span>
                <Badge variant="secondary" className="font-black px-2 py-0 h-5 text-[10px] rounded-md text-emerald-700 bg-emerald-50 border-emerald-100">{count}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-3xl border-none shadow-md bg-white p-6 space-y-3 transition-all hover:scale-[1.02]">
          <div className="flex items-center gap-2 text-amber-600 mb-1">
            <Zap className="h-4 w-4" />
            <h3 className="font-black uppercase italic text-[10px] tracking-widest">Par Approche</h3>
          </div>
          <div className="space-y-2">
            {Object.entries(stats.byApproach).map(([approach, count]) => (
              <div key={approach} className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase">{approach === 'Predictive' ? 'Waterfall' : approach}</span>
                <Badge variant="secondary" className="font-black px-2 py-0 h-5 text-[10px] rounded-md text-amber-700 bg-amber-50 border-amber-100">{count}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        <Card className="group cursor-pointer hover:shadow-xl transition-all duration-500 border-4 border-slate-100 hover:border-primary/20 rounded-[32px] overflow-hidden bg-white">
          <Link href="/dashboard/kill-mistakes?mode=analyze" className="h-full flex flex-col">
            <CardHeader className="p-6 pb-0">
              <div className="bg-slate-50 w-14 h-14 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                <Search className="h-7 w-7 text-slate-400 group-hover:text-primary transition-colors" />
              </div>
              <CardTitle className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 leading-tight">
                1/ Analyser mes erreurs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4 flex-1">
              <p className="text-slate-500 font-bold italic leading-relaxed text-xs">
                Examinez les questions manquées et apprenez les justifications du Mindset PMI® pour corriger votre logique.
              </p>
              <div className="flex items-center text-primary font-black uppercase tracking-widest text-[10px] pt-2">
                Voir les analyses <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-2 transition-transform" />
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="group cursor-pointer hover:shadow-xl transition-all duration-500 border-4 border-primary/10 rounded-[32px] overflow-hidden bg-primary text-white">
          <Link href="/dashboard/kill-mistakes?mode=redo" className="h-full flex flex-col">
            <CardHeader className="p-6 pb-0">
              <div className="bg-white/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-4">
                <Play className="h-7 w-7 fill-white" />
              </div>
              <CardTitle className="text-2xl font-black uppercase italic tracking-tighter leading-tight">
                2/ Refaire les questions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4 flex-1">
              <p className="text-primary-foreground/80 font-bold italic leading-relaxed text-xs">
                Mettez-vous en situation réelle sur vos erreurs passées pour valider l'ancrage définitif des concepts.
              </p>
              <div className="flex items-center text-white font-black uppercase tracking-widest text-[10px] pt-2">
                Lancer l'entraînement <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-2 transition-transform" />
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
}
