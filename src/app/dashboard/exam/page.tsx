"use client";

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Trophy, 
  FileQuestion, 
  ChevronRight,
  AlertCircle,
  Play,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { getExamState, clearExamState, type ExamState } from '@/lib/services/exam-state-service';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from 'next/navigation';

const ALL_EXAMS = [
  { id: 'exam1', title: 'Simulation Examen 1', description: 'Examen complet de questions couvrant tous les domaines.' },
  { id: 'exam2', title: 'Simulation Examen 2', description: 'Deuxième examen blanc pour tester votre préparation.' },
  { id: 'exam3', title: 'Simulation Examen 3', description: 'Troisième mise en situation réelle avant l\'examen.' },
  { id: 'exam4', title: 'Simulation Examen 4', description: 'Quatrième test de haut niveau pour affiner vos réflexes.' },
  { id: 'exam5', title: 'Simulation Examen 5', description: 'Ultime simulation pour valider votre certification.' },
];

export default function ExamPage() {
  const { profile, user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  
  const [examCounts, setExamCounts] = useState<Record<string, number>>({});
  const [isCounting, setIsCounting] = useState(true);
  const [activeSim, setActiveSim] = useState<ExamState | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    async function initData() {
      if (!db || isUserLoading || !user) return;
      setIsCounting(true);
      try {
        // 1. Check for active simulation
        const state = await getExamState(db, user.uid);
        setActiveSim(state);

        // 2. Count questions per exam
        const qRef = collection(db, 'questions');
        const counts: Record<string, number> = {};
        for (const exam of ALL_EXAMS) {
          const q = query(qRef, 
            where('sourceIds', 'array-contains', exam.id), 
            where('isActive', '==', true)
          );
          const snap = await getDocs(q);
          counts[exam.id] = snap.size;
        }
        setExamCounts(counts);
      } catch (e) {
        console.error("Error initializing exam page:", e);
      } finally {
        setIsCounting(false);
      }
    }
    initData();
  }, [db, user, isUserLoading]);

  const availableExams = useMemo(() => {
    if (!profile) return [];
    return ALL_EXAMS.filter(exam => {
      const count = examCounts[exam.id] || 0;
      const hasQuestions = count > 0;
      const isPrivileged = profile.role === 'admin' || profile.role === 'super_admin';
      const hasAccess = isPrivileged || (profile.allowedExams && profile.allowedExams.includes(exam.id));
      return hasQuestions && hasAccess;
    });
  }, [profile, examCounts]);

  const handleExamClick = (examId: string) => {
    if (activeSim && activeSim.examId === examId) {
      setShowResumeModal(true);
    } else {
      router.push(`/dashboard/exam/run?id=${examId}`);
    }
  };

  const handleRestart = async () => {
    if (!activeSim || !user) return;
    setIsClearing(true);
    try {
      await clearExamState(db, user.uid);
      router.push(`/dashboard/exam/run?id=${activeSim.examId}`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsClearing(false);
      setShowResumeModal(false);
    }
  };

  const handleResume = () => {
    if (!activeSim) return;
    router.push(`/dashboard/exam/run?id=${activeSim.examId}&resume=true`);
    setShowResumeModal(false);
  };

  if (isUserLoading || isCounting) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <Loader2 className="animate-spin h-12 w-12 text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-10 animate-fade-in">
      <div className="bg-white p-10 rounded-[40px] shadow-xl border-2 border-primary/5 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-8 text-center md:text-left">
          <div className="bg-primary/10 p-5 rounded-3xl">
            <Trophy className="h-12 w-12 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-primary">Simulations d'Examen</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-sm mt-1">Validez vos connaissances dans les conditions réelles du PMP®.</p>
          </div>
        </div>
      </div>

      {availableExams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 bg-white rounded-[40px] shadow-inner border-4 border-dashed border-slate-100">
          <div className="bg-slate-50 p-6 rounded-full">
            <FileQuestion className="h-16 w-16 text-slate-300" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-400 italic uppercase tracking-tight">Aucune simulation prête</h2>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest italic max-w-md mx-auto">
              Les examens n'apparaîtront ici que s'ils contiennent des questions dans la banque (Base Examens).
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {availableExams.map((exam) => {
            const isProgress = activeSim?.examId === exam.id;
            return (
              <Card 
                key={exam.id} 
                className={cn(
                  "rounded-[40px] border-4 transition-all relative overflow-hidden group cursor-pointer",
                  isProgress 
                    ? "bg-amber-50/50 border-amber-200 shadow-amber-100 shadow-xl" 
                    : "bg-white border-white shadow-xl hover:border-primary/20"
                )}
                onClick={() => handleExamClick(exam.id)}
              >
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Trophy className="h-20 w-20" />
                </div>
                
                <CardHeader className="p-8 pb-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className={cn(
                      "h-14 w-14 rounded-2xl flex items-center justify-center shadow-inner",
                      isProgress ? "bg-amber-100 text-amber-600" : "bg-indigo-50 text-indigo-600"
                    )}>
                      <FileQuestion className="h-7 w-7" />
                    </div>
                    {isProgress && (
                      <Badge className="bg-amber-500 text-white border-none font-black italic text-[10px] animate-pulse">
                        EXAMEN EN COURS ⚠️
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-2xl font-black uppercase italic tracking-tight leading-tight pr-10">{exam.title}</CardTitle>
                  <div className="flex items-center gap-3 pt-1">
                    <Badge className={cn(
                      "border-none font-black italic px-3 py-1.5 shadow-sm",
                      isProgress ? "bg-amber-200 text-amber-700" : "bg-emerald-100 text-emerald-600"
                    )}>
                      {examCounts[exam.id] || 0} QUESTIONS
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="p-8 pt-0">
                  <p className="text-sm font-bold italic text-slate-500 leading-relaxed min-h-[60px]">
                    {exam.description}
                  </p>
                  
                  <Button 
                    className={cn(
                      "w-full h-14 rounded-2xl mt-6 font-black uppercase tracking-widest text-sm shadow-lg",
                      isProgress ? "bg-amber-500 hover:bg-amber-600" : "bg-primary hover:bg-primary/90"
                    )}
                  >
                    {isProgress ? "REPRENDRE L'EXAMEN" : "LANCER LA SIMULATION"} <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-[32px] flex items-start gap-4 animate-slide-up">
        <AlertCircle className="h-6 w-6 text-amber-600 shrink-0" />
        <div>
          <h4 className="font-black uppercase italic text-amber-800 text-sm">Sauvegarde automatique</h4>
          <p className="text-xs font-bold text-amber-700/80 italic mt-1">
            Votre progression est sauvegardée en temps réel. Vous pouvez quitter la page et reprendre votre examen là où vous l'avez laissé.
          </p>
        </div>
      </div>

      <Dialog open={showResumeModal} onOpenChange={setShowResumeModal}>
        <DialogContent className="rounded-[40px] p-10 border-4 shadow-3xl max-w-lg">
          <DialogHeader className="space-y-4">
            <div className="bg-amber-100 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
            <div className="text-center">
              <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">Simulation en cours</DialogTitle>
              <DialogDescription className="text-lg font-bold text-slate-500 italic mt-2">
                Vous avez déjà une session active pour cet examen.
              </DialogDescription>
            </div>
          </DialogHeader>
          
          <div className="bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-200 my-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-[10px] font-black uppercase text-slate-400">Progression</p>
                <p className="text-2xl font-black italic text-primary">Q{ (activeSim?.currentIndex || 0) + 1 }</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black uppercase text-slate-400">Temps restant</p>
                <p className="text-2xl font-black italic text-primary">
                  {Math.floor((activeSim?.timeLeft || 0) / 60)}m
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-4 sm:justify-center">
            <Button 
              variant="outline" 
              onClick={handleRestart}
              disabled={isClearing}
              className="h-14 flex-1 rounded-2xl border-2 font-black uppercase italic text-xs tracking-widest text-slate-500"
            >
              {isClearing ? <Loader2 className="animate-spin h-4 w-4" /> : <RotateCcw className="h-4 w-4 mr-2" />}
              Recommencer
            </Button>
            <Button 
              onClick={handleResume}
              className="h-14 flex-1 rounded-2xl bg-primary hover:bg-primary/90 font-black uppercase italic text-xs tracking-widest shadow-xl"
            >
              <Play className="h-4 w-4 mr-2 fill-white" />
              Continuer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
