
"use client";

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  ChevronLeft,
  Play,
  LayoutGrid,
  BookOpen,
  GraduationCap,
  ArrowRight,
  TrendingDown,
  Zap,
  Loader2,
  ListFilter
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function KillMistakeSelectionPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const [isPurgeDialogOpen, setIsPurgeDialogOpen] = useState(false);

  const mistakesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, 'users', user.uid, 'killMistakes'), where('status', '==', 'wrong'));
  }, [db, user]);

  const { data: mistakes, isLoading } = useCollection(mistakesQuery);

  const stats = useMemo(() => {
    if (!mistakes) return null;
    return {
      total: mistakes.length,
      matrix: mistakes.filter(m => m.sourceType === 'matrix').length,
      practice: mistakes.filter(m => !m.sourceType || m.sourceType === 'practice').length,
      exam: mistakes.filter(m => m.sourceType === 'exam').length,
    };
  }, [mistakes]);

  if (isUserLoading || isLoading) {
    return <div className="h-[70vh] flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

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
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="bg-[#1e3a8a] p-2 rounded-xl shadow-lg">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-4xl font-black text-[#1e3a8a] italic uppercase tracking-tighter">
            KILL MISTAKE STRATEGY
          </h1>
        </div>
        <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs pl-1 italic">
          Cliquez sur les thèmes pour analyser vos erreurs
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-4">
          <button 
            onClick={() => router.push('/dashboard/kill-mistakes?mode=analyze&theme=all')}
            className="w-full text-left transition-transform hover:scale-[1.02] active:scale-95"
          >
            <Card className="rounded-[32px] p-8 border-4 border-[#1e3a8a] h-full flex flex-col justify-between bg-white shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Brain className="h-32 w-32" />
              </div>
              <div className="flex justify-between items-start relative z-10">
                <span className="font-black uppercase italic text-xs tracking-widest text-slate-500">TOTAL ERREURS</span>
                <div className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1 italic">
                  <TrendingDown className="h-3 w-3" /> ANALYSER
                </div>
              </div>
              <div className="mt-8 relative z-10">
                <p className="text-8xl font-black italic tracking-tighter text-slate-900 leading-none mb-2">
                  {stats.total}
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                  CLIQUEZ POUR VOIR LES QUESTIONS
                </p>
              </div>
            </Card>
          </button>
        </div>

        <div className="lg:col-span-8 space-y-4">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-4 italic">RÉPARTITION PAR CATÉGORIE</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatMiniCard 
              icon={LayoutGrid} 
              label="Matrice Magique" 
              val={stats.matrix} 
              color="text-emerald-600" 
              bg="bg-emerald-50"
              onClick={() => router.push('/dashboard/kill-mistakes?mode=analyze&theme=matrix')}
            />
            <StatMiniCard 
              icon={BookOpen} 
              label="Pratique Libre" 
              val={stats.practice} 
              color="text-indigo-600" 
              bg="bg-indigo-50"
              onClick={() => router.push('/dashboard/kill-mistakes?mode=analyze&theme=practice')}
            />
            <StatMiniCard 
              icon={GraduationCap} 
              label="Simulations Exam" 
              val={stats.exam} 
              color="text-amber-600" 
              bg="bg-amber-50"
              onClick={() => router.push('/dashboard/kill-mistakes?mode=analyze&theme=exam')}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center pt-12 space-y-8">
        <div className="text-center max-w-2xl space-y-4">
          <h2 className="text-3xl font-black italic text-slate-900 uppercase tracking-tight">PRÊT À CORRIGER ?</h2>
          <p className="text-slate-500 font-bold italic text-sm">
            Lancez une session de remédiation active pour éliminer définitivement ces erreurs de votre base.
          </p>
        </div>

        <Button 
          onClick={() => setIsPurgeDialogOpen(true)}
          className="h-24 px-16 rounded-[40px] bg-[#1e3a8a] hover:bg-[#152e6b] text-white font-black uppercase tracking-widest text-2xl shadow-3xl scale-105 transition-all hover:scale-110 active:scale-95 group"
        >
          <Zap className="mr-4 h-10 w-10 fill-white animate-pulse group-hover:scale-125 transition-transform" />
          PURGER MES ERREURS
        </Button>
      </div>

      <div className="flex justify-center pt-8">
        <Button variant="ghost" asChild className="text-slate-400 font-black uppercase tracking-widest text-[10px] hover:bg-transparent hover:text-[#1e3a8a] group">
          <Link href="/dashboard"><ChevronLeft className="mr-2 h-3 w-3 group-hover:-translate-x-1 transition-transform" /> Retour au Dashboard</Link>
        </Button>
      </div>

      <Dialog open={isPurgeDialogOpen} onOpenChange={setIsPurgeDialogOpen}>
        <DialogContent className="max-w-md rounded-[40px] p-10 border-4 border-[#1e3a8a] shadow-3xl bg-white">
          <DialogHeader className="space-y-4">
            <div className="bg-indigo-50 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto">
              <ListFilter className="h-8 w-8 text-[#1e3a8a]" />
            </div>
            <div className="text-center">
              <DialogTitle className="text-2xl font-black uppercase italic text-slate-900">Type de Purge</DialogTitle>
              <DialogDescription className="font-bold text-slate-500 italic mt-2">
                Quelle banque de questions souhaitez-vous purger ?
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="grid gap-3 py-6">
            <PurgeOption label="TOUTES MES ERREURS" count={stats.total} onClick={() => router.push('/dashboard/kill-mistakes?mode=session&theme=all')} />
            <PurgeOption label="MATRICE MAGIQUE" count={stats.matrix} onClick={() => router.push('/dashboard/kill-mistakes?mode=session&theme=matrix')} />
            <PurgeOption label="PRATIQUE LIBRE" count={stats.practice} onClick={() => router.push('/dashboard/kill-mistakes?mode=session&theme=practice')} />
            <PurgeOption label="SIMULATIONS EXAM" count={stats.exam} onClick={() => router.push('/dashboard/kill-mistakes?mode=session&theme=exam')} />
          </div>

          <DialogFooter>
            <Button variant="ghost" className="w-full font-black uppercase italic text-xs text-slate-400" onClick={() => setIsPurgeDialogOpen(false)}>Annuler</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatMiniCard({ icon: Icon, label, val, color, bg, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="w-full text-left transition-all hover:scale-105 active:scale-95"
    >
      <Card className="rounded-[28px] border-none shadow-lg p-6 bg-white flex flex-col items-center justify-center gap-3 h-full group hover:shadow-xl">
        <div className={cn("p-3 rounded-2xl shadow-inner transition-transform group-hover:rotate-6", bg)}>
          <Icon className={cn("h-6 w-6", color)} />
        </div>
        <div className="text-center">
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 italic">{label}</p>
          <p className={cn("text-3xl font-black italic tracking-tighter leading-none", color)}>{val}</p>
        </div>
      </Card>
    </button>
  );
}

function PurgeOption({ label, count, onClick }: { label: string, count: number, onClick: () => void }) {
  if (count === 0) return null;
  return (
    <Button 
      onClick={onClick}
      variant="outline" 
      className="h-14 justify-between px-6 rounded-2xl border-2 hover:bg-indigo-50 hover:border-indigo-200 group"
    >
      <span className="font-black italic uppercase text-xs text-slate-700">{label}</span>
      <Badge className="bg-indigo-100 text-[#1e3a8a] border-none font-black italic group-hover:bg-[#1e3a8a] group-hover:text-white transition-colors">
        {count} Q
      </Badge>
    </Button>
  );
}
