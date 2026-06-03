
"use client";

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  ChevronLeft,
  LayoutGrid,
  BookOpen,
  GraduationCap,
  ArrowRight,
  TrendingDown,
  Zap,
  Loader2,
  ListFilter,
  Check
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
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [selectedCount, setSelectedCount] = useState<number>(10);

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
      practice: mistakes.filter(m => !m.sourceType || m.sourceType === 'practice' || m.sourceType === 'training').length,
      exams: mistakes.filter(m => m.sourceType === 'exams').length,
    };
  }, [mistakes]);

  const handleStartPurge = () => {
    if (!selectedTheme) return;
    router.push(`/dashboard/kill-mistakes?mode=session&theme=${selectedTheme}&count=${selectedCount}`);
    setIsPurgeDialogOpen(false);
  };

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
              val={stats.exams} 
              color="text-amber-600" 
              bg="bg-amber-50"
              onClick={() => router.push('/dashboard/kill-mistakes?mode=analyze&theme=exams')}
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
          onClick={() => {
            setSelectedTheme(null);
            setIsPurgeDialogOpen(true);
          }}
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
        <DialogContent className="max-w-md rounded-[40px] p-0 border-4 border-[#1e3a8a] shadow-3xl bg-white overflow-hidden">
          <DialogHeader className="p-10 pb-0 space-y-6">
            <div className="bg-indigo-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <ListFilter className="h-10 w-10 text-[#1e3a8a]" />
            </div>
            <div className="text-center space-y-2">
              <DialogTitle className="text-3xl font-black uppercase italic text-slate-900 tracking-tighter">
                {!selectedTheme ? "TYPE DE PURGE" : "NOMBRE DE QUESTIONS"}
              </DialogTitle>
              <DialogDescription className="font-bold text-slate-500 italic text-sm leading-relaxed px-4">
                {!selectedTheme ? "Quelle banque de questions souhaitez-vous purger ?" : "Combien de questions voulez-vous refaire ?"}
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="p-10 pt-6">
            {!selectedTheme ? (
              <div className="grid gap-4">
                <PurgeOption label="MATRICE MAGIQUE" count={stats.matrix} onClick={() => setSelectedTheme('matrix')} />
                <PurgeOption label="PRATIQUE LIBRE" count={stats.practice} onClick={() => setSelectedTheme('practice')} />
                <PurgeOption label="SIMULATIONS EXAM" count={stats.exams} onClick={() => setSelectedTheme('exams')} />
              </div>
            ) : (
              <div className="space-y-6 animate-slide-up">
                <div className="grid grid-cols-3 gap-3">
                  {[5, 10, 20, 50].map((num) => (
                    <Button 
                      key={num}
                      variant="outline"
                      className={cn(
                        "h-14 rounded-xl border-2 font-black italic",
                        selectedCount === num ? "border-[#1e3a8a] bg-blue-50 text-[#1e3a8a]" : "border-slate-100"
                      )}
                      onClick={() => setSelectedCount(num)}
                    >
                      {num}
                    </Button>
                  ))}
                  <Button 
                    variant="outline"
                    className={cn(
                      "h-14 rounded-xl border-2 font-black italic",
                      selectedCount === 0 ? "border-[#1e3a8a] bg-blue-50 text-[#1e3a8a]" : "border-slate-100"
                    )}
                    onClick={() => setSelectedCount(0)}
                  >
                    TOUT
                  </Button>
                </div>
                
                <Button 
                  onClick={handleStartPurge}
                  className="w-full h-16 rounded-2xl bg-[#1e3a8a] hover:bg-[#152e6b] text-white font-black uppercase italic tracking-widest shadow-xl"
                >
                  LANCER LE TEST <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                
                <button 
                  onClick={() => setSelectedTheme(null)}
                  className="w-full text-center text-[10px] font-black uppercase italic text-slate-400 hover:text-slate-600"
                >
                  RETOUR AU CHOIX DU TYPE
                </button>
              </div>
            )}
          </div>

          <DialogFooter className="bg-slate-50 p-6 flex justify-center">
            <Button variant="ghost" className="font-black uppercase italic text-[10px] tracking-widest text-slate-400 hover:bg-transparent" onClick={() => setIsPurgeDialogOpen(false)}>ANNULER</Button>
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
  return (
    <Button 
      onClick={onClick}
      variant="outline" 
      disabled={count === 0}
      className="h-16 justify-between px-8 rounded-2xl border-2 border-slate-100 bg-slate-50/50 hover:bg-indigo-50 hover:border-indigo-200 transition-all group disabled:opacity-30"
    >
      <span className="font-black italic uppercase text-xs text-slate-700 tracking-tight">{label}</span>
      <Badge className="bg-indigo-100 text-[#1e3a8a] border-none font-black italic text-xs px-3 py-1 rounded-full group-hover:bg-[#1e3a8a] group-hover:text-white transition-colors">
        {count} Q
      </Badge>
    </Button>
  );
}
