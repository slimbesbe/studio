
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
  Coffee,
  Pause,
  Calculator as CalcIcon,
  RotateCcw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Calculator } from '@/components/dashboard/Calculator';

function ExamRunContent() {
  const { user, profile } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const examId = searchParams.get('id');
  
  // State
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
  const [showCalculator, setShowCalculator] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Section & Break Management
  const [isReviewingSection, setIsReviewingSection] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakTimeLeft, setBreakTimeLeft] = useState(10 * 60);

  // Constants
  const SECTION_SIZE = 60;
  const currentSection = Math.floor(currentIndex / SECTION_SIZE) + 1;

  // Load Questions
  useEffect(() => {
    async function fetchQuestions() {
      if (!examId) return;
      setIsLoading(true);
      try {
        const qRef = collection(db, 'questions');
        const qQuery = query(qRef, where('examId', '==', examId), where('isActive', '==', true));
        const snap = await getDocs(qQuery);
        
        const fetched = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        // Sort by index if available
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
  }, [db, examId, router, toast]);

  // Main Timer
  useEffect(() => {
    let timer: any;
    if (isStarted && !result && !isOnBreak && !isPaused && !isReviewingSection && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isStarted && !result) {
      handleSubmit();
    }
    return () => clearInterval(timer);
  }, [isStarted, result, timeLeft, isOnBreak, isPaused, isReviewingSection]);

  // Break Timer
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
    if ((currentIndex + 1) % SECTION_SIZE === 0 || currentIndex === questions.length - 1) {
      setIsReviewingSection(true);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const startBreak = () => {
    setIsReviewingSection(false);
    if (currentIndex < questions.length - 1) {
      setIsOnBreak(true);
      setBreakTimeLeft(10 * 60);
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsConfirmOpen(true);
    }
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
    
    let correctCount = 0;
    const details = questions.map(q => {
      const userAns = answers[q.id] || [];
      const correctAns = q.correctOptionIds || [String(q.correctChoice)];
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
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erreur", description: "Échec de l'enregistrement du score." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  // RESULTS SCREEN
  if (result) {
    const perfColor = result.percentage >= 80 ? 'text-emerald-500' : result.percentage >= 70 ? 'text-blue-500' : result.percentage >= 60 ? 'text-amber-500' : 'text-red-500';
    const perfBg = result.percentage >= 80 ? 'bg-emerald-500' : result.percentage >= 70 ? 'bg-blue-500' : result.percentage >= 60 ? 'bg-amber-500' : 'bg-red-500';

    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-10 animate-fade-in px-4">
        <h1 className="text-5xl font-black italic uppercase tracking-tighter text-primary text-balance">Rapport de Performance</h1>
        <Card className="rounded-[40px] shadow-2xl border-none p-12 space-y-8 bg-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5"><Trophy className="h-32 w-32" /></div>
          
          <div className="space-y-4">
            <div className={cn("text-8xl font-black italic tracking-tighter", perfColor)}>
              {result.percentage}%
            </div>
            <div className="flex justify-center">
               <Badge className={cn("text-lg px-8 py-2 font-black uppercase italic rounded-xl shadow-lg border-none text-white", perfBg)}>
                 {result.performance}
               </Badge>
            </div>
            <p className="text-xl font-black text-slate-400 uppercase tracking-widest italic mt-4">{result.score} / {result.total} RÉPONSES CORRECTES</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t-2 border-dashed">
            <div className="bg-slate-50 p-6 rounded-3xl border-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Temps utilisé</p>
              <p className="text-3xl font-black italic text-slate-800">{formatMMSS(result.timeSpent)}</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl border-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Examen complété</p>
              <p className="text-3xl font-black italic text-slate-800">{examId?.replace('exam', 'N°')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="h-16 rounded-2xl border-4 font-black uppercase tracking-widest text-lg italic" asChild>
              <Link href="/dashboard/history">Détails</Link>
            </Button>
            <Button className="h-16 rounded-2xl bg-primary font-black uppercase tracking-widest shadow-xl text-lg italic" asChild>
              <Link href="/dashboard">Tableau de bord</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // BREAK SCREEN
  if (isOnBreak) {
    return (
      <div className="max-w-2xl mx-auto py-24 px-4 text-center animate-fade-in">
        <Card className="rounded-[40px] shadow-2xl p-16 space-y-8 bg-white border-t-8 border-t-indigo-600">
          <div className="bg-indigo-50 h-24 w-24 rounded-[32px] flex items-center justify-center mx-auto shadow-inner">
            <Coffee className="h-12 w-12 text-indigo-600" />
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl font-black italic uppercase tracking-tighter text-indigo-600">Pause Recommandée</h2>
            <p className="text-xl font-bold text-slate-500 italic">Vous avez terminé une section de 60 questions. Prenez 10 minutes pour vous reposer.</p>
          </div>
          <div className="text-7xl font-black italic tabular-nums text-slate-800 bg-slate-50 py-8 rounded-3xl border-2 border-dashed">
            {formatMMSS(breakTimeLeft)}
          </div>
          <Button onClick={() => setIsOnBreak(false)} className="h-20 w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xl shadow-xl">
            REPRENDRE L'EXAMEN
          </Button>
        </Card>
      </div>
    );
  }

  // SECTION REVIEW SCREEN
  if (isReviewingSection) {
    const sectionStartIdx = (currentSection - 1) * SECTION_SIZE;
    const sectionEndIdx = Math.min(currentSection * SECTION_SIZE, questions.length);
    const sectionQuestions = questions.slice(sectionStartIdx, sectionEndIdx);
    
    return (
      <div className="max-w-5xl mx-auto py-12 px-4 space-y-8 animate-fade-in">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-primary">Revue de la Section {currentSection}</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs italic">Vérifiez vos réponses avant de valider cette section.</p>
        </div>

        <Card className="rounded-[40px] shadow-2xl border-none bg-white p-10">
          <div className="grid grid-cols-6 sm:grid-cols-10 gap-3 mb-10">
            {sectionQuestions.map((q, idx) => {
              const globalIdx = sectionStartIdx + idx;
              const isAnswered = !!answers[q.id];
              const isFlagged = flagged[q.id];
              return (
                <button
                  key={q.id}
                  onClick={() => {
                    setCurrentIndex(globalIdx);
                    setIsReviewingSection(false);
                  }}
                  className={cn(
                    "h-12 w-12 rounded-xl font-black text-sm transition-all flex items-center justify-center relative border-2",
                    isFlagged ? "bg-amber-100 border-amber-400 text-amber-700" : 
                    isAnswered ? "bg-primary/10 border-primary/20 text-primary" : "bg-white text-slate-300 border-slate-100"
                  )}
                >
                  {globalIdx + 1}
                  {isFlagged && <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-white" />}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              variant="outline" 
              className="flex-1 h-16 rounded-2xl border-4 font-black uppercase tracking-widest"
              onClick={() => {
                setCurrentIndex(sectionStartIdx);
                setIsReviewingSection(false);
              }}
            >
              Retour aux questions
            </Button>
            <Button 
              className="flex-1 h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-black uppercase tracking-widest shadow-xl text-white"
              onClick={startBreak}
            >
              Valider la section {currentSection}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // MAIN QUESTION INTERFACE
  const currentQuestion = questions[currentIndex];
  const isMultiple = currentQuestion?.isMultipleCorrect;
  const userAnswers = answers[currentQuestion?.id] || [];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  // Grid for the current section only
  const sectionStartIdx = (currentSection - 1) * SECTION_SIZE;
  const sectionEndIdx = Math.min(currentSection * SECTION_SIZE, questions.length);
  const visibleGridQuestions = questions.slice(sectionStartIdx, sectionEndIdx);

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-8 px-4 animate-fade-in pb-32 relative">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-white px-6 h-14 flex items-center justify-center rounded-full shadow-lg border-2 border-slate-100 min-w-[140px]">
            <span className="font-black italic text-xl text-slate-800">Q-{currentIndex + 1} / {questions.length}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setIsPaused(!isPaused)}
              className={cn("h-14 w-14 rounded-2xl border-2 shadow-md bg-white", isPaused && "bg-amber-50 border-amber-200")}
            >
              <Pause className={cn("h-6 w-6 text-slate-600", isPaused && "text-amber-600")} />
            </Button>
            
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => toggleFlag(currentQuestion?.id)}
              className={cn("h-14 w-14 rounded-2xl border-2 shadow-md bg-white", flagged[currentQuestion?.id] && "bg-amber-50 border-amber-200")}
            >
              <Flag className={cn("h-6 w-6 text-slate-600", flagged[currentQuestion?.id] && "text-amber-600 fill-amber-600")} />
            </Button>

            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setShowCalculator(!showCalculator)}
              className={cn("h-14 w-14 rounded-2xl border-2 shadow-md bg-white", showCalculator && "bg-primary/5 border-primary/20")}
            >
              <CalcIcon className="h-6 w-6 text-slate-600" />
            </Button>
          </div>
        </div>
        
        <div className="flex flex-col items-center">
          <div className={cn(
            "h-16 min-w-[160px] bg-slate-100 rounded-3xl flex items-center justify-center border-4 border-white shadow-xl px-8",
            timeLeft < 300 ? "text-red-600" : "text-indigo-800"
          )}>
            <span className="text-3xl font-black italic tabular-nums">{formatMMSS(timeLeft)}</span>
          </div>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Compte à rebours</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden shadow-inner">
        <div 
          className="h-full bg-primary transition-all duration-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
          style={{ width: `${progress}%` }} 
        />
      </div>

      {/* Question Card */}
      <Card className="rounded-[40px] shadow-2xl border-t-[12px] border-t-primary bg-white min-h-[400px] flex flex-col">
        <CardContent className="p-12 flex-1 space-y-12">
          <div className="space-y-6">
            <p className="text-3xl font-black text-slate-800 italic leading-snug">
              {currentQuestion?.statement || currentQuestion?.text}
            </p>
            {isMultiple && (
              <p className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                <Info className="h-4 w-4" /> Choisissez plusieurs options
              </p>
            )}
          </div>

          <div className="grid gap-6">
            {(currentQuestion?.options || currentQuestion?.choices)?.map((opt: any, idx: number) => {
              const optId = opt.id || String(idx + 1);
              const optText = opt.text || opt;
              const isSelected = userAnswers.includes(optId);
              
              return (
                <div 
                  key={optId} 
                  onClick={() => handleOptionSelect(currentQuestion.id, optId, !!isMultiple)}
                  className={cn(
                    "p-6 rounded-[24px] border-2 transition-all cursor-pointer flex items-center gap-6 shadow-sm",
                    isSelected ? "border-primary bg-primary/5 ring-4 ring-primary/5" : "border-slate-100 hover:border-slate-200 bg-white"
                  )}
                >
                  <div className={cn(
                    "h-12 w-12 rounded-full flex items-center justify-center font-black text-sm shrink-0 border-2",
                    isSelected ? "bg-primary text-white border-primary shadow-lg" : "bg-white text-primary border-primary/20"
                  )}>{String.fromCharCode(65 + idx)}</div>
                  <p className={cn("flex-1 text-xl font-bold italic", isSelected ? "text-slate-900" : "text-slate-600")}>
                    {optText}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
        <CardFooter className="p-10 bg-slate-50/50 border-t flex justify-between gap-6 rounded-b-[40px]">
          <Button 
            variant="outline" 
            className="h-16 px-12 rounded-2xl border-4 font-black uppercase tracking-widest italic" 
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} 
            disabled={currentIndex === 0}
          >
            Précédent
          </Button>
          <div className="flex gap-4">
            <Button 
              className="h-16 px-8 rounded-2xl bg-red-500 hover:bg-red-600 font-black italic text-white uppercase tracking-tighter shadow-lg"
              onClick={() => setIsReviewingSection(true)}
            >
              REVIEW SECTION {currentSection}
            </Button>
            <Button 
              onClick={nextQuestion} 
              className="h-16 px-16 bg-primary rounded-2xl font-black uppercase tracking-widest shadow-2xl text-xl italic group"
            >
              {currentIndex === questions.length - 1 ? "Revue Finale" : "Suivant"} <ChevronRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Grid Navigation Footer (Current Section only) */}
      <div className="grid grid-cols-10 gap-2 p-4 bg-white/50 backdrop-blur-md rounded-2xl border shadow-inner">
        {visibleGridQuestions.map((q, idx) => {
          const globalIdx = sectionStartIdx + idx;
          const isAnswered = !!answers[q.id];
          const isFlagged = flagged[q.id];
          const isCurrent = globalIdx === currentIndex;
          return (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(globalIdx)}
              className={cn(
                "h-8 w-8 rounded-lg font-black text-[10px] transition-all flex items-center justify-center relative border-2",
                isCurrent ? "border-primary ring-2 ring-primary/20 scale-110 z-10 bg-white" : 
                isFlagged ? "bg-amber-100 border-amber-400 text-amber-700" : 
                isAnswered ? "bg-primary/10 border-primary/20 text-primary" : "bg-white text-slate-300 border-slate-100"
              )}
            >
              {globalIdx + 1}
              {isFlagged && <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full border-2 border-white" />}
            </button>
          );
        })}
      </div>

      {showCalculator && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/5 pointer-events-none">
          <div className="pointer-events-auto">
            <Calculator onClose={() => setShowCalculator(false)} />
          </div>
        </div>
      )}

      {/* Pause & Confirmation Dialogs remain same as previous version */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent className="rounded-[40px] p-12 border-4 shadow-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-3xl font-black uppercase italic tracking-tighter text-primary">Terminer l'examen ?</AlertDialogTitle>
            <AlertDialogDescription className="text-xl font-bold pt-6 text-slate-600 leading-relaxed uppercase tracking-tight">
              Vous avez répondu à {Object.keys(answers).length} questions. Souhaitez-vous soumettre vos réponses maintenant ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-10 gap-6">
            <AlertDialogCancel className="h-16 rounded-2xl font-black uppercase tracking-widest border-4">Continuer</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} className="h-16 rounded-2xl font-black bg-primary shadow-2xl uppercase tracking-widest">
              {isSubmitting ? <Loader2 className="animate-spin h-6 w-6" /> : "Valider l'examen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isPaused && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-md z-[100] flex items-center justify-center">
          <Card className="p-16 rounded-[60px] shadow-3xl text-center space-y-8 border-4">
            <div className="h-24 w-24 bg-amber-100 rounded-[32px] flex items-center justify-center mx-auto shadow-inner">
              <Pause className="h-12 w-12 text-amber-600" />
            </div>
            <h2 className="text-4xl font-black uppercase italic text-amber-600">Examen en pause</h2>
            <Button onClick={() => setIsPaused(false)} className="h-20 px-16 rounded-[28px] bg-amber-600 hover:bg-amber-700 text-2xl font-black uppercase tracking-widest">
              REPRENDRE
            </Button>
          </Card>
        </div>
      )}
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
