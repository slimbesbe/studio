
"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutGrid, 
  ChevronRight, 
  Target, 
  Zap, 
  Loader2, 
  CheckCircle2,
  Info,
  Trophy
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const DOMAINS = ['People', 'Process', 'Business'];
const APPROACHES = ['Predictive', 'Agile', 'Hybrid'];

export default function MatriceMagiquePage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  const attemptsQuery = useMemoFirebase(() => {
    if (isUserLoading || !user?.uid) return null;
    return query(collection(db, 'coachingAttempts'), where('userId', '==', user.uid));
  }, [db, user?.uid, isUserLoading]);

  const { data: attempts, isLoading } = useCollection(attemptsQuery);

  const matriceStats = useMemo(() => {
    const stats: Record<string, { score: number, count: number }> = {};
    
    attempts?.forEach(att => {
      // Pour une matrice magique réelle, on analyserait les réponses détaillées
      // Ici on simule par rapport aux tags des sessions
      att.responses?.forEach((resp: any) => {
        const d = resp.tags?.domain;
        const a = resp.tags?.approach;
        if (d && a) {
          const key = `${d}-${a}`;
          if (!stats[key]) stats[key] = { score: 0, count: 0 };
          stats[key].count++;
          if (resp.isCorrect) stats[key].score++;
        }
      });
    });

    return stats;
  }, [attempts]);

  const getCellData = (domain: string, approach: string) => {
    const key = `${domain}-${approach}`;
    const data = matriceStats[key];
    if (!data) return { score: 0, count: 0, color: 'bg-slate-50' };
    
    const percent = Math.round((data.score / data.count) * 100);
    let color = 'bg-red-50 text-red-600 border-red-100';
    if (percent >= 75) color = 'bg-emerald-50 text-emerald-600 border-emerald-100';
    else if (percent >= 50) color = 'bg-indigo-50 text-indigo-600 border-indigo-100';
    
    return { score: percent, count: data.count, color };
  };

  if (isUserLoading || isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-indigo-600" /></div>;

  return (
    <div className="space-y-10 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-10 rounded-[40px] shadow-xl border-2">
        <div className="flex items-center gap-6">
          <div className="bg-indigo-500/10 p-4 rounded-3xl">
            <LayoutGrid className="h-10 w-10 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">Matrice Magique</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2 italic">Pilotez votre réussite par segment de performance.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <Card className="rounded-[48px] border-none shadow-2xl bg-white p-12 overflow-hidden">
            <div className="grid grid-cols-4 gap-6">
              <div />
              {APPROACHES.map(a => (
                <div key={a} className="text-center">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">{a === 'Predictive' ? 'Waterfall' : a}</p>
                </div>
              ))}

              {DOMAINS.map(d => (
                <>
                  <div key={d} className="flex items-center justify-end pr-4">
                    <p className="text-xs font-black uppercase text-slate-900 italic tracking-tight">{d === 'Process' ? 'Processus' : d}</p>
                  </div>
                  {APPROACHES.map(a => {
                    const cell = getCellData(d, a);
                    const key = `${d}-${a}`;
                    return (
                      <div 
                        key={key}
                        onMouseEnter={() => setHoveredCell(key)}
                        onMouseLeave={() => setHoveredCell(null)}
                        className={cn(
                          "aspect-square rounded-[32px] border-4 transition-all duration-300 flex flex-col items-center justify-center relative group cursor-pointer",
                          cell.color,
                          hoveredCell === key ? "scale-105 shadow-2xl z-10" : "shadow-sm border-transparent"
                        )}
                      >
                        <span className="text-4xl font-black italic tracking-tighter">{cell.score}%</span>
                        <span className="text-[8px] font-bold uppercase tracking-widest opacity-60">{cell.count} items</span>
                        
                        {hoveredCell === key && (
                          <Button asChild size="sm" className="absolute -bottom-4 bg-slate-900 text-white rounded-full font-black uppercase text-[8px] h-8 px-4 animate-slide-up">
                            <Link href={`/dashboard/practice?domain=${d}&approach=${a}`}>Sprint 5Q <ChevronRight className="ml-1 h-3 w-3" /></Link>
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[40px] border-none shadow-xl bg-slate-900 text-white p-8 space-y-6">
            <h3 className="font-black italic uppercase text-xs tracking-widest text-indigo-400">Comment ça marche ?</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-black shrink-0">1</div>
                <p className="text-[11px] font-bold italic text-slate-400">La matrice analyse vos réponses par croisement Domaine x Approche.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-black shrink-0">2</div>
                <p className="text-[11px] font-bold italic text-slate-400">Le score indique votre niveau de maîtrise sur ce segment spécifique.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-black shrink-0">3</div>
                <p className="text-[11px] font-bold italic text-slate-400">Cliquez sur une case pour lancer un entraînement ciblé de 5 questions.</p>
              </div>
            </div>
          </Card>

          <Card className="rounded-[40px] border-none shadow-xl bg-white p-8 space-y-4">
            <div className="flex items-center gap-3 text-emerald-600">
              <Trophy className="h-5 w-5" />
              <h4 className="font-black uppercase italic text-xs tracking-tight">Objectif Readiness</h4>
            </div>
            <p className="text-[11px] font-bold italic text-slate-500 leading-relaxed">
              Pour être considéré "Prêt pour l'examen", chaque case de la matrice doit afficher au moins <span className="text-emerald-600 font-black">75%</span>.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
