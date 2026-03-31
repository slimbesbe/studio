
"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
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
  X,
  LayoutGrid,
  Info,
  MoveLeft,
  MoveRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Calculator } from '@/components/dashboard/Calculator';

type ViewMode = 'question' | 'review' | 'break' | 'result';

function PerformanceScale({ score }: { score: number }) {
  const isPass = score >= 50;
  
  // segments widths are equal (25% each)
  // cursor position is simply the score percent
  const cursorLeft = `${score}%`;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 py-10 animate-fade-in">
      <div className="text-left space-y-2">
        <h2 className="text-3xl font-medium text-slate-700">
          Your Overall Performance: <span className={cn("font-bold text-4xl", isPass ? "text-[#005bb7]" : "text-destructive")}>
            {isPass ? 'Pass' : 'Fail'}
          </span>
        </h2>
        <p className="text-slate-500 text-lg">
          {isPass 
            ? "Congratulations! You passed your exam and have successfully earned your PMI certification. This is a tremendous accomplishment!" 
            : "Unfortunately, you did not pass the exam this time. Focus on the areas indicated below to improve for your next attempt."}
        </p>
      </div>

      <div className="relative pt-12 pb-16">
        {/* Labels failing/passing */}
        <div className="absolute top-0 left-0 w-full flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
          <div className="flex items-center gap-2">
            <MoveLeft className="h-3 w-3" /> Failing
          </div>
          <div className="flex items-center gap-2">
            Passing <MoveRight className="h-3 w-3" />
          </div>
        </div>

        {/* The double arrow line */}
        <div className="absolute top-6 left-0 w-full h-px bg-sky-400 flex items-center justify-center">
          <div className="h-3 w-px bg-sky-400" /> {/* center mark */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 border-y-[4px] border-y-transparent border-r-[6px] border-r-sky-400" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 border-y-[4px] border-y-transparent border-l-[6px] border-l-sky-400" />
        </div>

        {/* The cursor "YOU" */}
        <div 
          className="absolute top-4 z-20 flex flex-col items-center transition-all duration-1000 ease-out"
          style={{ left: cursorLeft }}
        >
          <span className="text-[11px] font-black text-slate-800 mb-1">YOU</span>
          <div className="h-16 w-0.5 bg-black" />
        </div>

        {/* The 4 color segments */}
        <div className="grid grid-cols-4 h-12 w-full gap-1 items-stretch">
          <div className="bg-[#ffe4e1] flex items-end justify-start p-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">Needs Improvement</span>
          </div>
          <div className="bg-[#fff9e6] flex items-end justify-start p-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">Below Target</span>
          </div>
          <div className="bg-[#7fcdbb] flex items-end justify-start p-2">
            <span className="text-[10px] font-bold text-[#005bb7] uppercase leading-none">Target</span>
          </div>
          <div className="bg-[#d9ece8] flex items-end justify-start p-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">Above Target</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExamRunContent() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const examId = searchParams.get('id');
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
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

  // Constants
  const SECTION_SIZE = 60;

  useEffect(() => {
    async function fetchQuestions() {
      if (!examId || !user || !db) return;
      setIsLoading(true);
      try {
        const qRef = collection(db, 'questions');
        // Séparation : On ne charge que les questions assignées à cet examen précis via sourceIds
        const q = query(qRef, 
          where('sourceIds', 'array-contains', examId), 
          where('isActive', '==', true)
        );
        const snap = await getDocs(q);
        
        if (snap.empty) {
          toast({ variant: "destructive", title: "Examen vide", description: "Veuillez importer des questions pour cette simulation." });
          router.push('/dashboard/exam');
          return;
        }

        const fetched = snap.docs.map(d => ({ 
          ...d.data(), 
          id: d.id,
          text: d.data().text || d.data().statement,
          choices: d.data().choices || d.data().options?.map((o: any) => o.text)
        }));
        
        // Trier par index si disponible, sinon stable
        fetched.sort((a, b) => (a.index || 0) - (b.index || 0));
        setQuestions(fetched);
        
        // Temps total proportionnel (ratio PMP : 230m / 180 questions)
        const totalMinutes = (fetched.length * 230) / 180;
        setTimeLeft(Math.floor(totalMinutes * 60));
      } catch (e) {
        console.error(e);
        toast({ variant: "destructive", title: "Erreur de chargement" });
      } finally {
        setIsLoading(false);
      }
    }
    fetchQuestions();
  }, [db, examId, user, router, toast]);

  useEffect(() => {
    let timer: any;
    if (viewMode === 'question' && !isPaused && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && !result && viewMode === 'question' && !isLoading && questions.length > 0) {
      finishExam();
    }
    return () => clearInterval(timer);
  }, [viewMode, isPaused, timeLeft, result, isLoading, questions.length]);

  useEffect(() => {
    let timer: any;
    if (viewMode === 'break' && breakTimeLeft > 0) {
      timer = setInterval(() => setBreakTimeLeft(prev => prev - 1), 1000);
    } else if (breakTimeLeft === 0 && viewMode === 'break') {
      startNextSection();
    }
    return () => clearInterval(timer);
  }, [viewMode, breakTimeLeft]);

  const formatMMSS = (seconds: number) => {
    if (seconds < 0) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getSectionIndices = (sectionNum: number) => {
    const start = (sectionNum - 1) * SECTION_SIZE;
    const end = Math.min(sectionNum * SECTION_SIZE - 1, questions.length - 1);
    return { start, end };
  };

  const { start: sectionStart, end: sectionEnd } = getSectionIndices(currentSection);
  const currentSectionQuestions = questions.slice(sectionStart, sectionEnd + 1);

  const toggleFlag = () => {
    const qId = questions[currentIndex].id;
    setFlagged(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  const toggleAnswer = (qId: string, optId: string, isMultiple: boolean) => {
    const current = answers[qId] || [];
    if (isMultiple) {
      if (current.includes(optId)) {
        setAnswers({ ...answers, [qId]: current.filter(id => id !== optId) });
      } else {
        setAnswers({ ...answers, [qId]: [...current, optId] });
      }
    } else {
      setAnswers({ ...answers, [qId]: [optId] });
    }
  };

  const startNextSection = () => {
    if (currentSection < 3) {
      const nextIdx = currentSection * SECTION_SIZE;
      if (nextIdx < questions.length) {
        setCurrentSection(prev => prev + 1);
        setCurrentIndex(nextIdx);
        setViewMode('question');
        setBreakTimeLeft(10 * 60);
      } else {
        finishExam();
      }
    } else {
      finishExam();
    }
  };

  const finishExam = async () => {
    if (isSubmitting || questions.length === 0) return;
    setIsSubmitting(true);
    
    const detailedResults: any[] = [];
    let correct = 0;

    questions.forEach(q => {
      const correctOptionIds = q.correctOptionIds || [String(q.correctChoice || "1")];
      const userChoices = answers[q.id] || [];
      
      const isUserCorrect = userChoices.length === correctOptionIds.length && 
                            userChoices.every(id => correctOptionIds.includes(id));
      
      if (isUserCorrect) correct++;

      detailedResults.push({
        questionId: q.id,
        text: q.text,
        choices: q.choices,
        correctOptionIds: correctOptionIds,
        userChoices: userChoices,
        isCorrect: isUserCorrect,
        explanation: q.explanation,
        tags: q.tags || {}
      });
    });

    const percent = Math.round((correct / questions.length) * 100);
    
    let performance = "Needs Improvement";
    if (percent >= 75) performance = "Above Target";
    else if (percent >= 50) performance = "Target";
    else if (percent >= 25) performance = "Below Target";

    const finalData = {
      examId,
      userId: user?.uid,
      scorePercent: percent,
      correctCount: correct,
      totalQuestions: questions.length,
      performance,
      durationSec: (questions.length * 230 / 180) * 60 - (timeLeft > 0 ? timeLeft : 0),
      submittedAt: serverTimestamp(),
      responses: detailedResults
    };

    try {
      await addDoc(collection(db, 'coachingAttempts'), finalData);
      setResult(finalData);
      setViewMode('result');
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur sauvegarde score" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  if (viewMode === 'result' && result) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Card className="max-w-5xl w-full border-none shadow-none p-12 space-y-10 bg-white">
          <PerformanceScale score={result.scorePercent} />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 border-t border-slate-100">
            <div className="bg-slate-50 p-6 rounded-3xl border-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Score</p>
              <p className="text-4xl font-black italic text-primary">{result.scorePercent}%</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl border-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Correct Answers</p>
              <p className="text-4xl font-black italic text-slate-700">{result.correctCount}/{result.totalQuestions}</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl border-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Time Spent</p>
              <p className="text-4xl font-black italic text-slate-700">{Math.floor(result.durationSec / 60)}m</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <Button variant="outline" className="flex-1 h-16 rounded-2xl border-4 font-black uppercase tracking-widest text-lg italic" asChild>
              <Link href="/dashboard/history">Voir mon Historique</Link>
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
            <h2 className="text-4xl font-black italic uppercase tracking-tighter text-emerald-600">Pause de 10 Minutes</h2>
            <p className="text-xl font-bold text-slate-500 italic">Prenez une pause. La section suivante commence bientôt.</p>
          </div>
          <div className="text-8xl font-black italic tabular-nums text-slate-800 bg-slate-50 py-8 rounded-3xl border-2 border-dashed border-emerald-100">
            {formatMMSS(breakTimeLeft)}
          </div>
          <Button onClick={startNextSection} className="h-20 w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-xl shadow-xl scale-105 transition-transform">
            REPRENDRE MAINTENANT
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
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2">Vérifiez vos réponses avant de valider cette section.</p>
          </div>

          <Card className="rounded-[40px] shadow-2xl border-none bg-white p-10">
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-3 mb-10">
              {currentSectionQuestions.map((q, idx) => {
                const globalIdx = sectionStart + idx;
                const isAnswered = (answers[q.id]?.length || 0) > 0;
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
                RETOUR AUX QUESTIONS
              </Button>
              <Button 
                className="flex-1 h-16 rounded-2xl bg-red-600 hover:bg-red-700 font-black uppercase tracking-widest shadow-xl text-white"
                onClick={currentSection < 3 && (currentSection * SECTION_SIZE < questions.length) ? () => setViewMode('break') : finishExam}
              >
                {currentSection < 3 && (currentSection * SECTION_SIZE < questions.length) ? "VALIDER ET PAUSE" : "VALIDER L'EXAMEN"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progressPercent = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const currentAnswers = answers[currentQuestion?.id] || [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="bg-black text-white px-8 py-4 flex items-center justify-between shadow-xl sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setIsPaused(true)} className="text-white hover:bg-white/10 rounded-full border border-white/30 h-10 px-4">
            <Pause className="h-4 w-4 mr-2" /> Pause
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowCalculator(true)} className="text-white hover:bg-white/10 rounded-full border border-white/30 h-10 px-4">
            <CalcIcon className="h-4 w-4 mr-2" /> Calculator
          </Button>
        </div>

        <div className="text-center">
          <p className="font-black italic uppercase tracking-widest text-lg">
            Question {currentIndex + 1} of {questions.length}
          </p>
        </div>

        <div className="flex items-center gap-6">
          <Button 
            variant="ghost" 
            onClick={toggleFlag}
            className={cn(
              "h-10 px-6 rounded-full border border-white/30 transition-all",
              flagged[currentQuestion?.id] ? "bg-amber-500 text-white border-amber-400" : "text-white hover:bg-white/10"
            )}
          >
            <Flag className={cn("h-4 w-4 mr-2", flagged[currentQuestion?.id] && "fill-current")} /> Flag
          </Button>
          
          <div className="text-3xl font-black italic tabular-nums">
            {formatMMSS(timeLeft)}
          </div>
        </div>
      </div>

      <main className="flex-1 p-8 max-w-5xl mx-auto w-full space-y-8 pb-32">
        <div className="space-y-2">
          <Progress value={progressPercent} className="h-2 rounded-full bg-slate-200" />
          <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
            <span>Section {currentSection} / 3</span>
            <span>{Math.round(progressPercent)}% Complété</span>
          </div>
        </div>
        
        <Card className="rounded-[40px] shadow-2xl border-none bg-white overflow-hidden min-h-[450px]">
          <CardContent className="p-12 space-y-10">
            <div className="space-y-6">
              {currentQuestion?.isMultipleCorrect && (
                <Badge className="bg-indigo-100 text-indigo-600 border-none font-black italic uppercase text-[10px] py-1 px-4">
                  Plusieurs réponses à sélectionner
                </Badge>
              )}
              <h2 className="text-2xl font-black text-slate-800 italic leading-relaxed">
                {currentQuestion?.text}
              </h2>

              {currentQuestion?.imageUrl && (
                <div className="rounded-[32px] overflow-hidden border-4 border-slate-100 shadow-inner bg-slate-50 p-4">
                  <img 
                    src={currentQuestion.imageUrl} 
                    alt="Illustration" 
                    className="max-h-[400px] w-auto mx-auto object-contain rounded-2xl"
                  />
                </div>
              )}
            </div>

            <div className="grid gap-4">
              {currentQuestion?.choices?.map((opt: string, idx: number) => {
                const optId = String(idx + 1);
                const isSelected = currentAnswers.includes(optId);
                
                return (
                  <div 
                    key={idx} 
                    onClick={() => toggleAnswer(currentQuestion.id, optId, currentQuestion.isMultipleCorrect)}
                    className={cn(
                      "p-6 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-6 shadow-sm",
                      isSelected ? "border-primary bg-primary/5 scale-[1.01]" : "border-slate-100 hover:border-slate-300"
                    )}
                  >
                    <div className={cn(
                      "h-10 w-10 flex items-center justify-center font-black text-sm shrink-0 border-2",
                      currentQuestion.isMultipleCorrect ? "rounded-xl" : "rounded-full",
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

      <div className="fixed bottom-0 left-0 lg:left-64 right-0 bg-white border-t-2 p-6 flex items-center justify-between shadow-2xl z-40">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            className="h-14 px-8 rounded-2xl border-4 font-black uppercase tracking-widest italic" 
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === sectionStart}
          >
            <ChevronLeft className="mr-2 h-5 w-5" /> Previous
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => setShowNavigator(!showNavigator)}
            className="h-14 px-8 rounded-2xl border-4 font-black uppercase tracking-widest italic hover:bg-slate-50"
          >
            <LayoutGrid className="mr-2 h-5 w-5" /> Navigator
          </Button>
        </div>

        {currentIndex === sectionEnd || currentIndex === questions.length - 1 ? (
          <Button 
            onClick={() => setViewMode('review')}
            className="h-14 px-10 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest italic shadow-xl"
          >
            REVIEW SECTION {currentSection}
          </Button>
        ) : (
          <Button 
            onClick={() => setCurrentIndex(currentIndex + 1)}
            className="h-14 px-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest italic shadow-xl"
          >
            Next <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        )}
      </div>

      {showNavigator && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center pb-32 px-4 pointer-events-none">
          <Card className="w-full max-w-4xl p-8 rounded-[40px] shadow-3xl bg-white border-4 border-primary/20 pointer-events-auto animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black italic uppercase tracking-tight text-primary">Navigator - Section {currentSection}</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowNavigator(false)} className="rounded-full h-10 w-10 border-2"><X /></Button>
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-10 gap-3 overflow-y-auto max-h-[350px] p-2">
              {currentSectionQuestions.map((q, idx) => {
                const globalIdx = sectionStart + idx;
                const isAnswered = (answers[q.id]?.length || 0) > 0;
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
                      "h-12 w-12 rounded-xl font-black text-sm transition-all relative border-2 flex items-center justify-center",
                      isCurrent ? "border-primary bg-primary text-white scale-110 z-10" : 
                      isFlagged ? "bg-amber-100 border-amber-400 text-amber-700" :
                      isAnswered ? "bg-primary/10 border-primary/20 text-primary" : "bg-slate-50 border-slate-100 text-slate-300"
                    )}
                  >
                    {globalIdx + 1}
                    {isFlagged && <Flag className="absolute -top-1 -right-1 w-3 h-3 text-amber-600 fill-current" />}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {showCalculator && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto">
            <Calculator onClose={() => setShowCalculator(false)} />
          </div>
        </div>
      )}

      {isPaused && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center pointer-events-auto">
          <div className="text-center space-y-8">
            <h2 className="text-6xl font-black uppercase italic text-white tracking-tighter">EXAMEN EN PAUSE</h2>
            <Button onClick={() => setIsPaused(false)} className="h-20 px-16 rounded-[28px] bg-white text-black text-2xl font-black uppercase tracking-widest shadow-2xl scale-110 hover:scale-115 transition-transform">
              REPRENDRE
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
