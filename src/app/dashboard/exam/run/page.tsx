"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useUser, useFirestore, useFirebase } from '@/firebase';
import { collection, query, where, getDocs, doc, addDoc, serverTimestamp, getDoc, setDoc } from 'firebase/firestore';
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
  X,
  LayoutGrid
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Calculator } from '@/components/dashboard/Calculator';

type ViewMode = 'intro' | 'question' | 'review' | 'break' | 'result';

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
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<ViewMode>('question');
  const [timeLeft, setTimeLeft] = useState(230 * 60); 
  const [isPaused, setIsPaused] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showNavigator, setShowNavigator] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [breakTimeLeft, setBreakTimeLeft] = useState(10 * 60);
  const [currentSection, setCurrentSection] = useState(1);

  // Logic pour les sections (60 questions par section)
  const SECTION_SIZE = 60;
  
  const sectionRange = useMemo(() => {
    const start = (currentSection - 1) * SECTION_SIZE;
    const end = Math.min(currentSection * SECTION_SIZE - 1, questions.length - 1);
    return { start, end };
  }, [currentSection, questions.length]);

  const currentSectionQuestions = useMemo(() => {
    return questions.slice(sectionRange.start, sectionRange.end + 1);
  }, [questions, sectionRange]);

  // Charger les questions
  useEffect(() => {
    async function fetchQuestions() {
      if (!examId || !user) return;
      setIsLoading(true);
      try {
        const qRef = collection(db, 'questions');
        const qQuery = query(qRef, where('examId', '==', examId), where('isActive', '==', true));
        const snap = await getDocs(qQuery);
        
        const fetched = snap.docs.map(d => ({ 
          ...d.data(), 
          id: d.id,
          // Compatibilité avec les différents formats de données
          text: d.data().text || d.data().statement,
          choices: d.data().choices || d.data().options?.map((o: any) => o.text)
        }));
        
        // Trier par index si disponible, sinon laisser tel quel
        fetched.sort((a, b) => (a.index || 0) - (b.index || 0));
        
        if (fetched.length === 0) {
          toast({ variant: "destructive", title: "Examen vide", description: "Aucune question trouvée pour cet examen." });
          router.push('/dashboard/exam');
          return;
        }
        setQuestions(fetched);
      } catch (e) {
        console.error(e);
        toast({ variant: "destructive", title: "Erreur", description: "Erreur de chargement des questions." });
      } finally {
        setIsLoading(false);
      }
    }
    fetchQuestions();
  }, [db, examId, user, router, toast]);

  // Timer Principal
  useEffect(() => {
    let timer: any;
    if (viewMode === 'question' && !isPaused && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && !result && viewMode !== 'result') {
      finishExam();
    }
    return () => clearInterval(timer);
  }, [viewMode, isPaused, timeLeft, result]);

  // Timer de Pause
  useEffect(() => {
    let timer: any;
    if (viewMode === 'break' && breakTimeLeft > 0) {
      timer = setInterval(() => setBreakTimeLeft(prev => prev - 1), 1000);
    } else if (breakTimeLeft === 0 && viewMode === 'break') {
      nextSection();
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

  const toggleFlag = () => {
    const qId = questions[currentIndex].id;
    setFlagged(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  const goToNext = () => {
    if (currentIndex < sectionRange.end) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setViewMode('review');
    }
  };

  const nextSection = () => {
    if (currentSection < 3) {
      setCurrentSection(prev => prev + 1);
      setCurrentIndex(currentSection * SECTION_SIZE);
      setViewMode('question');
      setBreakTimeLeft(10 * 60);
    } else {
      finishExam();
    }
  };

  const finishExam = async () => {
    setIsSubmitting(true);
    let correct = 0;
    questions.forEach(q => {
      const correctVal = String(q.correctChoice || (q.correctOptionIds ? q.correctOptionIds[0] : "1"));
      if (answers[q.id] === correctVal) correct++;
    });

    const percent = Math.round((correct / questions.length) * 100);
    
    let performance = "Needs Improvement";
    let color = "text-red-600";
    if (percent >= 80) {
      performance = "Above Target";
      color = "text-emerald-600";
    } else if (percent >= 70) {
      performance = "Target";
      color = "text-blue-600";
    } else if (percent >= 60) {
      performance = "Below Target";
      color = "text-amber-600";
    }

    const finalData = {
      examId,
      userId: user?.uid,
      scorePercent: percent,
      correctCount: correct,
      totalQuestions: questions.length,
      performance,
      durationSec: (230 * 60) - timeLeft,
      submittedAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'coachingAttempts'), finalData);
      
      // Update User Stats
      const userRef = doc(db, 'users', user!.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const u = userSnap.data();
        const count = (u.simulationsCount || 0) + 1;
        const oldTotal = (u.averageScore || 0) * (u.simulationsCount || 0);
        const newAvg = Math.round((oldTotal + percent) / count);
        await setDoc(userRef, { 
          simulationsCount: count, 
          averageScore: newAvg 
        }, { merge: true });
      }
      
      setResult(finalData);
      setViewMode('result');
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'enregistrer votre score." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (viewMode === 'result' && result) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-3xl w-full rounded-[40px] shadow-2xl border-none p-12 text-center space-y-10 bg-white border-t-8 border-t-primary">
          <div className="space-y-4">
            <Trophy className="h-20 w-20 text-yellow-500 mx-auto" />
            <h2 className="text-5xl font-black italic uppercase tracking-tighter text-slate-900">Rapport de Performance</h2>
            <div className="flex justify-center pt-4">
              <div className={cn(
                "px-8 py-3 rounded-2xl font-black uppercase italic text-xl tracking-widest shadow-sm",
                result.performance === "Above Target" ? "bg-emerald-100 text-emerald-600 border-2 border-emerald-200" : 
                result.performance === "Target" ? "bg-blue-100 text-blue-600 border-2 border-blue-200" : 
                result.performance === "Below Target" ? "bg-amber-100 text-amber-600 border-2 border-amber-200" : 
                "bg-red-100 text-red-600 border-2 border-red-200"
              )}>
                {result.performance}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50 p-6 rounded-3xl border-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Score Total</p>
              <p className="text-4xl font-black italic text-primary">{result.scorePercent}%</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl border-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Correctes</p>
              <p className="text-4xl font-black italic text-slate-700">{result.correctCount} / {result.totalQuestions}</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl border-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Temps</p>
              <p className="text-4xl font-black italic text-slate-700">{Math.floor(result.durationSec / 60)}m</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <Button variant="outline" className="flex-1 h-16 rounded-2xl border-4 font-black uppercase tracking-widest text-lg italic" asChild>
              <Link href="/dashboard/history">Détails de l'historique</Link>
            </Button>
            <Button className="flex-1 h-16 rounded-2xl bg-primary font-black uppercase tracking-widest shadow-xl text-lg italic" asChild>
              <Link href="/dashboard">Tableau de bord</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (viewMode === 'break') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full rounded-[40px] shadow-2xl p-12 text-center space-y-8 bg-white border-t-8 border-t-emerald-500">
          <div className="bg-emerald-50 h-24 w-24 rounded-[32px] flex items-center justify-center mx-auto shadow-inner">
            <Clock className="h-12 w-12 text-emerald-600" />
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl font-black italic uppercase tracking-tighter text-emerald-600">Pause Optionnelle</h2>
            <p className="text-xl font-bold text-slate-500 italic">Prenez un moment pour souffler. La section suivante débutera automatiquement à la fin du décompte.</p>
          </div>
          <div className="text-8xl font-black italic tabular-nums text-slate-800 bg-slate-50 py-8 rounded-3xl border-2 border-dashed border-emerald-100">
            {formatMMSS(breakTimeLeft)}
          </div>
          <Button onClick={nextSection} className="h-20 w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-xl shadow-xl scale-105 transition-transform">
            REPRENDRE L'EXAMEN
          </Button>
        </Card>
      </div>
    );
  }

  if (viewMode === 'review') {
    return (
      <div className="min-h-screen bg-slate-50 p-8 animate-fade-in">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-primary">Revue Section {currentSection}</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2">Vérifiez vos réponses avant de clôturer ce bloc de 60 questions.</p>
          </div>

          <Card className="rounded-[40px] shadow-2xl border-none bg-white p-10">
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-3 mb-10">
              {currentSectionQuestions.map((q, idx) => {
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
                    {isFlagged && <Flag className="absolute -top-1 -right-1 w-3 h-3 text-amber-600 fill-current" />}
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
                onClick={currentSection < 3 ? () => setViewMode('break') : finishExam}
              >
                {currentSection < 3 ? "VALIDER ET PAUSE" : "VALIDER ET TERMINER"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // --- INTERFACE DE QUESTION NORMALE ---
  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header - Style PMP Officiel */}
      <div className="bg-slate-900 text-white px-8 py-4 flex items-center justify-between shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsPaused(true)} className="text-white hover:bg-white/10 rounded-xl h-10 border border-white/20">
              <Pause className="h-4 w-4 mr-2" /> Pause
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowCalculator(true)} className="text-white hover:bg-white/10 rounded-xl h-10 border border-white/20">
              <CalcIcon className="h-4 w-4 mr-2" /> Calculator
            </Button>
          </div>
          <div className="h-8 w-px bg-white/20" />
          <div className="font-black italic text-lg tracking-tight">
            Question {currentIndex + 1} of {questions.length}
          </div>
        </div>

        <div className="flex items-center gap-8">
          <Button 
            variant="ghost" 
            onClick={toggleFlag}
            className={cn(
              "h-10 px-4 rounded-xl border border-white/20 transition-all",
              flagged[currentQuestion?.id] ? "bg-amber-500 text-white border-amber-400" : "text-white hover:bg-white/10"
            )}
          >
            <Flag className={cn("h-4 w-4 mr-2", flagged[currentQuestion?.id] && "fill-current")} /> Flag
          </Button>
          
          <div className="flex flex-col items-end">
            <div className="text-3xl font-black italic tabular-nums leading-none">
              {formatMMSS(timeLeft)}
            </div>
            <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest mt-1">TIME REMAINING</span>
          </div>
        </div>
      </div>

      {/* Main Area */}
      <main className="flex-1 p-8 max-w-5xl mx-auto w-full space-y-8 pb-32">
        <div className="space-y-2">
          <Progress value={progress} className="h-1.5 rounded-full bg-slate-200" />
          <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
            <span>Section {currentSection} / 3</span>
            <span>Progression: {Math.round(progress)}%</span>
          </div>
        </div>
        
        <Card className="rounded-[40px] shadow-2xl border-none bg-white overflow-hidden min-h-[400px]">
          <CardContent className="p-12 space-y-10">
            <h2 className="text-2xl font-black text-slate-800 italic leading-relaxed">
              {currentQuestion?.text}
            </h2>

            <div className="grid gap-4">
              {currentQuestion?.choices?.map((opt: string, idx: number) => {
                const optId = String(idx + 1);
                const isSelected = answers[currentQuestion.id] === optId;
                
                return (
                  <div 
                    key={idx} 
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
                      {opt}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer Navigation - Toujours visible */}
      <div className="fixed bottom-0 left-64 right-0 bg-white border-t-2 p-6 flex items-center justify-between shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-40">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => setShowNavigator(!showNavigator)}
            className="h-14 px-6 rounded-2xl border-2 font-black uppercase tracking-widest text-xs italic hover:bg-slate-50"
          >
            <LayoutGrid className="mr-2 h-4 w-4" /> Navigator
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            className="h-14 px-8 rounded-2xl border-2 font-black uppercase tracking-widest italic" 
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === sectionRange.start}
          >
            <ChevronLeft className="mr-2 h-5 w-5" /> Previous
          </Button>

          {currentIndex === sectionRange.end ? (
            <Button 
              onClick={() => setViewMode('review')}
              className="h-14 px-10 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-widest italic shadow-xl animate-pulse"
            >
              REVIEW SECTION {currentSection}
            </Button>
          ) : (
            <Button 
              onClick={() => setCurrentIndex(currentIndex + 1)}
              className="h-14 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest italic shadow-xl"
            >
              Next <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Navigator Overlay */}
      {showNavigator && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center pb-32 px-4 pointer-events-none">
          <Card className="w-full max-w-4xl p-6 rounded-[32px] shadow-3xl bg-white border-4 border-primary/20 pointer-events-auto animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black italic uppercase tracking-tight text-primary">Navigator - Section {currentSection}</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowNavigator(false)}><X /></Button>
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-10 gap-2 overflow-y-auto max-h-[300px] p-2">
              {currentSectionQuestions.map((q, idx) => {
                const globalIdx = sectionRange.start + idx;
                const isAnswered = !!answers[q.id];
                const isCurrent = globalIdx === currentIndex;
                const isFlagged = flagged[q.id];
                
                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentIndex(globalIdx);
                      setShowNavigator(false);
                    }}
                    className={cn(
                      "h-10 w-10 rounded-xl font-black text-xs transition-all relative border-2 flex items-center justify-center",
                      isCurrent ? "border-primary bg-primary text-white scale-110 z-10" : 
                      isFlagged ? "bg-amber-100 border-amber-400 text-amber-700" :
                      isAnswered ? "bg-primary/10 border-primary/20 text-primary" : "bg-slate-50 border-slate-100 text-slate-300"
                    )}
                  >
                    {globalIdx + 1}
                    {isFlagged && <Flag className="absolute -top-1 -right-1 w-2.5 h-2.5 text-amber-600 fill-current" />}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Calculator Overlay */}
      {showCalculator && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto">
            <Calculator onClose={() => setShowCalculator(false)} />
          </div>
        </div>
      )}

      {/* Overlay de Pause */}
      {isPaused && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-center justify-center pointer-events-auto">
          <div className="text-center space-y-8">
            <h2 className="text-5xl font-black uppercase italic text-white tracking-tighter">EXAM PAUSED</h2>
            <Button onClick={() => setIsPaused(false)} className="h-20 px-16 rounded-[28px] bg-white text-slate-900 text-2xl font-black uppercase tracking-widest shadow-xl scale-110">
              RESUME EXAM
            </Button>
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
