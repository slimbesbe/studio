/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, doc, addDoc, serverTimestamp, increment, setDoc, getDoc } from 'firebase/firestore';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Flag, 
  CheckCircle2, 
  AlertTriangle,
  Trophy,
  LayoutGrid,
  Coffee
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

function ExamRunContent() {
  const { user, profile } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const examId = searchParams.get('id');
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(230 * 60); 
  const [isStarted, setIsStarted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showReviewGrid, setShowReviewGrid] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  
  // Pause management
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakTimeLeft, setBreakTimeLeft] = useState(10 * 60);

  useEffect(() => {
    async function fetchQuestions() {
      if (!examId) return;
      setIsLoading(true);
      try {
        const qRef = collection(db, 'questions');
        const qQuery = query(qRef, where('examId', '==', examId), where('isActive', '==', true));
        const snap = await getDocs(qQuery);
        
        const fetched = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        // Sort by index if available, otherwise stay as is
        fetched.sort((a, b) => (a.index || 0) - (b.index || 0));
        
        if (fetched.length === 0) {
          toast({ variant: "destructive", title: "Examen vide", description: "Aucune question n'a été trouvée pour cet examen." });
          router.push('/dashboard/exam');
          return;
        }

        setQuestions(fetched);
      } catch (e) {
        console.error(e);
        toast({ variant: "destructive", title: "Erreur", description: "Impossible de charger les questions." });
      } finally {
        setIsLoading(false);
      }
    }
    fetchQuestions();
  }, [db, examId]);

  useEffect(() => {
    let timer: any;
    if (isStarted && !result && !isOnBreak && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isStarted && !result) {
      handleSubmit();
    }
    return () => clearInterval(timer);
  }, [isStarted, result, timeLeft, isOnBreak]);

  useEffect(() => {
    let breakTimer: any;
    if (isOnBreak && breakTimeLeft > 0) {
      breakTimer = setInterval(() => {
        setBreakTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (breakTimeLeft === 0 && isOnBreak) {
      setIsOnBreak(false);
    }
    return () => clearInterval(breakTimer);
  }, [isOnBreak, breakTimeLeft]);

  const formatMMSS = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleOptionSelect = (questionId: string, optionId: string, isMultiple: boolean) => {
    setAnswers(prev => {
      const current = prev[questionId] || [];
      if (isMultiple) {
        return {
          ...prev,
          [questionId]: current.includes(optionId) 
            ? current.filter(id => id !== optionId)
            : [...current, optionId]
        };
      } else {
        return { ...prev, [questionId]: [optionId] };
      }
    });
  };

  const toggleFlag = (questionId: string) => {
    setFlagged(prev => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const nextQuestion = () => {
    const nextIdx = currentIndex + 1;
    // Check for break points at 60 and 120
    if (nextIdx === 60 || nextIdx === 120) {
      setIsOnBreak(true);
      setBreakTimeLeft(10 * 60);
    }
    setCurrentIndex(Math.min(questions.length - 1, nextIdx));
  };

  const getPerformanceLevel = (percent: number) => {
    if (percent >= 80) return "Above Target";
    if (percent >= 70) return "Target";
    if (percent >= 60) return "Below Target";
    return "Needs Improvement";
  };

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    setIsConfirmOpen(false);
    
    let correctCount = 0;
    const details = questions.map(q => {
      const userAns = answers[q.id] || [];
      let correctAns: string[] = [];
      if (Array.isArray(q.correctOptionIds)) {
        correctAns = q.correctOptionIds;
      } else if (q.correctChoice) {
        correctAns = [String(q.correctChoice)];
      }

      const isCorrect = userAns.length > 0 && 
                        userAns.length === correctAns.length && 
                        userAns.every(val => correctAns.includes(val));
      
      if (isCorrect) correctCount++;
      return { id: q.id, isCorrect, userAns };
    });

    const scorePercent = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
    const timeSpent = (230 * 60) - timeLeft;
    const performance = getPerformanceLevel(scorePercent);

    try {
      const resultData = {
        examId,
        userId: user.uid,
        score: correctCount,
        total: questions.length,
        percentage: scorePercent,
        performance,
        timeSpent,
        completedAt: serverTimestamp(),
        details
      };

      await addDoc(collection(db, 'users', user.uid, 'exam_results'), resultData);
      
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const currentSims = userData.simulationsCount || 0;
        const currentAvg = userData.averageScore || 0;
        const newSims = currentSims + 1;
        const newAvg = Math.round(((currentAvg * currentSims) + scorePercent) / newSims);
        
        await setDoc(userRef, {
          simulationsCount: newSims,
          averageScore: newAvg,
          totalTimeSpent: increment(timeSpent),
          lastLoginAt: serverTimestamp()
        }, { merge: true });
      }

      setResult(resultData);
      toast({ title: "Examen terminé !" });
    } catch (e) {
      console.error("Error saving result:", e);
      toast({ variant: "destructive", title: "Erreur", description: "Échec de l'enregistrement du score." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  if (!isStarted && !result) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 space-y-8 animate-fade-in">
        <Card className="rounded-[40px] border-none shadow-2xl p-16 text-center space-y-10 bg-white">
          <div className="bg-primary/10 h-24 w-24 rounded-[32px] flex items-center justify-center mx-auto shadow-inner">
            <Trophy className="h-12 w-12 text-primary" />
          </div>
          <div className="space-y-4">
            <h1 className="text-5xl font-black italic uppercase tracking-tighter text-slate-900">Prêt pour l'examen ?</h1>
            <p className="text-xl font-bold text-slate-500 italic max-w-xl mx-auto">
              Simulation pour <strong>{examId?.replace('exam', 'Examen ')}</strong>. 
              {questions.length} questions basées sur votre banque.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 bg-slate-50 p-8 rounded-3xl border-2 border-dashed">
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Temps imparti</p>
              <p className="text-3xl font-black italic text-primary">230:00</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Questions</p>
              <p className="text-3xl font-black italic text-primary">{questions.length}</p>
            </div>
          </div>
          <Button onClick={() => setIsStarted(true)} size="lg" className="h-20 px-16 rounded-[28px] bg-primary hover:bg-primary/90 text-2xl font-black uppercase tracking-widest shadow-xl scale-105 transition-transform">
            COMMENCER MAINTENANT
          </Button>
        </Card>
      </div>
    );
  }

  if (result) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-10 animate-fade-in px-4">
        <h1 className="text-5xl font-black italic uppercase tracking-tighter text-primary">Résultat Final</h1>
        <Card className="rounded-[40px] shadow-2xl border-none p-12 space-y-8 bg-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5"><Trophy className="h-32 w-32" /></div>
          <div className="space-y-2">
            <span className={cn("text-8xl font-black italic tracking-tighter", result.percentage >= 75 ? "text-emerald-500" : "text-red-500")}>
              {result.percentage}%
            </span>
            <div className="mt-2">
               <Badge className={cn(
                 "text-lg px-6 py-1 font-black uppercase italic rounded-xl",
                 result.performance === 'Above Target' ? "bg-emerald-500" : 
                 result.performance === 'Target' ? "bg-blue-500" : 
                 result.performance === 'Below Target' ? "bg-amber-500" : "bg-red-500"
               )}>
                 {result.performance}
               </Badge>
            </div>
            <p className="text-xl font-black text-slate-400 uppercase tracking-widest italic mt-4">{result.score} / {result.total} Points</p>
          </div>
          <div className="flex items-center justify-center gap-6 text-slate-500 font-bold italic border-y-2 border-dashed py-6">
            <div className="flex items-center gap-2"><Clock className="h-5 w-5" /> {formatMMSS(result.timeSpent)}</div>
            <div className="flex items-center gap-2"><Trophy className="h-5 w-5" /> {examId?.replace('exam', 'Exam ')}</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="h-16 rounded-2xl border-4 font-black uppercase tracking-widest text-lg italic" asChild>
              <Link href="/dashboard/history">Historique</Link>
            </Button>
            <Button className="h-16 rounded-2xl bg-primary font-black uppercase tracking-widest shadow-xl text-lg italic" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (isOnBreak) {
    return (
      <div className="max-w-2xl mx-auto py-24 px-4 text-center animate-fade-in">
        <Card className="rounded-[40px] shadow-2xl p-16 space-y-8 bg-white border-4 border-indigo-100">
          <div className="bg-indigo-50 h-20 w-20 rounded-full flex items-center justify-center mx-auto">
            <Coffee className="h-10 w-10 text-indigo-600" />
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl font-black italic uppercase tracking-tighter text-indigo-600">Temps de Pause</h2>
            <p className="text-slate-500 font-bold italic">Prenez 10 minutes pour souffler. La prochaine partie commencera après.</p>
          </div>
          <div className="text-6xl font-black italic tabular-nums text-slate-800">
            {formatMMSS(breakTimeLeft)}
          </div>
          <Button onClick={() => setIsOnBreak(false)} className="h-16 w-full rounded-2xl bg-indigo-600 font-black uppercase tracking-widest shadow-xl">
            Reprendre l'examen
          </Button>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const isMultiple = currentQuestion?.isMultipleCorrect;
  const userAnswers = answers[currentQuestion?.id] || [];

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-8 px-4 animate-fade-in pb-24">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-3xl shadow-lg border-2 gap-4">
        <div className="flex items-center gap-4">
          <Badge className="bg-primary/10 text-primary border-none font-black italic px-6 py-2 rounded-xl text-lg">
            Q {currentIndex + 1} / {questions.length}
          </Badge>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowReviewGrid(!showReviewGrid)}
            className={cn("h-12 w-12 rounded-2xl border-2", showReviewGrid && "bg-slate-100")}
          >
            <LayoutGrid className="h-6 w-6" />
          </Button>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 font-black text-2xl italic tabular-nums text-slate-700 min-w-[100px]">
            <Clock className="h-6 w-6 text-primary" /> {formatMMSS(timeLeft)}
          </div>
          <Button 
            onClick={() => setIsConfirmOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest h-12 px-8 rounded-2xl shadow-lg"
          >
            Terminer
          </Button>
        </div>
      </div>

      {showReviewGrid && (
        <Card className="p-6 rounded-3xl shadow-xl animate-slide-up bg-white border-2">
          <div className="grid grid-cols-6 sm:grid-cols-10 gap-2 max-h-60 overflow-y-auto p-2">
            {questions.map((q, idx) => (
              <button
                key={q.id}
                onClick={() => {
                  setCurrentIndex(idx);
                  setShowReviewGrid(false);
                }}
                className={cn(
                  "h-10 w-10 rounded-lg font-bold text-xs transition-all flex items-center justify-center relative",
                  currentIndex === idx ? "ring-2 ring-primary ring-offset-2" : "",
                  flagged[q.id] ? "bg-amber-100 text-amber-700 border-amber-300 border" : 
                  answers[q.id]?.length > 0 ? "bg-emerald-100 text-emerald-700 border-emerald-300 border" : "bg-slate-50 text-slate-400 border"
                )}
              >
                {idx + 1}
                {flagged[q.id] && <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full" />}
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card className="rounded-[40px] shadow-2xl border-t-8 border-t-primary bg-white overflow-hidden">
        <CardContent className="p-10 space-y-10">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-4 flex-1">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-none font-black italic px-3 py-0.5 text-[10px]">
                  {currentQuestion?.tags?.domain?.toUpperCase() || 'PROCESS'}
                </Badge>
                <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-none font-black italic px-3 py-0.5 text-[10px]">
                  {currentQuestion?.tags?.approach?.toUpperCase() || 'AGILE'}
                </Badge>
              </div>
              <p className="text-2xl font-black text-slate-800 italic leading-relaxed">
                {currentQuestion?.statement || currentQuestion?.text}
              </p>
              {isMultiple && (
                <p className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                  <Info className="h-4 w-4" /> Sélectionnez toutes les réponses correctes
                </p>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => toggleFlag(currentQuestion.id)}
              className={cn("h-12 w-12 rounded-2xl border-2", flagged[currentQuestion.id] ? "text-amber-500 border-amber-200 bg-amber-50" : "text-slate-300")}
            >
              <Flag className={cn("h-6 w-6", flagged[currentQuestion.id] && "fill-current")} />
            </Button>
          </div>

          <div className="grid gap-4">
            {(currentQuestion?.options || currentQuestion?.choices)?.map((opt: any, idx: number) => {
              const optId = opt.id || String(idx + 1);
              const optText = opt.text || opt;
              return (
                <div 
                  key={optId} 
                  onClick={() => handleOptionSelect(currentQuestion.id, optId, isMultiple)}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-4 shadow-sm",
                    userAnswers.includes(optId) ? "border-primary bg-primary/5 scale-[1.01]" : "border-slate-100 hover:border-slate-300"
                  )}
                >
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 border-2",
                    userAnswers.includes(optId) ? "bg-primary text-white border-primary" : "bg-white text-slate-400"
                  )}>{String.fromCharCode(65 + idx)}</div>
                  <p className={cn("flex-1 text-lg font-bold italic pt-1", userAnswers.includes(optId) ? "text-slate-900" : "text-slate-600")}>
                    {optText}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
        <CardFooter className="p-8 bg-slate-50/50 border-t flex justify-between gap-4">
          <Button 
            variant="outline" 
            className="h-16 px-10 rounded-2xl border-4 font-black uppercase tracking-widest italic" 
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} 
            disabled={currentIndex === 0}
          >
            Précédent
          </Button>
          <Button 
            onClick={() => currentIndex === questions.length - 1 ? setIsConfirmOpen(true) : nextQuestion()} 
            className="h-16 px-12 bg-primary rounded-2xl font-black uppercase tracking-widest shadow-xl text-lg italic group"
          >
            {currentIndex === questions.length - 1 ? "Terminer" : "Suivant"} <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent className="rounded-[40px] p-12 border-4 shadow-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-3xl font-black uppercase italic tracking-tighter text-primary">Soumettre l'examen ?</AlertDialogTitle>
            <AlertDialogDescription className="text-xl font-bold pt-6 text-slate-600 leading-relaxed uppercase tracking-tight">
              Êtes-vous sûr de vouloir terminer cette session ? Vous ne pourrez plus modifier vos réponses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-10 gap-6">
            <AlertDialogCancel className="h-16 rounded-2xl font-black uppercase tracking-widest border-4">Continuer l'examen</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} className="h-16 rounded-2xl font-black bg-primary shadow-2xl uppercase tracking-widest">
              {isSubmitting ? <Loader2 className="animate-spin h-6 w-6" /> : "Oui, terminer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ExamRunPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>}>
      <ExamRunContent />
    </Suspense>
  );
}