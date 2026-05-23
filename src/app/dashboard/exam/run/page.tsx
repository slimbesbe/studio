"use client";

import { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, setDoc, increment, writeBatch } from 'firebase/firestore';
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
  MoveRight,
  Layers,
  Globe,
  ListChecks,
  Play
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Calculator } from '@/components/dashboard/Calculator';
import { logActivity } from '@/lib/services/logging-service';
import { saveExamState, getExamState, clearExamState } from '@/lib/services/exam-state-service';

type ViewMode = 'question' | 'review' | 'break' | 'result';

function PerformanceScale({ score }: { score: number }) {
  const isPass = score >= 70;
  const cursorLeft = `${score}%`;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-[2vh] py-[1vh] animate-fade-in flex-none">
      <div className="text-left space-y-[0.5vh]">
        <h2 className="text-[clamp(1rem,2.5vh,2rem)] font-medium text-slate-700 leading-tight">
          Your Overall Performance: <span className={cn("font-bold", isPass ? "text-[#005bb7]" : "text-destructive")}>
            {isPass ? 'Pass' : 'Fail'}
          </span>
        </h2>
        <p className="text-slate-500 text-[clamp(0.7rem,1.4vh,1rem)] leading-tight italic">
          {isPass 
            ? "Congratulations! You passed your exam and have earned your PMP certification." 
            : "Focus on the areas indicated below to improve for your next attempt."}
        </p>
      </div>

      <div className="relative pt-[4vh] pb-[6vh]">
        <div className="absolute top-0 left-0 w-full flex justify-between text-[1vh] font-bold text-slate-400 uppercase tracking-widest px-2">
          <div className="flex items-center gap-2"><MoveLeft className="h-[1.2vh] w-[1.2vh]" /> Failing</div>
          <div className="flex items-center gap-2">Passing <MoveRight className="h-[1.2vh] w-[1.2vh]" /></div>
        </div>

        <div className="absolute top-[2.5vh] left-0 w-full h-px bg-sky-400 flex items-center justify-center">
          <div className="h-[1vh] w-px bg-sky-400" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 border-y-[0.4vh] border-y-transparent border-r-[0.6vh] border-r-sky-400" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 border-y-[0.4vh] border-y-transparent border-l-[0.6vh] border-l-sky-400" />
        </div>

        <div className="absolute top-[1.5vh] z-20 flex flex-col items-center transition-all duration-1000 ease-out" style={{ left: cursorLeft }}>
          <span className="text-[1.1vh] font-black text-slate-800 mb-[0.2vh]">YOU</span>
          <div className="h-[8vh] w-0.5 bg-black" />
        </div>

        <div className="grid grid-cols-4 h-[6vh] w-full gap-[0.2vw] items-stretch">
          <div className="bg-[#ffe4e1] flex items-end justify-start p-[0.5vh]"><span className="text-[0.9vh] font-bold text-slate-400 uppercase leading-none">Needs Improvement</span></div>
          <div className="bg-[#fff9e6] flex items-end justify-start p-[0.5vh]"><span className="text-[0.9vh] font-bold text-slate-400 uppercase leading-none">Below Target</span></div>
          <div className="bg-[#7fcdbb] flex items-end justify-start p-[0.5vh]"><span className="text-[0.9vh] font-bold text-[#005bb7] uppercase leading-none">Target</span></div>
          <div className="bg-[#d9ece8] flex items-end justify-start p-[0.5vh]"><span className="text-[0.9vh] font-bold text-slate-400 uppercase leading-none">Above Target</span></div>
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
  const shouldResume = searchParams.get('resume') === 'true';
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<ViewMode>('question');
  const [timeLeft, setTimeLeft] = useState(0); 
  const [totalTime, setTotalTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const triggerSave = useCallback((override?: Partial<any>) => {
    if (!user || !examId) return;
    
    const state = {
      examId,
      status: 'in_progress' as const,
      currentIndex: override?.currentIndex ?? currentIndex,
      answers: override?.answers ?? answers,
      flagged: override?.flagged ?? flagged,
      timeLeft: override?.timeLeft ?? timeLeft,
      currentSection: 1, // simplified for now
    };
    saveExamState(db, user.uid, state);
  }, [db, user, examId, currentIndex, answers, flagged, timeLeft]);

  useEffect(() => {
    async function fetchQuestions() {
      if (!examId || !user || !db) return;
      setIsLoading(true);
      try {
        const qRef = collection(db, 'questions');
        const q = query(qRef, where('sourceIds', 'array-contains', examId), where('isActive', '==', true));
        const snap = await getDocs(q);
        if (snap.empty) {
          toast({ variant: "destructive", title: "Examen vide" });
          router.push('/dashboard/exam');
          return;
        }
        const fetched = snap.docs.map(d => ({ 
          ...d.data(), id: d.id,
          text: d.data().text || d.data().statement,
          choices: d.data().choices || d.data().options?.map((o: any) => o.text)
        }));
        fetched.sort((a, b) => (a.index || 0) - (b.index || 0));
        setQuestions(fetched);
        
        let initialTime = Math.floor(((fetched.length * 230) / 180) * 60);
        let initialIdx = 0;
        let initialAnswers = {};
        let initialFlags = {};

        if (shouldResume) {
          const state = await getExamState(db, user.uid);
          if (state && state.examId === examId) {
            initialTime = state.timeLeft;
            initialIdx = state.currentIndex;
            initialAnswers = state.answers || {};
            initialFlags = state.flagged || {};
          }
        }

        setTimeLeft(initialTime);
        setTotalTime(Math.floor(((fetched.length * 230) / 180) * 60));
        setCurrentIndex(initialIdx);
        setAnswers(initialAnswers);
        setFlagged(initialFlags);

        logActivity(db, user.uid, shouldResume ? 'exam_resumed' : 'exam_started', { examId });
      } catch (e) {
        toast({ variant: "destructive", title: "Erreur" });
      } finally { setIsLoading(false); }
    }
    fetchQuestions();
  }, [db, examId, user, router, toast, shouldResume]);

  useEffect(() => {
    let timer: any;
    if (viewMode === 'question' && !isPaused && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          const next = prev - 1;
          if (next > 0 && next % 30 === 0) triggerSave({ timeLeft: next });
          return next;
        });
      }, 1000);
    } else if (timeLeft === 0 && !result && viewMode === 'question' && !isLoading && questions.length > 0) {
      finishExam();
    }
    return () => clearInterval(timer);
  }, [viewMode, isPaused, timeLeft, result, isLoading, questions.length, triggerSave]);

  const toggleFlag = () => {
    const qId = questions[currentIndex].id;
    const nextFlags = { ...flagged, [qId]: !flagged[qId] };
    setFlagged(nextFlags);
    triggerSave({ flagged: nextFlags });
  };

  const toggleAnswer = (qId: string, optId: string, isMultiple: boolean) => {
    const current = answers[qId] || [];
    let nextAnswers;
    if (isMultiple) {
      nextAnswers = { ...answers, [qId]: current.includes(optId) ? current.filter(id => id !== optId) : [...current, optId] };
    } else {
      nextAnswers = { ...answers, [qId]: [optId] };
    }
    setAnswers(nextAnswers);
    triggerSave({ answers: nextAnswers });
  };

  const finishExam = async () => {
    if (isSubmitting || questions.length === 0) return;
    setIsSubmitting(true);
    
    let correct = 0;
    const domainStats: Record<string, { correct: number, total: number }> = { 'People': { correct: 0, total: 0 }, 'Process': { correct: 0, total: 0 }, 'Business': { correct: 0, total: 0 } };
    const approachStats: Record<string, { correct: number, total: number }> = { 'Predictive': { correct: 0, total: 0 }, 'Agile': { correct: 0, total: 0 }, 'Hybrid': { correct: 0, total: 0 } };
    const responses: any[] = [];

    const batch = writeBatch(db);

    questions.forEach(q => {
      const correctIds = (q.correctOptionIds || [String(q.correctChoice || "1")]).map(id => String(id));
      const userChoices = (answers[q.id] || []).map(id => String(id));
      const isUserCorrect = userChoices.length === correctIds.length && userChoices.every(id => correctIds.includes(id));
      
      if (isUserCorrect) correct++;
      
      const domain = q.tags?.domain === 'Processus' ? 'Process' : (q.tags?.domain || 'Process');
      if (domainStats[domain]) { domainStats[domain].total++; if (isUserCorrect) domainStats[domain].correct++; }
      
      const approach = q.tags?.approach || 'Predictive';
      if (approachStats[approach]) { approachStats[approach].total++; if (isUserCorrect) approachStats[approach].correct++; }

      responses.push({ questionId: q.id, userChoices, isCorrect: isUserCorrect, tags: q.tags || {} });

      const kmRef = doc(db, 'users', user!.uid, 'killMistakes', q.id);
      if (!isUserCorrect && userChoices.length > 0) {
        batch.set(kmRef, {
          status: 'wrong',
          wrongCount: increment(1),
          lastWrongAt: serverTimestamp(),
          questionId: q.id,
          lastSelectedChoiceIds: userChoices,
          tags: q.tags || {},
          sourceType: 'exam'
        }, { merge: true });
      } else if (isUserCorrect) {
        batch.set(kmRef, {
          status: 'corrected',
          lastCorrectAt: serverTimestamp(),
          questionId: q.id,
          tags: q.tags || {}
        }, { merge: true });
      }
    });

    const percent = Math.round((correct / questions.length) * 100);
    const finalData = {
      examId, userId: user?.uid, scorePercent: percent, correctCount: correct, totalQuestions: questions.length,
      durationSec: totalTime - timeLeft, submittedAt: serverTimestamp(), responses,
      domainBreakdown: domainStats, approachBreakdown: approachStats
    };

    try {
      await batch.commit();
      await addDoc(collection(db, 'coachingAttempts'), finalData);
      if (user) clearExamState(db, user.uid);
      setResult(finalData);
      setViewMode('result');
      logActivity(db, user!.uid, 'exam_completed', { examId, score: percent });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur sauvegarde" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatMMSS = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (viewMode === 'result' && result) {
    return (
      <div className="h-full w-full bg-[#F8FAFC] p-[2vh] overflow-hidden flex flex-col animate-fade-in">
        <Card className="flex-1 border-none shadow-2xl rounded-[4vh] bg-white overflow-hidden flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-[4vh] space-y-[4vh] custom-scrollbar min-h-0">
            <PerformanceScale score={result.scorePercent} />
            <div className="grid grid-cols-3 gap-[2vh] flex-none">
              <div className="bg-[#F1F5F9] p-[3vh] rounded-[2vh] text-center">
                <p className="text-[1vh] font-black text-slate-400 uppercase tracking-widest">TOTAL SCORE</p>
                <p className="text-[5vh] font-black italic text-[#1d4ed8] tracking-tighter">{result.scorePercent}%</p>
              </div>
              <div className="bg-[#F1F5F9] p-[3vh] rounded-[2vh] text-center">
                <p className="text-[1vh] font-black text-slate-400 uppercase tracking-widest">CORRECT</p>
                <p className="text-[5vh] font-black italic text-slate-800 tracking-tighter">{result.correctCount}/{result.totalQuestions}</p>
              </div>
              <div className="bg-[#F1F5F9] p-[3vh] rounded-[2vh] text-center">
                <p className="text-[1vh] font-black text-slate-400 uppercase tracking-widest">TIME</p>
                <p className="text-[5vh] font-black italic text-slate-800 tracking-tighter">{Math.ceil(result.durationSec / 60)}m</p>
              </div>
            </div>
          </div>
          <div className="flex-none p-[3vh] border-t-2 border-dashed flex gap-[2vh] bg-slate-50">
            <Button variant="outline" className="flex-1 h-[8vh] rounded-2xl border-4 font-black uppercase text-[1.5vh]" asChild><Link href="/dashboard/history">HISTORIQUE</Link></Button>
            <Button className="flex-1 h-[8vh] rounded-2xl bg-[#1d4ed8] font-black uppercase text-[1.5vh] shadow-xl" asChild><Link href="/dashboard">TABLEAU DE BORD</Link></Button>
          </div>
        </Card>
      </div>
    );
  }

  if (viewMode === 'review') {
    return (
      <div className="h-full w-full bg-slate-50 flex flex-col overflow-hidden animate-fade-in">
        <header className="flex-none bg-black text-white px-[4vw] py-[1.5vh] flex items-center justify-between shadow-xl z-50 h-[8vh]">
          <div className="flex items-center gap-[1vw]">
            <Button variant="ghost" onClick={() => setViewMode('question')} className="text-white hover:bg-white/10 rounded-full border border-white/30 h-[5vh] px-[2vw] text-[1.2vh]"><Play className="h-[1.5vh] w-[1.5vh] mr-2 fill-white" /> Resume Exam</Button>
          </div>
          <div className="text-center font-black italic uppercase tracking-widest text-[clamp(0.8rem,2vh,1.5rem)]">Review Section</div>
          <div className="text-[3vh] font-black italic tabular-nums">{formatMMSS(timeLeft)}</div>
        </header>

        <main className="flex-1 p-[4vh] overflow-y-auto custom-scrollbar">
          <div className="max-w-6xl mx-auto space-y-[4vh]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-[2vh]">
               <div className="bg-white p-[2vh] rounded-[2vh] shadow-sm border flex items-center gap-[1vw]">
                  <div className="h-[2vh] w-[2vh] bg-[#1d4ed8] rounded-full" />
                  <span className="font-bold text-[1.2vh] uppercase text-slate-500">Answered</span>
               </div>
               <div className="bg-white p-[2vh] rounded-[2vh] shadow-sm border flex items-center gap-[1vw]">
                  <div className="h-[2vh] w-[2vh] bg-slate-200 rounded-full" />
                  <span className="font-bold text-[1.2vh] uppercase text-slate-500">Not Answered</span>
               </div>
               <div className="bg-white p-[2vh] rounded-[2vh] shadow-sm border flex items-center gap-[1vw]">
                  <div className="h-[2vh] w-[2vh] bg-amber-500 rounded-full" />
                  <span className="font-bold text-[1.2vh] uppercase text-slate-500">Flagged</span>
               </div>
            </div>

            <Card className="rounded-[3vh] border-none shadow-xl bg-white p-[4vh]">
              <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-15 gap-[1vh]">
                {questions.map((q, idx) => {
                  const isAnswered = answers[q.id]?.length > 0;
                  const isFlagged = flagged[q.id];
                  return (
                    <button
                      key={q.id}
                      onClick={() => { setCurrentIndex(idx); setViewMode('question'); }}
                      className={cn(
                        "aspect-square rounded-xl flex items-center justify-center font-black text-[1.5vh] transition-all hover:scale-110 relative border-2",
                        isFlagged ? "bg-amber-50 border-amber-500 text-amber-600 shadow-md" :
                        isAnswered ? "bg-blue-50 border-[#1d4ed8] text-[#1d4ed8]" :
                        "bg-slate-50 border-slate-200 text-slate-400"
                      )}
                    >
                      {idx + 1}
                      {isFlagged && <Flag className="absolute -top-1 -right-1 h-[1vh] w-[1vh] fill-current" />}
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>
        </main>

        <footer className="flex-none h-[10vh] bg-white border-t-2 px-[4vw] flex items-center justify-end shadow-2xl z-40 gap-[1vw]">
          <Button variant="outline" className="h-[6vh] px-[2vw] rounded-xl border-2 font-black uppercase text-[1.2vh] italic" onClick={() => setViewMode('question')}>Continue Exam</Button>
          <Button onClick={finishExam} disabled={isSubmitting} className="h-[6vh] px-[3vw] rounded-xl bg-red-600 text-white font-black uppercase text-[1.2vh] italic shadow-xl">Finish Exam</Button>
        </footer>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progressPercent = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const currentAnswers = answers[currentQuestion?.id] || [];

  return (
    <div className="h-full w-full bg-slate-50 flex flex-col overflow-hidden relative">
      <header className="flex-none bg-black text-white px-[4vw] py-[1.5vh] flex items-center justify-between shadow-xl z-50 h-[8vh]">
        <div className="flex items-center gap-[1vw]">
          <Button variant="ghost" onClick={() => setIsPaused(true)} className="text-white hover:bg-white/10 rounded-full border border-white/30 h-[5vh] px-[2vw] text-[1.2vh]"><Pause className="h-[1.5vh] w-[1.5vh] mr-2" /> Pause</Button>
          <Button variant="ghost" onClick={() => setShowCalculator(true)} className="text-white hover:bg-white/10 rounded-full border border-white/30 h-[5vh] px-[2vw] text-[1.2vh]"><CalcIcon className="h-[1.5vh] w-[1.5vh] mr-2" /> Calculator</Button>
        </div>
        <div className="text-center font-black italic uppercase tracking-widest text-[clamp(0.8rem,2vh,1.5rem)]">Question {currentIndex + 1} of {questions.length}</div>
        <div className="flex items-center gap-[2vw]">
          <Button variant="ghost" onClick={toggleFlag} className={cn("h-[5vh] px-[2vw] rounded-full border border-white/30 text-[1.2vh]", flagged[currentQuestion?.id] ? "bg-amber-500 text-white border-amber-400" : "text-white")}>
            <Flag className={cn("h-[1.5vh] w-[1.5vh] mr-2", flagged[currentQuestion?.id] && "fill-current")} /> Flag
          </Button>
          <div className="text-[3vh] font-black italic tabular-nums">{formatMMSS(timeLeft)}</div>
        </div>
      </header>

      <main className="flex-1 p-[2vh] flex flex-col min-h-0 w-full max-w-[1200px] mx-auto gap-[1.5vh]">
        <Progress value={progressPercent} className="h-[0.8vh] rounded-full" />
        <Card className="flex-1 rounded-[3vh] shadow-2xl border-none bg-white overflow-hidden flex flex-col min-h-0">
          <CardContent className="flex-1 overflow-y-auto p-[4vh] flex flex-col gap-[3vh] custom-scrollbar">
            <div className="flex-none space-y-[2vh]">
              {currentQuestion?.isMultipleCorrect && <Badge className="bg-indigo-100 text-indigo-600 border-none font-black italic uppercase text-[1vh] py-[0.5vh] px-[2vh]">Multiple Selection</Badge>}
              <h2 className="text-[clamp(1rem,2.2vh,1.8rem)] font-black text-slate-800 italic leading-relaxed">{currentQuestion?.text}</h2>
              
              {currentQuestion?.imageUrl && (
                <div className="rounded-[2vh] overflow-hidden border-2 border-slate-100 bg-white p-[0.5vh] flex justify-center shadow-md mt-[1vh]">
                  <img 
                    src={currentQuestion.imageUrl} 
                    alt="Question Illustration" 
                    className="max-h-[40vh] w-full object-contain rounded-lg"
                  />
                </div>
              )}
            </div>
            <div className="grid gap-[1vh] flex-none">
              {currentQuestion?.choices?.map((opt: string, idx: number) => {
                const optId = String(idx + 1);
                const isSelected = currentAnswers.includes(optId);
                return (
                  <button key={idx} onClick={() => toggleAnswer(currentQuestion.id, optId, currentQuestion.isMultipleCorrect)} className={cn("p-[2vh] rounded-xl border-2 transition-all text-left flex items-center gap-[2vh] shadow-sm", isSelected ? "border-primary bg-primary/5 scale-[1.01]" : "border-slate-100 bg-white hover:border-slate-300")}>
                    <div className={cn("h-[4vh] w-[4vh] flex items-center justify-center font-black text-[1.5vh] shrink-0 border-2", currentQuestion.isMultipleCorrect ? "rounded-lg" : "rounded-full", isSelected ? "bg-primary text-white border-primary" : "bg-white text-slate-400")}>{String.fromCharCode(65 + idx)}</div>
                    <span className={cn("flex-1 text-[clamp(0.8rem,1.8vh,1.2rem)] font-black italic", isSelected ? "text-slate-900" : "text-slate-600")}>{opt}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="flex-none h-[10vh] bg-white border-t-2 px-[4vw] flex items-center justify-between shadow-2xl z-40">
        <Button variant="outline" className="h-[6vh] px-[2vw] rounded-xl border-2 font-black uppercase text-[1.2vh] italic" onClick={() => { const next = Math.max(0, currentIndex - 1); setCurrentIndex(next); triggerSave({ currentIndex: next }); }} disabled={currentIndex === 0}><ChevronLeft className="mr-2 h-[1.5vh] w-[1.5vh]" /> Previous</Button>
        <div className="flex gap-[1vw]">
           <Button variant="outline" onClick={() => setViewMode('review')} className="h-[6vh] px-[2vw] rounded-xl border-2 font-black uppercase text-[1.2vh] italic">Review Section</Button>
           {currentIndex === questions.length - 1 ? (
             <Button onClick={finishExam} disabled={isSubmitting} className="h-[6vh] px-[3vw] rounded-xl bg-red-600 text-white font-black uppercase text-[1.2vh] italic shadow-xl">Finish Exam</Button>
           ) : (
             <Button onClick={() => { const next = currentIndex + 1; setCurrentIndex(next); triggerSave({ currentIndex: next }); }} className="h-[6vh] px-[3vw] rounded-xl bg-primary text-white font-black uppercase text-[1.2vh] italic shadow-xl">Next <ChevronRight className="ml-2 h-4 w-4" /></Button>
           )}
        </div>
      </footer>
      {showCalculator && <Calculator onClose={() => setShowCalculator(false)} />}
    </div>
  );
}

export default function ExamRunPage() {
  return <Suspense fallback={<Loader2 className="animate-spin" />}><ExamRunContent /></Suspense>;
}
