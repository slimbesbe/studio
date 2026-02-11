
"use client";

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
  Pause, 
  Calculator as CalcIcon,
  Trophy,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  RotateCcw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Calculator } from '@/components/dashboard/Calculator';

type ViewMode = 'intro' | 'question' | 'sectionReview' | 'break' | 'result';

function ExamRunContent() {
  const { user, profile } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const examId = searchParams.get('id');
  
  // State de base
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<ViewMode>('question');
  const [timeLeft, setTimeLeft] = useState(230 * 60); 
  const [isPaused, setIsPaused] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Pause State
  const [breakTimeLeft, setBreakTimeLeft] = useState(10 * 60);

  // Définition des sections (0-59, 60-119, 120+)
  const currentSection = useMemo(() => {
    if (currentIndex < 60) return 1;
    if (currentIndex < 120) return 2;
    return 3;
  }, [currentIndex]);

  const sectionRange = useMemo(() => {
    if (currentSection === 1) return { start: 0, end: Math.min(59, questions.length - 1) };
    if (currentSection === 2) return { start: 60, end: Math.min(119, questions.length - 1) };
    return { start: 120, end: questions.length - 1 };
  }, [currentSection, questions.length]);

  const sectionQuestions = useMemo(() => {
    return questions.slice(sectionRange.start, sectionRange.end + 1);
  }, [questions, sectionRange]);

  // Charger les questions
  useEffect(() => {
    async function fetchQuestions() {
      if (!examId) return;
      setIsLoading(true);
      try {
        const qRef = collection(db, 'questions');
        const qQuery = query(qRef, where('examId', '==', examId), where('isActive', '==', true));
        const snap = await getDocs(qQuery);
        
        const fetched = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        fetched.sort((a, b) => (a.index || 0) - (b.index || 0));
        
        if (fetched.length === 0) {
          toast({ variant: "destructive", title: "Examen vide", description: "Aucune question trouvée pour cet examen." });
          router.push('/dashboard/exam');
          return;
        }
        setQuestions(fetched);
      } catch (e) {
        toast({ variant: "destructive", title: "Erreur", description: "Impossible de charger les questions." });
      } finally {
        setIsLoading(false);
      }
    }
    fetchQuestions();
  }, [db, examId, router, toast]);

  // Timer Principal
  useEffect(() => {
    let timer: any;
    if (viewMode === 'question' && !isPaused && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && !result) {
      calculateFinalResult();
    }
    return () => clearInterval(timer);
  }, [viewMode, isPaused, timeLeft, result]);

  // Timer de Pause
  useEffect(() => {
    let timer: any;
    if (viewMode === 'break' && breakTimeLeft > 0) {
      timer = setInterval(() => setBreakTimeLeft(prev => prev - 1), 1000);
    } else if (breakTimeLeft === 0 && viewMode === 'break') {
      setViewMode('question');
    }
    return () => clearInterval(timer);
  }, [viewMode, breakTimeLeft]);

  const formatMMSS = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleOptionSelect = (questionId: string, choiceIdx: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: choiceIdx }));
  };

  const handleNext = () => {
    if (currentIndex === sectionRange.end) {
      setViewMode('sectionReview');
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const submitSection = () => {
    if (currentSection < 3 && questions.length > sectionRange.end + 1) {
      setBreakTimeLeft(10 * 60);
      setViewMode('break');
      setCurrentIndex(sectionRange.end + 1);
    } else {
      calculateFinalResult();
    }
  };

  const calculateFinalResult = async () => {
    setIsSubmitting(true);
    let correct = 0;
    questions.forEach(q => {
      // Gérer formats correctChoice (string "1") ou (number 1) ou correctOptionIds
      const correctVal = String(q.correctChoice || (q.correctOptionIds ? q.correctOptionIds[0] : "1"));
      if (answers[q.id] === correctVal) correct++;
    });

    const percent = Math.round((correct / questions.length) * 100);
    let performance = "Needs Improvement";
    if (percent >= 80) performance = "Above Target";
    else if (percent >= 70) performance = "Target";
    else if (percent >= 60) performance = "Below Target";

    const finalData = {
      examId,
      userId: user?.uid,
      score: correct,
      total: questions.length,
      percentage: percent,
      performance,
      timeSpent: (230 * 60) - timeLeft,
      completedAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'coachingAttempts'), finalData);
      // Update User Stats
      const userRef = doc(db, 'users', user!.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const u = userSnap.data();
        const count = (u.simulationsCount || 0) + 1;
        const avg = Math.round(((u.averageScore || 0) * (count - 1) + percent) / count);
        await setDoc(userRef, { simulationsCount: count, averageScore: avg }, { merge: true });
      }
      setResult(finalData);
      setViewMode('result');
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'enregistrer le score." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  // RENDER: PAUSE
  if (isPaused) {
    return (
      <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-center justify-center">
        <Card className="p-12 rounded-[40px] shadow-3xl text-center space-y-8 max-w-lg">
          <div className="h-24 w-24 bg-amber-100 rounded-[32px] flex items-center justify-center mx-auto">
            <Pause className="h-12 w-12 text-amber-600" />
          </div>
          <h2 className="text-4xl font-black uppercase italic text-slate-800">Examen en pause</h2>
          <p className="text-slate-500 font-bold italic">Le chronomètre est arrêté. Reprenez dès que vous êtes prêt.</p>
          <Button onClick={() => setIsPaused(false)} className="h-20 px-16 rounded-[28px] bg-primary text-2xl font-black uppercase tracking-widest shadow-xl">
            REPRENDRE
          </Button>
        </Card>
      </div>
    );
  }

  // RENDER: BREAK (10 min)
  if (viewMode === 'break') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full rounded-[40px] shadow-2xl p-12 text-center space-y-8 bg-white border-t-8 border-t-indigo-600">
          <div className="bg-indigo-50 h-24 w-24 rounded-[32px] flex items-center justify-center mx-auto shadow-inner">
            <Clock className="h-12 w-12 text-indigo-600" />
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl font-black italic uppercase tracking-tighter text-indigo-600">Pause Optionnelle</h2>
            <p className="text-xl font-bold text-slate-500 italic">Prenez 10 minutes pour vous reposer. Vous avez terminé la Section {currentSection - 1}.</p>
          </div>
          <div className="text-8xl font-black italic tabular-nums text-slate-800 bg-slate-50 py-8 rounded-3xl border-2 border-dashed">
            {formatMMSS(breakTimeLeft)}
          </div>
          <Button onClick={() => setViewMode('question')} className="h-20 w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xl shadow-xl">
            REPRENDRE MAINTENANT
          </Button>
        </Card>
      </div>
    );
  }

  // RENDER: SECTION REVIEW
  if (viewMode === 'sectionReview') {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-primary">Revue de la Section {currentSection}</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2">Vérifiez vos réponses avant de valider ce bloc.</p>
          </div>

          <Card className="rounded-[40px] shadow-2xl border-none bg-white p-10">
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-3 mb-10">
              {sectionQuestions.map((q, idx) => {
                const globalIdx = sectionRange.start + idx;
                const isAnswered = !!answers[q.id];
                const isFlagged = flagged[q.id];
                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentIndex(globalIdx);
                      setViewMode('question');
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
                onClick={() => setViewMode('question')}
              >
                Retour aux questions
              </Button>
              <Button 
                className="flex-1 h-16 rounded-2xl bg-red-600 hover:bg-red-700 font-black uppercase tracking-widest shadow-xl text-white"
                onClick={submitSection}
              >
                {currentSection === 3 ? "VALIDER L'EXAMEN" : "VALIDER ET PAUSE"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // RENDER: RESULT
  if (viewMode === 'result' && result) {
    const isPass = result.percentage >= 70;
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full rounded-[40px] shadow-2xl p-12 text-center space-y-8 bg-white border-t-8 border-t-primary">
          <div className="space-y-4">
            <div className="flex justify-center mb-4">
              {isPass ? <Trophy className="h-20 w-20 text-emerald-500" /> : <AlertCircle className="h-20 w-20 text-amber-500" />}
            </div>
            <h2 className="text-5xl font-black italic uppercase tracking-tighter text-slate-900">Résultat Final</h2>
            <div className="flex justify-center">
              <Badge className={cn(
                "text-lg px-6 py-2 font-black uppercase italic rounded-xl",
                result.performance === "Above Target" ? "bg-emerald-500" : 
                result.performance === "Target" ? "bg-blue-500" : "bg-amber-500"
              )}>
                {result.performance}
              </Badge>
            </div>
          </div>
          <div className="text-8xl font-black italic tracking-tighter text-primary">{result.percentage}%</div>
          <p className="text-xl font-bold text-slate-400 uppercase italic">{result.score} / {result.total} Points</p>
          
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="h-16 rounded-2xl border-4 font-black uppercase tracking-widest" asChild>
              <Link href="/dashboard/history">Détails</Link>
            </Button>
            <Button className="h-16 rounded-2xl bg-primary font-black uppercase tracking-widest shadow-xl" asChild>
              <Link href="/dashboard">Tableau de bord</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // RENDER: MAIN QUESTION
  const currentQuestion = questions[currentIndex];
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <div className="bg-white border-b-2 px-8 py-4 flex items-center justify-between shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="bg-slate-100 px-4 py-2 rounded-xl font-black italic text-slate-700">
            Q {currentIndex + 1} / {questions.length}
          </div>
          <div className="flex items-center gap-2 border-l-2 pl-6">
            <Button variant="ghost" size="icon" onClick={() => setIsPaused(true)} className="h-10 w-10 rounded-full hover:bg-amber-50 text-amber-600">
              <Pause className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setFlagged(prev => ({...prev, [currentQuestion?.id]: !prev[currentQuestion?.id]}))}
              className={cn("h-10 w-10 rounded-full", flagged[currentQuestion?.id] ? "bg-amber-100 text-amber-600" : "text-slate-400")}
            >
              <Flag className={cn("h-5 w-5", flagged[currentQuestion?.id] && "fill-current")} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowCalculator(!showCalculator)} className="h-10 w-10 rounded-full hover:bg-indigo-50 text-indigo-600">
              <CalcIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <div className="text-3xl font-black italic tabular-nums text-slate-800">
            {formatMMSS(timeLeft)}
          </div>
          <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">TEMPS RESTANT</span>
        </div>
      </div>

      <main className="flex-1 p-8 max-w-5xl mx-auto w-full space-y-8">
        <Progress value={((currentIndex + 1 - sectionRange.start) / (sectionRange.end - sectionRange.start + 1)) * 100} className="h-2 rounded-full" />
        
        <Card className="rounded-[40px] shadow-2xl border-none bg-white min-h-[400px]">
          <CardContent className="p-12 space-y-10">
            <h2 className="text-2xl font-black text-slate-800 italic leading-relaxed">
              {currentQuestion?.statement || currentQuestion?.text}
            </h2>

            <div className="grid gap-4">
              {(currentQuestion?.options || currentQuestion?.choices)?.map((opt: any, idx: number) => {
                const optId = opt.id || String(idx + 1);
                const optText = opt.text || opt;
                const isSelected = answers[currentQuestion.id] === optId;
                
                return (
                  <div 
                    key={optId} 
                    onClick={() => handleOptionSelect(currentQuestion.id, optId)}
                    className={cn(
                      "p-6 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-6 shadow-sm",
                      isSelected ? "border-primary bg-primary/5" : "border-slate-100 hover:border-slate-300"
                    )}
                  >
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 border-2",
                      isSelected ? "bg-primary text-white border-primary" : "bg-white text-slate-400"
                    )}>{String.fromCharCode(65 + idx)}</div>
                    <p className={cn("flex-1 text-lg font-bold italic", isSelected ? "text-slate-900" : "text-slate-600")}>
                      {optText}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Footer Navigation */}
        <div className="flex justify-between items-center gap-6">
          <Button 
            variant="outline" 
            className="h-16 px-10 rounded-2xl border-4 font-black uppercase tracking-widest italic" 
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === sectionRange.start}
          >
            <ChevronLeft className="mr-2 h-5 w-5" /> Précédent
          </Button>

          <div className="flex-1 grid grid-cols-10 gap-2 px-4 py-2 bg-white/50 rounded-2xl border">
            {sectionQuestions.map((q, idx) => {
              const gIdx = sectionRange.start + idx;
              return (
                <div 
                  key={q.id}
                  className={cn(
                    "h-6 rounded flex items-center justify-center text-[10px] font-bold",
                    gIdx === currentIndex ? "bg-primary text-white" : 
                    answers[q.id] ? "bg-primary/20 text-primary" : "bg-slate-200 text-slate-400"
                  )}
                >
                  {gIdx + 1}
                </div>
              );
            })}
          </div>

          <Button 
            onClick={handleNext}
            className={cn(
              "h-16 px-10 rounded-2xl font-black uppercase tracking-widest italic shadow-xl",
              currentIndex === sectionRange.end ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary/90"
            )}
          >
            {currentIndex === sectionRange.end ? "REVIEW SECTION" : "Suivant"} <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </main>

      {showCalculator && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto">
            <Calculator onClose={() => setShowCalculator(false)} />
          </div>
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
