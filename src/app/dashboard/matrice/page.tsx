
"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  RotateCcw,
  ChevronRight,
  LayoutGrid,
  Info
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, writeBatch, doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

const DOMAINS = [
  { id: 'People', label: 'People' },
  { id: 'Process', label: 'Processus' },
  { id: 'Business', label: 'Business Environment' }
];

const APPROACHES = [
  { id: 'Predictive', label: 'WATERFALL' },
  { id: 'Agile', label: 'AGILE' },
  { id: 'Hybrid', label: 'HYBRIDE' }
];

export default function MatriceMagiquePage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [isResetting, setIsResetting] = useState(false);

  const configRef = useMemoFirebase(() => doc(db, 'config', 'matrice'), [db]);
  const { data: config } = useDoc(configRef);
  const successThreshold = Number(config?.successThreshold) || 80;

  const attemptsQuery = useMemoFirebase(() => {
    if (isUserLoading || !user?.uid) return null;
    return query(
      collection(db, 'coachingAttempts'), 
      where('userId', '==', user.uid),
      where('context', '==', 'matrix_sprint')
    );
  }, [db, user?.uid, isUserLoading]);

  const { data: attempts, isLoading } = useCollection(attemptsQuery);

  const matriceStats = useMemo(() => {
    const stats: Record<string, { totalScore: number, attemptsCount: number }> = {};
    
    if (Array.isArray(attempts)) {
      attempts.filter(Boolean).forEach(att => {
        const d = att.matrixDomain;
        const a = att.matrixApproach;
        
        if (d && a) {
          const key = `${d}-${a}`;
          if (!stats[key]) stats[key] = { totalScore: 0, attemptsCount: 0 };
          stats[key].attemptsCount++;
          stats[key].totalScore += (Number(att.scorePercent) || 0);
        }
      });
    }

    return stats;
  }, [attempts]);

  const handleReset = async () => {
    if (!attempts || attempts.length === 0) return;
    if (!confirm("Voulez-vous vraiment réinitialiser vos scores de la matrice ?")) return;
    
    setIsResetting(true);
    try {
      const batch = writeBatch(db);
      attempts.forEach((a) => {
        batch.delete(doc(db, 'coachingAttempts', a.id));
      });
      await batch.commit();
      toast({ title: "La matrice a été réinitialisée." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message });
    } finally {
      setIsResetting(false);
    }
  };

  const getCellStyles = (percent: number | null) => {
    if (percent === null) return "bg-[#F8FAFC] border-[#E2E8F0] text-slate-300";
    if (percent >= successThreshold) return "bg-emerald-50 border-emerald-500 text-emerald-600";
    if (percent >= successThreshold - 20) return "bg-orange-50 border-orange-400 text-orange-500";
    return "bg-red-50 border-red-500 text-red-600";
  };

  const getProgressColor = (percent: number | null) => {
    if (percent === null) return "bg-slate-200";
    if (percent >= successThreshold) return "bg-emerald-500";
    if (percent >= successThreshold - 20) return "bg-orange-400";
    return "bg-red-500";
  };

  if (isUserLoading || isLoading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;
  }

  return (
    <div className="flex-1 flex flex-col h-full w-full overflow-hidden animate-fade-in p-[2vh] gap-[2vh] bg-background">
      <header className="flex-none flex justify-between items-end px-4 h-[6vh]">
        <div className="flex flex-col">
          <h1 className="text-[clamp(1.2rem,3.5vh,2.5rem)] font-black italic uppercase tracking-tighter text-slate-900 leading-none">Matrice Magique</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[clamp(0.5rem,1.2vh,0.8rem)] italic leading-none mt-1">Ciblez vos faiblesses • Seuil de maîtrise : {successThreshold}%</p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleReset}
          disabled={isResetting || !attempts || attempts.length === 0}
          className="h-[5vh] px-4 rounded-xl border-2 font-black uppercase text-[1vh] text-red-500 hover:bg-red-50 gap-2"
        >
          {isResetting ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />} 
          Reset Scores
        </Button>
      </header>

      <Card className="flex-1 rounded-[4vh] border-none shadow-2xl bg-white p-[4vh] overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Header Grille */}
          <div className="grid grid-cols-4 gap-[2vh] mb-[2vh] flex-none">
            <div />
            {APPROACHES.map(a => (
              <div key={a.id} className="text-center">
                <p className="text-[1.2vh] font-black uppercase text-slate-400 tracking-[0.2em] italic">{a.label}</p>
              </div>
            ))}
          </div>

          {/* Corps Grille */}
          <div className="flex-1 grid grid-rows-3 gap-[2vh]">
            {DOMAINS.map(d => (
              <div key={d.id} className="grid grid-cols-4 gap-[2vh]">
                <div className="flex items-center justify-end pr-[2vw]">
                  <p className="text-[1.4vh] font-black uppercase text-slate-600 italic tracking-widest text-right leading-tight">{d.label}</p>
                </div>

                {APPROACHES.map(a => {
                  const key = `${d.id}-${a.id}`;
                  const data = matriceStats[key];
                  const percent = data && data.attemptsCount > 0 ? Math.round((data.totalScore / data.attemptsCount)) : null;
                  const styles = getCellStyles(percent);

                  return (
                    <Link 
                      key={key} 
                      href={`/dashboard/matrice/sprint?domain=${d.id}&approach=${a.id}`}
                      className={cn(
                        "rounded-[2.5vh] border-4 transition-all duration-300 flex flex-col items-center justify-center relative group overflow-hidden hover:scale-[1.02] hover:shadow-lg text-center px-4",
                        styles
                      )}
                    >
                      {percent !== null ? (
                        <>
                          <span className="text-[3vh] font-black italic tracking-tighter leading-none mb-1">
                            {data.attemptsCount} {data.attemptsCount > 1 ? 'tentatives' : 'tentative'}
                          </span>
                          <span className="text-[1.2vh] font-black uppercase opacity-80">{percent}% en moyenne</span>
                        </>
                      ) : (
                        <div className="flex flex-col items-center opacity-30">
                          <LayoutGrid className="h-[3vh] w-[3vh] mb-[0.5vh]" />
                          <span className="text-[0.9vh] font-black uppercase italic">Start</span>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 w-full h-[0.8vh] bg-slate-100/50">
                        <div className={cn("h-full transition-all duration-1000", getProgressColor(percent))} style={{ width: `${percent || 0}%` }} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
