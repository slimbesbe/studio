
"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  RotateCcw,
  ChevronRight
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const DOMAINS = [
  { id: 'People', label: 'People' },
  { id: 'Process', label: 'Process' },
  { id: 'Business', label: 'Business Environment' }
];

const APPROACHES = [
  { id: 'Predictive', label: 'PREDICTIVE' },
  { id: 'Agile', label: 'AGILE' },
  { id: 'Hybrid', label: 'HYBRID' }
];

export default function MatriceMagiquePage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();

  const attemptsQuery = useMemoFirebase(() => {
    if (isUserLoading || !user?.uid) return null;
    return query(collection(db, 'coachingAttempts'), where('userId', '==', user.uid));
  }, [db, user?.uid, isUserLoading]);

  const { data: attempts, isLoading } = useCollection(attemptsQuery);

  const matriceStats = useMemo(() => {
    const stats: Record<string, { score: number, count: number }> = {};
    
    attempts?.forEach(att => {
      // On analyse les réponses détaillées pour peupler la matrice
      att.responses?.forEach((resp: any) => {
        let d = resp.tags?.domain;
        let a = resp.tags?.approach;
        
        // Normalisation
        if (d === 'Processus') d = 'Process';
        
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

  const getCellStyles = (percent: number | null) => {
    if (percent === null) return "bg-[#F8FAFC] border-[#E2E8F0] text-slate-300";
    if (percent >= 80) return "bg-emerald-50 border-emerald-500 text-emerald-600";
    if (percent >= 60) return "bg-orange-50 border-orange-400 text-orange-500";
    return "bg-red-50 border-red-500 text-red-600";
  };

  const getProgressColor = (percent: number | null) => {
    if (percent === null) return "bg-slate-200";
    if (percent >= 80) return "bg-emerald-500";
    if (percent >= 60) return "bg-orange-400";
    return "bg-red-500";
  };

  if (isUserLoading || isLoading) {
    return <div className="h-[70vh] flex items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;
  }

  return (
    <div className="space-y-10 animate-fade-in pb-20 max-w-7xl mx-auto px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">Matrice Magique</h1>
          <p className="text-slate-500 font-bold text-sm max-w-2xl leading-relaxed italic">
            Cliquez sur une cellule pour lancer un sprint de 5 questions. L'objectif est d'obtenir du vert partout (score &gt; 80%).
          </p>
        </div>
        <Button variant="outline" className="h-10 px-4 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest text-red-500 hover:bg-red-50 gap-2 shadow-sm">
          <RotateCcw className="h-3 w-3" /> Réinitialiser
        </Button>
      </div>

      <Card className="rounded-[40px] border-none shadow-2xl bg-white p-12 lg:p-20 overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Legend Columns */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            <div />
            {APPROACHES.map(a => (
              <div key={a.id} className="text-center">
                <p className="text-[11px] font-black uppercase text-slate-500 tracking-[0.2em] italic">{a.label}</p>
              </div>
            ))}
          </div>

          {/* Matrix Rows */}
          {DOMAINS.map(d => (
            <div key={d.id} className="grid grid-cols-4 gap-6 mb-6">
              {/* Row Label */}
              <div className="flex items-center justify-end pr-8">
                <p className="text-xs font-black uppercase text-slate-600 italic tracking-widest text-right">{d.label}</p>
              </div>

              {/* Cells */}
              {APPROACHES.map(a => {
                const key = `${d.id}-${a.id}`;
                const data = matriceStats[key];
                const percent = data ? Math.round((data.score / data.count) * 100) : null;
                const styles = getCellStyles(percent);

                return (
                  <Link 
                    key={key} 
                    href={`/dashboard/matrice/sprint?domain=${d.id}&approach=${a.id}`}
                    className={cn(
                      "aspect-[16/10] rounded-[24px] border-4 transition-all duration-300 flex flex-col items-center justify-center relative group overflow-hidden hover:scale-105 hover:shadow-xl",
                      styles
                    )}
                  >
                    <div className="flex flex-col items-center justify-center flex-1 py-4">
                      {percent !== null ? (
                        <>
                          <span className="text-4xl font-black italic tracking-tighter leading-none">{data.score}/{data.count}</span>
                          <span className="text-xs font-black uppercase mt-2 opacity-80">{percent}%</span>
                        </>
                      ) : (
                        <>
                          <span className="text-3xl font-black italic tracking-tighter opacity-40">---</span>
                          <span className="text-[10px] font-black uppercase mt-2 opacity-40 italic">Non testé</span>
                        </>
                      )}
                    </div>

                    {/* Progress Bar at bottom */}
                    <div className="absolute bottom-0 left-0 w-full h-2 bg-slate-100/50">
                      <div 
                        className={cn("h-full transition-all duration-1000", getProgressColor(percent))}
                        style={{ width: `${percent || 0}%` }}
                      />
                    </div>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors" />
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
