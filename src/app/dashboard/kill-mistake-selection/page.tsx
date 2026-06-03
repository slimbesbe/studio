
"use client";

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  ChevronLeft,
  Search,
  Play,
  LayoutGrid,
  BookOpen,
  GraduationCap,
  ArrowRight,
  TrendingDown,
  Zap,
  Loader2,
  FileQuestion
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

export default function KillMistakeSelectionPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();

  // 1. FETCH DES ERREURS RÉELLES
  const mistakesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, 'users', user.uid, 'killMistakes'), where('status', '==', 'wrong'));
  }, [db, user]);

  const { data: mistakes, isLoading } = useCollection(mistakesQuery);

  // 2. CALCUL DES STATISTIQUES
  const stats = useMemo(() => {
    if (!mistakes) return null;
    
    return {
      total: mistakes.length,
      matrice: mistakes.filter(m => m.sourceType === 'matrix').length,
      pratique: mistakes.filter(m => !m.sourceType || m.sourceType === 'practice').length,
      simulation: mistakes.filter(m => m.sourceType === 'exam').length,
      reduction: 15 // Mocké pour le design
    };
  }, [mistakes]);

  if (isUserLoading || isLoading) {
    return <div className="h-[70vh] flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  // 3. GESTION DU "EMPTY STATE"
  if (!stats || stats.total === 0) {
    return (
      <div className="max-w-4xl mx-auto py-24 px-4 text-center space-y-8 animate-fade-in">
        <div className="bg-white p-16 rounded-[60px] shadow-2xl border-4 border-dashed border-slate-100 flex flex-col items-center">
          <div className="bg-primary/5 p-8 rounded-full mb-8">
            <Brain className="h-16 w-16 text-slate-300" />
          </div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 mb-4">Prêt pour l'Excellence ?</h1>
          <p className="text-slate-500 font-bold italic text-lg max-w-md mx-auto leading-relaxed">
            Votre base d'erreurs est actuellement vide. Commencez à pratiquer pour identifier vos points faibles et activer la stratégie Kill Mistake.
          </p>
          <Button asChild size="lg" className="mt-12 h-20 px-12 rounded-[28px] bg-primary hover:bg-primary/90 text-xl font-black uppercase tracking-widest shadow-xl scale-105 transition-transform">
            <Link href="/dashboard/practice">COMMENCER L'EXPÉRIENCE</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-fade-in py-8 px-4">
      {/* EN-TÊTE */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="bg-[#1e3a8a] p-2 rounded-xl shadow-lg">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-4xl font-black text-[#1e3a8a] italic uppercase tracking-tighter">
            KILL MISTAKE STRATEGY
          </h1>
        </div>
        <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs pl-1">
          PURGEZ VOS ERREURS PAR THÉMATIQUE
        </p>
      </div>

      {/* SECTION SUPÉRIEURE : STATISTIQUES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-4">
          <Card className="rounded-[32px] p-8 border-4 border-[#1e3a8a] h-full flex flex-col justify-between bg-white shadow-2xl">
            <div className="flex justify-between items-start">
              <span className="font-black uppercase italic text-xs tracking-widest text-slate-500">TOTAL ERREURS</span>
              <div className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1 italic">
                <TrendingDown className="h-3 w-3" /> -{stats.reduction} RÉDUCTION
              </div>
            </div>
            <div className="mt-8">
              <p className="text-8xl font-black italic tracking-tighter text-slate-900 leading-none mb-2">
                {stats.total}
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                SUR L'ENSEMBLE DE VOS SESSIONS
              </p>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-8 space-y-4">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-4 italic">RÉPARTITION PAR CATÉGORIE</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100%-2rem)]">
            <StatMiniCard icon={LayoutGrid} label="Matrice Magique" val={stats.matrice} color="text-emerald-600" bg="bg-emerald-50" />
            <StatMiniCard icon={BookOpen} label="Pratique Libre" val={stats.pratique} color="text-indigo-600" bg="bg-indigo-50" />
            <StatMiniCard icon={GraduationCap} label="Simulations Exam" val={stats.simulation} color="text-amber-600" bg="bg-amber-50" />
          </div>
        </div>
      </div>

      {/* SECTION INFÉRIEURE : MODES D'ACTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
        <Card className="rounded-[48px] border-2 border-slate-100 shadow-xl bg-white p-12 space-y-8 group hover:shadow-2xl transition-all duration-300">
          <div className="bg-slate-50 w-20 h-20 rounded-[32px] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
            <Search className="h-10 w-10 text-[#1e3a8a]" />
          </div>
          <div className="space-y-4">
            <h3 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 leading-tight">MODE ANALYSE</h3>
            <p className="text-slate-500 font-bold italic leading-relaxed text-sm">
              Parcourez vos erreurs pour comprendre les justifications du Mindset PMI® et revoir les bonnes réponses en détail.
            </p>
          </div>
          <Button asChild className="w-full h-16 rounded-[24px] border-2 border-[#1e3a8a] bg-transparent text-[#1e3a8a] hover:bg-slate-50 font-black uppercase tracking-widest shadow-lg transition-all group/btn">
            <Link href="/dashboard/kill-mistakes?mode=analyze" className="flex items-center gap-2">
              EXPLORER LES THÈMES <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </Card>

        <Card className="rounded-[48px] border-none shadow-2xl bg-[#1e3a8a] p-12 space-y-8 group hover:scale-[1.01] transition-all duration-300 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-5"><Zap className="h-40 w-40 fill-white" /></div>
          <div className="bg-white/10 w-20 h-20 rounded-[32px] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform relative z-10">
            <Play className="h-10 w-10 fill-white text-white ml-1" />
          </div>
          <div className="space-y-4 relative z-10">
            <h3 className="text-3xl font-black uppercase italic tracking-tighter leading-tight">MODE ACTION</h3>
            <p className="text-blue-100/70 font-bold italic leading-relaxed text-sm">
              Lancez une session chronométrée pour corriger vos erreurs et les faire disparaître définitivement de votre base de données.
            </p>
          </div>
          <Button asChild className="w-full h-16 rounded-[24px] bg-white text-[#1e3a8a] hover:bg-blue-50 font-black uppercase tracking-widest shadow-xl relative z-10 transition-all group/btn">
            <Link href="/dashboard/kill-mistakes?mode=session" className="flex items-center gap-2">
              LANCER UNE SESSION <Zap className="ml-2 h-4 w-4 fill-current group-hover/btn:scale-110 transition-transform" />
            </Link>
          </Button>
        </Card>
      </div>

      <div className="flex justify-center pt-12">
        <Button variant="ghost" asChild className="text-slate-400 font-black uppercase tracking-widest text-[10px] hover:bg-transparent hover:text-[#1e3a8a] group">
          <Link href="/dashboard"><ChevronLeft className="mr-2 h-3 w-3 group-hover:-translate-x-1 transition-transform" /> Retour au Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}

function StatMiniCard({ icon: Icon, label, val, color, bg }: any) {
  return (
    <Card className="rounded-[28px] border-none shadow-lg p-6 bg-white flex flex-col items-center justify-center gap-3 transition-all hover:scale-105">
      <div className={cn("p-3 rounded-2xl shadow-inner", bg)}>
        <Icon className={cn("h-6 w-6", color)} />
      </div>
      <div className="text-center">
        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 italic">{label}</p>
        <p className={cn("text-3xl font-black italic tracking-tighter leading-none", color)}>{val}</p>
      </div>
    </Card>
  );
}
