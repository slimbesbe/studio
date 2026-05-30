"use client";

import { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, increment, writeBatch } from 'firebase/firestore';
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
  Coffee,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Calculator } from '@/components/dashboard/Calculator';
import { logActivity } from '@/lib/services/logging-service';
import { saveExamState, getExamState, clearExamState } from '@/lib/services/exam-state-service';

type ViewMode = 'question' | 'review' | 'break' | 'result';

const SECTION_SIZE = 60;
const BREAK_DURATION = 10 * 60; // 10 minutes in seconds

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
  const [breakTimeLeft, setBreakTimeLeft] = useState(BREAK_DURATION);
  const [currentSection, setCurrentSection] = useState(1);

  const triggerSave = useCallback((override?: Partial<any>) => {
    if (!user || !examId) return;
    
    const state = {
      examId,
      status: 'in_progress' as const,
      currentIndex: override?.currentIndex ?? currentIndex,
      answers: override?.answers ?? answers,
      flagged: override?.flagged ?? flagged,
      timeLeft: override?.timeLeft ?? timeLeft,
      currentSection: override?.currentSection ?? currentSection,
    };
    saveExamState(db, user.uid, state);
  }, [db, user, examId, currentIndex, answers, flagged, timeLeft, currentSection]);

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
        let initialSection = 1;

        if (shouldResume) {
          const state = await getExamState(db, user.uid);
          if (state && state.examId === examId) {
            initialTime = state.timeLeft;
            initialIdx = state.currentIndex;
            initialAnswers = state.answers || {};
            initialFlags = state.flagged || {};
            initialSection = state.currentSection || 1;
          }
        }

        setTimeLeft(initialTime);
        setTotalTime(Math.floor(((fetched.length * 230) / 180) * 60));
        setCurrentIndex(initialIdx);
        setAnswers(initialAnswers);
        setFlagged(initialFlags);
        setCurrentSection(initialSection);

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

  useEffect(() => {
    let breakTimer: any;
    if (viewMode === 'break' && breakTimeLeft > 0) {
      breakTimer = setInterval(() => {
        setBreakTimeLeft(prev => {
          if (prev <= 1) {
            startNextSection();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(breakTimer);
  }, [viewMode, breakTimeLeft]);

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

  const startNextSection = () => {
    const nextS = currentSection + 1;
    setCurrentSection(nextS);
    setCurrentIndex((nextS - 1) * SECTION_SIZE);
    setBreakTimeLeft(BREAK_DURATION);
    setViewMode('question');
    triggerSave({ currentSection: nextS, currentIndex: (nextS - 1) * SECTION_SIZE });
  };

  const handleFinishSection = () => {
    setViewMode('review');
  };

  const startBreak = () => {
    if (currentSection === 3 || questions.length <= currentSection * SECTION_SIZE) {
      finishExam();
    } else {
      setViewMode('break');
      setBreakTimeLeft(BREAK_DURATION);
    }
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

  const currentSectionQuestions = useMemo(() => {
    const start = (currentSection - 1) * SECTION_SIZE;
    const end = Math.min(currentSection * SECTION_SIZE, questions.length);
    return questions.slice(start, end);
  }, [currentSection, questions]);

  const displayedTotalCount = useMemo(() => {
    return Math.min(currentSection * SECTION_SIZE, questions.length);
  }, [currentSection, questions]);

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
            <Button variant="outline" className="flex-1 h-8vh rounded-2xl border-4 font-black uppercase text-[1.5vh]" asChild><Link href="/dashboard/history">HISTORIQUE</Link></Button>
            <Button className="flex-1 h-8vh rounded-2xl bg-[#1d4ed8] font-black uppercase text-[1.5vh] shadow-xl" asChild><Link href="/dashboard">TABLEAU DE BORD</Link></Button>
          </div>
        </Card>
      </div>
    );
  }

  if (viewMode === 'break') {
    return (
      <div className="h-screen w-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-8 animate-fade-in">
        <Card className="max-w-2xl w-full rounded-[48px] border-none shadow-3xl bg-white p-16 text-center space-y-10">
          <div className="bg-indigo-50 w-24 h-24 rounded-[32px] flex items-center justify-center mx-auto shadow-inner">
            <Coffee className="h-12 w-12 text-indigo-600 animate-pulse" />
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">Pause Obligatoire</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs italic">Section {currentSection} terminée • Rechargez vos batteries</p>
          </div>
          
          <div className="bg-slate-50 p-10 rounded-[40px] border-4 border-dashed border-slate-100">
            <p className="text-7xl font-black italic text-indigo-600 tracking-tighter tabular-nums">
              {formatMMSS(breakTimeLeft)}
            </p>
            <p className="text-[10px] font-black uppercase text-slate-400 mt-4 tracking-[0.2em]">Temps de repos conseillé</p>
          </div>

          <div className="space-y-4">
            <Button onClick={startNextSection} className="h-16 w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest shadow-xl text-sm italic">
              REPRENDRE L'EXAMEN MAINTENANT
            </Button>
            <p className="text-[9px] font-bold text-slate-400 uppercase italic">L'examen reprendra automatiquement à la fin du chrono.</p>
          </div>
        </Card>
      </div>
    );
  }

  if (viewMode === 'review') {
    return (
      <div className="h-full w-full bg-slate-50 flex flex-col overflow-hidden animate-fade-in">
        <header className="flex-none bg-black text-white px-[4vw] py-[2vh] flex items-center justify-between shadow-xl z-50">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center"><LayoutGrid className="h-5 w-5" /></div>
            <h1 className="text-xl font-black italic uppercase tracking-tighter">Review Section {currentSection}</h1>
          </div>
          <div className="text-[2.5vh] font-black italic tabular-nums">{formatMMSS(timeLeft)}</div>
        </header>

        <main className="flex-1 p-[4vh] overflow-y-auto custom-scrollbar">
          <div className="max-w-6xl mx-auto space-y-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <StatItem label="Answered" val={currentSectionQuestions.filter(q => answers[q.id]?.length > 0).length} color="text-emerald-500" />
              <StatItem label="Unanswered" val={currentSectionQuestions.filter(q => !answers[q.id] || answers[q.id].length === 0).length} color="text-red-500" />
              <StatItem label="Flagged" val={currentSectionQuestions.filter(q => flagged[q.id]).length} color="text-amber-500" />
              <StatItem label="Total in Section" val={currentSectionQuestions.length} color="text-slate-400" />
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-3">
              {currentSectionQuestions.map((q, idx) => {
                const globalIdx = (currentSection - 1) * SECTION_SIZE + idx;
                const isAnswered = answers[q.id]?.length > 0;
                const isFlagged = flagged[q.id];
                return (
                  <button
                    key={q.id}
                    onClick={() => { setCurrentIndex(globalIdx); setViewMode('question'); }}
                    className={cn(
                      "h-14 w-full rounded-xl font-black text-sm transition-all border-4 flex items-center justify-center relative hover:scale-110",
                      isFlagged ? "border-amber-400 bg-amber-50 text-amber-700" :
                      isAnswered ? "border-emerald-400 bg-emerald-50 text-emerald-700" :
                      "border-slate-200 bg-white text-slate-400"
                    )}
                  >
                    {globalIdx + 1}
                    {isFlagged && <div className="absolute -top-1 -right-1 h-3 w-3 bg-amber-500 rounded-full border-2 border-white" />}
                  </button>
                );
              })}
            </div>

            <div className="bg-white p-8 rounded-[32px] shadow-xl border-4 border-slate-100 space-y-6">
              <div className="flex items-start gap-4 text-slate-500 italic font-bold text-sm">
                <Info className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                <p>Attention : Une fois que vous aurez validé cette section et pris votre pause, vous ne pourrez plus modifier vos réponses pour les questions 1 à {displayedTotalCount}.</p>
              </div>
              <Button onClick={startBreak} className="w-full h-16 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black uppercase tracking-widest text-lg shadow-2xl transition-transform hover:scale-[1.01]">
                {currentSection === 3 ? "FINISH EXAM" : "CONFIRM SECTION & TAKE BREAK"}
              </Button>
            </div>
          </div>
        </main>
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
        <div className="text-center font-black italic uppercase tracking-widest text-[clamp(0.8rem,2vh,1.5rem)]">
          Question {currentIndex + 1} of {displayedTotalCount}
        </div>
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
        <Button variant="outline" className="h-[6vh] px-[2vw] rounded-xl border-2 font-black uppercase text-[1.2vh] italic" onClick={() => { const next = Math.max((currentSection - 1) * SECTION_SIZE, currentIndex - 1); setCurrentIndex(next); triggerSave({ currentIndex: next }); }} disabled={currentIndex === (currentSection - 1) * SECTION_SIZE}><ChevronLeft className="mr-2 h-[1.5vh] w-[1.5vh]" /> Previous</Button>
        <div className="flex gap-[1vw]">
           <Button variant="outline" onClick={handleFinishSection} className="h-[6vh] px-[2vw] rounded-xl border-2 font-black uppercase text-[1.2vh] italic">Review Section</Button>
           {currentIndex === displayedTotalCount - 1 ? (
             <Button onClick={handleFinishSection} className="h-[6vh] px-[3vw] rounded-xl bg-indigo-600 text-white font-black uppercase text-[1.2vh] italic shadow-xl">Review & Break</Button>
           ) : (
             <Button onClick={() => { const next = currentIndex + 1; setCurrentIndex(next); triggerSave({ currentIndex: next }); }} className="h-[6vh] px-[3vw] rounded-xl bg-primary text-white font-black uppercase text-[1.2vh] italic shadow-xl">Next <ChevronRight className="ml-2 h-4 w-4" /></Button>
           )}
        </div>
      </footer>
      {showCalculator && <Calculator onClose={() => setShowCalculator(false)} />}
    </div>
  );
}

function StatItem({ label, val, color }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-slate-50 flex flex-col items-center justify-center">
      <p className={cn("text-3xl font-black italic leading-none mb-2", color)}>{val}</p>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">{label}</p>
    </div>
  );
}

export default function ExamRunPage() {
  return <Suspense fallback={<Loader2 className="animate-spin" />}><ExamRunContent /></Suspense>;
}
