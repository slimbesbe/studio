
"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  Play, 
  Search, 
  ChevronLeft,
  Target,
  Sparkles,
  ArrowRight,
  Filter,
  Layers,
  Globe,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
  const isDemo = user?.isAnonymous;
  
  const [filterDomain, setFilterDomain] = useState('all');
  const [filterApproach, setFilterApproach] = useState('all');

  const mistakesQuery = useMemoFirebase(() => {
    if (!user || isDemo) return null;
    return query(collection(db, 'users', user.uid, 'killMistakes'), where('status', '==', 'wrong'));
  }, [db, user, isDemo]);

  const { data: mistakes, isLoading } = useCollection(mistakesQuery);

  const stats = useMemo(() => {
    const dataToProcess = isDemo ? MOCK_MISTAKES : mistakes;
    if (!dataToProcess) return { total: 0, byDomain: {}, byApproach: {} };
    
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

  const handleStartPractice = () => {
    let url = '/dashboard/practice?mode=kill_mistake';
    if (filterDomain !== 'all') url += `&domain=${filterDomain}`;
    if (filterApproach !== 'all') url += `&approach=${filterApproach}`;
    router.push(url);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-fade-in py-8 px-4">
      {/* Header avec bouton retour */}
      <div className="space-y-4">
        <Button variant="ghost" asChild className="hover:bg-primary/5 -ml-2 text-muted-foreground font-bold uppercase tracking-widest text-xs">
          <Link href="/dashboard/practice"><ChevronLeft className="mr-2 h-4 w-4" /> Retour à la pratique</Link>
        </Button>
        <div className="flex items-center gap-4">
          <div className="bg-amber-100 p-3 rounded-2xl">
            <Brain className="h-10 w-10 text-amber-600" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-primary italic uppercase tracking-tighter flex items-center gap-3">
              Méthode Kill Mistake {isDemo && <span className="text-amber-500 text-sm">(MODE DÉMO)</span>}
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs italic">Excellence par la répétition espacée</p>
          </div>
        </div>
      </div>

      {/* Section "Blabla" de qualité */}
      <Card className="rounded-[40px] border-none shadow-xl bg-gradient-to-br from-white to-slate-50 overflow-hidden">
        <CardContent className="p-10 flex flex-col md:flex-row gap-10 items-center">
          <div className="flex-1 space-y-6">
            <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-amber-500" /> Pourquoi le Kill Mistake ?
            </h2>
            <div className="space-y-4 text-slate-600 font-medium leading-relaxed italic text-lg">
              <p>
                La réussite au PMP® ne dépend pas de la quantité de questions traitées, mais de votre capacité à ne jamais commettre deux fois la même erreur.
              </p>
              <p>
                Le système <span className="text-primary font-black">Kill Mistake</span> isole vos échecs passés pour cibler vos failles de compréhension du <span className="text-primary font-black">Mindset PMI®</span>. 
              </p>
            </div>
            
            {isLoading && !isDemo ? (
              <div className="flex items-center gap-2 text-slate-400 font-bold italic animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin" /> Analyse de votre base d'erreurs...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-dashed border-slate-200">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
                  <span className="block text-2xl font-black text-primary italic">{stats.total}</span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Erreurs</span>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
                  <span className="block text-2xl font-black text-amber-600 italic">{stats.byDomain['Process'] || 0}</span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Faille Process</span>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
                  <span className="block text-2xl font-black text-emerald-600 italic">{stats.byDomain['People'] || 0}</span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Faille People</span>
                </div>
              </div>
            )}
          </div>
          <div className="w-full md:w-72 aspect-square bg-primary/5 rounded-[60px] flex items-center justify-center relative overflow-hidden shrink-0">
             <Brain className="h-32 w-32 text-primary/20 absolute" />
             <div className="z-10 text-center p-6">
                <span className="text-5xl font-black text-primary italic">90%</span>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Taux de rétention après correction</p>
             </div>
          </div>
        </CardContent>
      </Card>

      {/* Les deux options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Option 1: Analyser */}
        <Card className="group cursor-pointer hover:shadow-2xl transition-all duration-500 border-4 border-slate-100 hover:border-primary/20 rounded-[48px] overflow-hidden bg-white">
          <Link href="/dashboard/kill-mistakes" className="h-full flex flex-col">
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
                Plongez dans l'analyse théorique. Examinez chaque question ratée et imprégnez-vous des justifications du mindset officiel.
              </p>
              <div className="flex items-center text-primary font-black uppercase tracking-widest text-sm pt-4">
                Démarrer l'analyse <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-2 transition-transform" />
              </div>
            </CardContent>
          </Link>
        </Card>

        {/* Option 2: Re-répondre */}
        <Card className="hover:shadow-2xl transition-all duration-500 border-4 border-primary/10 rounded-[48px] overflow-hidden bg-primary text-white">
          <CardHeader className="p-10 pb-0">
            <div className="bg-white/10 w-20 h-20 rounded-[28px] flex items-center justify-center mb-6">
              <Play className="h-10 w-10 fill-white" />
            </div>
            <CardTitle className="text-3xl font-black uppercase italic tracking-tighter">
              2/ Re-répondre aux questions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-10 space-y-8">
            <p className="text-primary-foreground/80 font-bold italic leading-relaxed text-base">
              Mettez-vous en situation réelle d'examen sur vos erreurs passées. Choisissez vos filtres pour un entraînement ciblé.
            </p>

            <div className="space-y-4 bg-white/5 p-6 rounded-[32px] border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Filter className="h-4 w-4 opacity-60" />
                <span className="text-[10px] font-black uppercase tracking-widest italic">Configuration de session</span>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest opacity-60 ml-1">Cibler par Domaine</label>
                  <Select value={filterDomain} onValueChange={setFilterDomain}>
                    <SelectTrigger className="h-12 bg-white/10 border-white/20 text-white font-bold italic rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">TOUS LES DOMAINES ({stats.total})</SelectItem>
                      <SelectItem value="People">PEOPLE ({stats.byDomain['People'] || 0})</SelectItem>
                      <SelectItem value="Process">PROCESSUS ({stats.byDomain['Process'] || 0})</SelectItem>
                      <SelectItem value="Business">BUSINESS ({stats.byDomain['Business'] || 0})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest opacity-60 ml-1">Cibler par Approche</label>
                  <Select value={filterApproach} onValueChange={setFilterApproach}>
                    <SelectTrigger className="h-12 bg-white/10 border-white/20 text-white font-bold italic rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">TOUTES LES APPROCHES</SelectItem>
                      <SelectItem value="Predictive">PRÉDICTIF ({stats.byApproach['Predictive'] || 0})</SelectItem>
                      <SelectItem value="Agile">AGILE ({stats.byApproach['Agile'] || 0})</SelectItem>
                      <SelectItem value="Hybrid">HYBRIDE ({stats.byApproach['Hybrid'] || 0})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Button 
              className="w-full h-16 rounded-2xl bg-white text-primary hover:bg-slate-50 font-black uppercase tracking-widest text-lg shadow-xl group"
              onClick={handleStartPractice}
              disabled={stats.total === 0}
            >
              Lancer l'entraînement <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-2 transition-transform" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
