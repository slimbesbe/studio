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
  MoveRight,
  Layers,
  Globe
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Calculator } from '@/components/dashboard/Calculator';

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
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<ViewMode>('question');
  const [timeLeft, setTimeLeft] = useState(0); 
  const [totalTime, setTotalTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showNavigator, setShowNavigator] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [breakTimeLeft, setBreakTimeLeft] = useState(10 * 60);
  const [currentSection, setCurrentSection] = useState(1);

  const SECTION_SIZE = 60;

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
        const totalMinutes = (fetched.length * 230) / 180;
        const initialSeconds = Math.floor(totalMinutes * 60);
        setTimeLeft(initialSeconds);
        setTotalTime(initialSeconds);
      } catch (e) {
        toast({ variant: "destructive", title: "Erreur" });
      } finally { setIsLoading(false); }
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
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const { start: sectionStart, end: sectionEnd } = useMemo(() => {
    const start = (currentSection - 1) * SECTION_SIZE;
    const end = Math.min(currentSection * SECTION_SIZE - 1, questions.length - 1);
    return { start, end };
  }, [currentSection, questions.length]);

  const currentSectionQuestions = useMemo(() => questions.slice(sectionStart, sectionEnd + 1), [questions, sectionStart, sectionEnd]);

  const toggleFlag = () => {
    const qId = questions[currentIndex].id;
    setFlagged(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  const toggleAnswer = (qId: string, optId: string, isMultiple: boolean) => {
    const current = answers[qId] || [];
    if (isMultiple) {
      setAnswers({ ...answers, [qId]: current.includes(optId) ? current.filter(id => id !== optId) : [...current, optId] });
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
      } else { finishExam(); }
    } else { finishExam(); }
  };

  const finishExam = async () => {
    if (isSubmitting || questions.length === 0) return;
    setIsSubmitting(true);
    
    // Pour l'affichage immédiat du résultat, on calcule le score localement
    let correct = 0;
    const domainStats: Record<string, { correct: number, total: number }> = { 'People': { correct: 0, total: 0 }, 'Process': { correct: 0, total: 0 }, 'Business': { correct: 0, total: 0 } };
    const approachStats: Record<string, { correct: number, total: number }> = { 'Predictive': { correct: 0, total: 0 }, 'Agile': { correct: 0, total: 0 }, 'Hybrid': { correct: 0, total: 0 } };
    
    // Architecture DYNAMIQUE : On ne stocke que les IDs et les réponses
    const minimalResponses: any[] = [];

    questions.forEach(q => {
      const correctIds = q.correctOptionIds || [String(q.correctChoice || "1")];
      const userChoices = answers[q.id] || [];
      const isUserCorrect = userChoices.length === correctIds.length && userChoices.every(id => correctIds.includes(id));
      
      if (isUserCorrect) correct++;
      
      const domain = q.tags?.domain === 'Processus' ? 'Process' : (q.tags?.domain || 'Process');
      if (domainStats[domain]) { domainStats[domain].total++; if (isUserCorrect) domainStats[domain].correct++; }
      
      const approach = q.tags?.approach || 'Predictive';
      if (approachStats[approach]) { approachStats[approach].total++; if (isUserCorrect) approachStats[approach].correct++; }

      minimalResponses.push({
        questionId: q.id,
        userChoices
      });
    });

    const percent = Math.round((correct / questions.length) * 100);
    const finalData = {
      examId, 
      userId: user?.uid, 
      // Le score total n'est plus stocké selon la consigne, mais pour le rendu immédiat on le garde en mémoire state
      durationSec: totalTime - timeLeft, 
      submittedAt: serverTimestamp(), 
      responses: minimalResponses
    };

    try { 
      await addDoc(collection(db, 'coachingAttempts'), finalData); 
      // On enrichit le résultat localement pour l'affichage final
      setResult({
        ...finalData,
        scorePercent: percent,
        correctCount: correct,
        totalQuestions: questions.length,
        domainBreakdown: domainStats,
        approachBreakdown: approachStats
      }); 
      setViewMode('result'); 
    }
    catch (e) { toast({ variant: "destructive", title: "Erreur sauvegarde" }); }
    finally { setIsSubmitting(false); }
  };

  if (isLoading) return <div className="h-full w-full flex items-center justify-center"><Loader2 className="animate-spin h-[8vh] w-[8vh] text-primary" /></div>;

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
            <div className="grid grid-cols-2 gap-[4vh] flex-none">
              <div className="space-y-[2vh]">
                <h3 className="text-[1.5vh] font-black italic uppercase tracking-tight flex items-center gap-2"><Layers className="h-[2vh] w-[2vh] text-[#1d4ed8]" /> Domains</h3>
                {Object.entries(result.domainBreakdown || {}).map(([domain, data]: any) => {
                  const dScore = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
                  return (
                    <div key={domain} className="space-y-[0.5vh]">
                      <div className="flex justify-between text-[1.1vh] font-black uppercase italic text-slate-500"><span>{domain}</span><span>{dScore}%</span></div>
                      <Progress value={dScore} className="h-[1vh]" />
                    </div>
                  );
                })}
              </div>
              <div className="space-y-[2vh]">
                <h3 className="text-[1.5vh] font-black italic uppercase tracking-tight flex items-center gap-2"><Globe className="h-[2vh] w-[2vh] text-orange-500" /> Approaches</h3>
                <div className="grid grid-cols-3 gap-[1vh]">
                  {Object.entries(result.approachBreakdown || {}).map(([app, data]: any) => (
                    <div key={app} className="bg-slate-50 p-[1.5vh] rounded-xl border-2 border-dashed border-slate-200 text-center">
                      <p className="text-[0.8vh] font-black text-slate-400 uppercase">{app === 'Predictive' ? 'Waterfall' : app}</p>
                      <p className="text-[2vh] font-black italic text-slate-800">{data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0}%</p>
                    </div>
                  ))}
                </div>
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
      <div className="h-full w-full bg-slate-50 flex items-center justify-center p-[4vh]">
        <Card className="max-w-[60vh] w-full rounded-[4vh] shadow-2xl p-[6vh] text-center space-y-[4vh] bg-white border-t-8 border-t-emerald-500 flex flex-col items-center">
          <div className="bg-emerald-50 h-[12vh] w-[12vh] rounded-[3vh] flex items-center justify-center shadow-inner"><Clock className="h-[6vh] w-[6vh] text-emerald-600" /></div>
          <div className="space-y-[1vh]"><h2 className="text-[4vh] font-black italic uppercase text-emerald-600">Break</h2><p className="text-[1.8vh] font-bold text-slate-500 italic">10 minutes rest period.</p></div>
          <div className="text-[8vh] font-black italic tabular-nums text-slate-800 bg-slate-50 w-full py-[4vh] rounded-3xl border-2 border-dashed border-emerald-100">{formatMMSS(breakTimeLeft)}</div>
          <Button onClick={startNextSection} className="h-8vh w-full rounded-2xl bg-emerald-600 font-black uppercase text-[2vh] shadow-xl">RESUME NOW</Button>
        </Card>
      </div>
    );
  }

  if (viewMode === 'review') {
    return (
      <div className="h-full w-full bg-slate-50 p-[4vh] overflow-hidden flex flex-col animate-fade-in gap-[4vh]">
        <div className="text-center flex-none"><h1 className="text-[4vh] font-black italic uppercase text-primary">Review Section {currentSection}</h1></div>
        <Card className="flex-1 rounded-[4vh] shadow-2xl border-none bg-white p-[4vh] flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto grid grid-cols-10 gap-[1vh] content-start custom-scrollbar">
            {currentSectionQuestions.map((q, idx) => {
              const globalIdx = sectionStart + idx;
              const isAnswered = (answers[q.id]?.length || 0) > 0;
              const isFlagged = flagged[q.id];
              return (
                <button key={q.id} onClick={() => { setCurrentIndex(globalIdx); setViewMode('question'); }} className={cn("aspect-square rounded-xl font-black text-[1.5vh] transition-all flex items-center justify-center relative border-2", isFlagged ? "bg-amber-100 border-amber-400 text-amber-700" : isAnswered ? "bg-primary/10 border-primary/20 text-primary" : "bg-white text-slate-300 border-slate-100")}>
                  {globalIdx + 1}{isFlagged && <Flag className="absolute -top-1 -right-1 w-[1.2vh] h-[1.2vh] text-amber-600 fill-current" />}
                </button>
              );
            })}
          </div>
          <div className="flex-none flex flex-col sm:flex-row gap-[2vh] pt-[4vh]">
            <Button variant="outline" className="flex-1 h-8vh rounded-2xl border-4 font-black uppercase text-[1.5vh]" onClick={() => setViewMode('question')}>BACK TO QUESTIONS</Button>
            <Button className="flex-1 h-8vh rounded-2xl bg-red-600 font-black uppercase text-[1.5vh] shadow-xl text-white" onClick={currentSection < 3 && (currentSection * SECTION_SIZE < questions.length) ? () => setViewMode('break') : finishExam}>
              {currentSection < 3 && (currentSection * SECTION_SIZE < questions.length) ? "FINISH & BREAK" : "FINISH EXAM"}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progressPercent = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const currentAnswers = answers[currentQuestion?.id] || [];

  return (
    <div className="h-full w-full bg-slate-50 flex flex-col overflow-hidden relative">
      {/* HEADER : VH BASED */}
      <header className="flex-none bg-black text-white px-[4vw] py-[1.5vh] flex items-center justify-between shadow-xl z-50 h-[8vh]">
        <div className="flex items-center gap-[1vw]">
          <Button variant="ghost" size="sm" onClick={() => setIsPaused(true)} className="text-white hover:bg-white/10 rounded-full border border-white/30 h-[5vh] px-[2vw] text-[1.2vh]"><Pause className="h-[1.5vh] w-[1.5vh] mr-2" /> Pause</Button>
          <Button variant="ghost" size="sm" onClick={() => setShowCalculator(true)} className="text-white hover:bg-white/10 rounded-full border border-white/30 h-[5vh] px-[2vw] text-[1.2vh]"><CalcIcon className="h-[1.5vh] w-[1.5vh] mr-2" /> Calculator</Button>
        </div>
        <div className="text-center font-black italic uppercase tracking-widest text-[clamp(0.8rem,2vh,1.5rem)]">Question {currentIndex + 1} of {questions.length}</div>
        <div className="flex items-center gap-[2vw]">
          <Button variant="ghost" onClick={toggleFlag} className={cn("h-[5vh] px-[2vw] rounded-full border border-white/30 text-[1.2vh]", flagged[currentQuestion?.id] ? "bg-amber-500 text-white border-amber-400" : "text-white")}>
            <Flag className={cn("h-[1.5vh] w-[1.5vh] mr-2", flagged[currentQuestion?.id] && "fill-current")} /> Flag
          </Button>
          <div className="text-[3vh] font-black italic tabular-nums">{formatMMSS(timeLeft)}</div>
        </div>
      </header>

      {/* MAIN CONTENT : STRETCHED */}
      <main className="flex-1 p-[2vh] flex flex-col min-h-0 w-full max-w-[1200px] mx-auto gap-[1.5vh]">
        <div className="flex-none space-y-[0.5vh]">
          <Progress value={progressPercent} className="h-[0.8vh] rounded-full" />
          <div className="flex justify-between text-[1vh] font-black text-slate-400 uppercase tracking-widest italic">
            <span>Section {currentSection} / 3</span><span>{Math.round(progressPercent)}% Complété</span>
          </div>
        </div>
        
        <Card className="flex-1 rounded-[3vh] shadow-2xl border-none bg-white overflow-hidden flex flex-col min-h-0">
          <CardContent className="flex-1 overflow-y-auto p-[4vh] flex flex-col gap-[3vh] custom-scrollbar">
            <div className="flex-none space-y-[2vh]">
              {currentQuestion?.isMultipleCorrect && <Badge className="bg-indigo-100 text-indigo-600 border-none font-black italic uppercase text-[1vh] py-[0.5vh] px-[2vh]">Multiple Selection</Badge>}
              <h2 className="text-[clamp(1rem,2.2vh,1.8rem)] font-black text-slate-800 italic leading-relaxed">{currentQuestion?.text}</h2>
              {currentQuestion?.imageUrl && (
                <div className="rounded-[2vh] overflow-hidden border-2 border-slate-100 bg-white p-[0.5vh] flex justify-center shadow-md group relative">
                  <img 
                    src={currentQuestion.imageUrl} 
                    alt="Case illustration" 
                    className="max-h-[45vh] w-full object-contain rounded-lg transition-transform duration-300 hover:scale-[1.01]" 
                  />
                </div>
              )}
            </div>

            <div className="grid gap-[1vh] flex-none">
              {currentQuestion?.choices?.map((opt: string, idx: number) => {
                const optId = String(idx + 1);
                const isSelected = currentAnswers.includes(optId);
                return (
                  <button key={idx} onClick={() => toggleAnswer(currentQuestion.id, optId, currentQuestion.isMultipleCorrect)} className={cn("p-[2vh] rounded-xl border-2 transition-all text-left flex items-center gap-[2vh] shadow-sm flex-shrink min-h-0", isSelected ? "border-primary bg-primary/5 scale-[1.01]" : "border-slate-100 bg-white hover:border-slate-300")}>
                    <div className={cn("h-[4vh] w-[4vh] flex items-center justify-center font-black text-[1.5vh] shrink-0 border-2", currentQuestion.isMultipleCorrect ? "rounded-lg" : "rounded-full", isSelected ? "bg-primary text-white border-primary" : "bg-white text-slate-400")}>{String.fromCharCode(65 + idx)}</div>
                    <span className={cn("flex-1 text-[clamp(0.8rem,1.8vh,1.2rem)] font-black italic", isSelected ? "text-slate-900" : "text-slate-600")}>{opt}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* FOOTER : VH BASED */}
      <footer className="flex-none h-[10vh] bg-white border-t-2 px-[4vw] flex items-center justify-between shadow-2xl z-40">
        <div className="flex items-center gap-[1vw]">
          <Button variant="outline" className="h-[6vh] px-[2vw] rounded-xl border-2 font-black uppercase text-[1.2vh] italic" onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === sectionStart}><ChevronLeft className="mr-2 h-[1.5vh] w-[1.5vh]" /> Previous</Button>
          <Button variant="outline" onClick={() => setShowNavigator(!showNavigator)} className="h-[6vh] px-[2vw] rounded-xl border-2 font-black uppercase text-[1.2vh] italic"><LayoutGrid className="mr-2 h-[1.5vh] w-[1.5vh]" /> Navigator</Button>
        </div>
        {currentIndex === sectionEnd || currentIndex === questions.length - 1 ? (
          <Button onClick={() => setViewMode('review')} className="h-[6vh] px-[3vw] rounded-xl bg-red-600 text-white font-black uppercase text-[1.2vh] italic shadow-xl">REVIEW SECTION {currentSection}</Button>
        ) : (
          <Button onClick={() => setCurrentIndex(currentIndex + 1)} className="h-[6vh] px-[3vw] rounded-xl bg-primary text-white font-black uppercase text-[1.2vh] italic shadow-xl">Next <ChevronRight className="ml-2 h-4 w-4" /></Button>
        )}
      </footer>

      {/* NAVIGATOR OVERLAY */}
      {showNavigator && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center pb-[12vh] px-[2vw] pointer-events-none">
          <Card className="w-full max-w-[1000px] p-[3vh] rounded-[3vh] shadow-3xl bg-white border-4 border-primary/20 pointer-events-auto animate-slide-up h-[40vh] flex flex-col">
            <div className="flex justify-between items-center mb-[2vh] flex-none">
              <h3 className="text-[2vh] font-black italic uppercase text-primary">Navigator - Section {currentSection}</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowNavigator(false)} className="rounded-full h-[4vh] w-[4vh] border-2"><X className="h-[2vh] w-[2vh]" /></Button>
            </div>
            <div className="flex-1 overflow-y-auto grid grid-cols-10 gap-[1vh] content-start p-[1vh] custom-scrollbar">
              {currentSectionQuestions.map((q, idx) => {
                const globalIdx = sectionStart + idx;
                const isAnswered = (answers[q.id]?.length || 0) > 0;
                const isCurrent = globalIdx === currentIndex;
                const isFlagged = flagged[q.id];
                return (
                  <button key={q.id} onClick={() => { setCurrentIndex(globalIdx); setShowNavigator(false); }} className={cn("aspect-square rounded-lg font-black text-[1.2vh] transition-all relative border-2 flex items-center justify-center", isCurrent ? "border-primary bg-primary text-white scale-110 z-10" : isFlagged ? "bg-amber-100 border-amber-400 text-amber-700" : isAnswered ? "bg-primary/10 border-primary/20 text-primary" : "bg-slate-50 border-slate-100 text-slate-300")}>
                    {globalIdx + 1}{isFlagged && <Flag className="absolute -top-1 -right-1 w-[1vh] h-[1vh] text-amber-600 fill-current" />}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {showCalculator && <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"><div className="pointer-events-auto"><Calculator onClose={() => setShowCalculator(false)} /></div></div>}
      {isPaused && <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center pointer-events-auto text-center space-y-[4vh] flex-col"><h2 className="text-[8vh] font-black uppercase italic text-white tracking-tighter">EXAM IN PAUSE</h2><Button onClick={() => setIsPaused(false)} className="h-[12vh] px-[8vw] rounded-[3vh] bg-white text-black text-[3vh] font-black uppercase shadow-2xl hover:scale-110 transition-transform">RESUME</Button></div>}
    </div>
  );
}

export default function ExamRunPage() {
  return (
    <Suspense fallback={<div className="h-full w-full flex items-center justify-center"><Loader2 className="animate-spin h-[8vh] w-[8vh] text-primary" /></div>}>
      <ExamRunContent />
    </Suspense>
  );
}
