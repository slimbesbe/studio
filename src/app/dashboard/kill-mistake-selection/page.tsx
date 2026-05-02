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
  Play,
  LayoutGrid,
  BookOpen,
  GraduationCap
} from 'lucide-react';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

export default function KillMistakeSelectionPage() {
  const { user } = useUser();
  const db = useFirestore();
  
  const mistakesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, 'users', user.uid, 'killMistakes'), where('status', '==', 'wrong'));
  }, [db, user]);

  const { data: mistakes } = useCollection(mistakesQuery);

  const stats = useMemo(() => {
    const list = mistakes || [];
    const byTheme: Record<string, number> = { 'matrix': 0, 'practice': 0, 'exam': 0 };
    list.forEach(m => {
      const type = m.sourceType || 'practice';
      if (byTheme[type] !== undefined) byTheme[type]++;
      else byTheme['practice']++;
    });
    return { total: list.length, byTheme };
  }, [mistakes]);

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-fade-in py-8 px-4">
      <div className="flex items-center gap-4">
        <div className="bg-amber-500 p-3 rounded-2xl shadow-lg">
          <Brain className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-black text-primary italic uppercase tracking-tighter">KILL MISTAKE STRATEGY</h1>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs italic">Purgez vos erreurs par thématique</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <ThemeStatCard icon={Target} label="TOTAL ERREURS" val={stats.total} color="bg-indigo-50 text-primary border-primary/20" />
        <ThemeStatCard icon={LayoutGrid} label="MATRICE MAGIQUE" val={stats.byTheme.matrix} color="bg-emerald-50 text-emerald-600 border-emerald-100" />
        <ThemeStatCard icon={BookOpen} label="PRATIQUE LIBRE" val={stats.byTheme.practice} color="bg-indigo-50 text-indigo-600 border-indigo-100" />
        <ThemeStatCard icon={GraduationCap} label="SIMULATIONS EXAM" val={stats.byTheme.exam} color="bg-amber-50 text-amber-600 border-amber-100" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="rounded-[48px] border-none shadow-2xl bg-white p-12 space-y-8 group hover:scale-[1.02] transition-all">
          <div className="bg-indigo-50 w-20 h-20 rounded-[32px] flex items-center justify-center mx-auto shadow-inner">
            <Search className="h-10 w-10 text-primary" />
          </div>
          <div className="text-center space-y-4">
            <h3 className="text-3xl font-black uppercase italic tracking-tighter">1/ Mode Analyse</h3>
            <p className="text-slate-500 font-bold italic leading-relaxed text-sm px-4">
              Parcourez votre base d'erreurs par thème pour comprendre les justifications du Mindset PMI®.
            </p>
          </div>
          <Button asChild variant="outline" className="w-full h-16 rounded-[24px] border-4 border-primary/20 text-primary font-black uppercase tracking-widest text-lg shadow-xl">
            <Link href="/dashboard/kill-mistakes?mode=analyze">Explorer les thèmes</Link>
          </Button>
        </Card>

        <Card className="rounded-[48px] border-none shadow-2xl bg-primary p-12 space-y-8 group hover:scale-[1.02] transition-all text-white">
          <div className="bg-white/10 w-20 h-20 rounded-[32px] flex items-center justify-center mx-auto shadow-inner">
            <Play className="h-10 w-10 fill-white" />
          </div>
          <div className="text-center space-y-4">
            <h3 className="text-3xl font-black uppercase italic tracking-tighter">2/ Mode Action</h3>
            <p className="text-white/70 font-bold italic leading-relaxed text-sm px-4">
              Lancez une session chronométrée pour corriger vos erreurs et les faire disparaître de la base.
            </p>
          </div>
          <Button asChild className="w-full h-16 rounded-[24px] bg-white text-primary hover:bg-slate-50 font-black uppercase tracking-widest text-lg shadow-xl">
            <Link href="/dashboard/kill-mistakes?mode=session">Lancer une session</Link>
          </Button>
        </Card>
      </div>

      <div className="flex justify-center pt-8">
        <Button variant="ghost" asChild className="text-slate-400 font-black uppercase tracking-widest text-[10px] hover:bg-transparent hover:text-primary">
          <Link href="/dashboard"><ChevronLeft className="mr-2 h-3 w-3" /> Retour au Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}

function ThemeStatCard({ icon: Icon, label, val, color }: any) {
  return (
    <Card className={cn("rounded-[32px] p-6 border-2 flex flex-col items-center justify-center text-center gap-3 transition-all hover:shadow-lg", color)}>
      <Icon className="h-6 w-6 opacity-60" />
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
        <p className="text-4xl font-black italic tracking-tighter">{val}</p>
      </div>
    </Card>
  );
}
