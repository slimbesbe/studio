
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, setDoc, deleteDoc, serverTimestamp, getDocs, addDoc, increment } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Clock, ChevronRight, ChevronLeft, Loader2, PlayCircle, Info, Pause, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const PERFORMANCE_ZONES = [
  { label: "Needs Improvement", color: "bg-[#F44336]", range: [0, 50], width: '50%' },
  { label: "Below Target", color: "bg-[#FFC107]", range: [50, 65], width: '15%' },
  { label: "Target", color: "bg-[#4CAF50]", range: [65, 80], width: '15%' },
  { label: "Above Target", color: "bg-[#009688]", range: [80, 101], width: '20%' },
];

export default function ExamPage() {
  const { user, profile } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const isDemo = user?.isAnonymous;

  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [initialTime, setInitialTime] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [examResult, setExamResult] = useState<{ score: number; total: number } | null>(null);
  const [examQuestions, setExamQuestions] = useState<any[]>([]);
  const [showPauseScreen, setShowPauseScreen] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);

  const examStateRef = useMemoFirebase(() => {
    return user && !user.isAnonymous ? doc(db, 'users', user.uid, 'exam_state', 'current') : null;
  }, [db, user]);

  const { data: savedState, isLoading: isStateLoading } = useDoc(examStateRef);

  const saveProgress = useCallback((updatedIndex?: number, updatedAnswers?: any) => {
    if (isDemo || !examStateRef || !isExamStarted || examResult) return;
    setDoc(examStateRef, {
      selectedExamId,
      currentQuestionIndex: updatedIndex !== undefined ? updatedIndex : currentQuestionIndex,
      answers: updatedAnswers !== undefined ? updatedAnswers : answers,
      timeLeft,
      initialTime,
      questionIds: examQuestions.map(q => q.id),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }, [isDemo, examStateRef, isExamStarted, currentQuestionIndex, answers, timeLeft, initialTime, examQuestions, selectedExamId, examResult]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isExamStarted && timeLeft > 0 && !examResult && !showPauseScreen) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isExamStarted, timeLeft, examResult, showPauseScreen]);

  const startExam = async (resume: boolean = false) => {
    const examToLoad = resume && savedState ? savedState.selectedExamId : selectedExamId;
    if (!examToLoad) return;
    setIsSubmitting(true);
    try {
      const qSnap = await getDocs(query(collection(db, 'exams', examToLoad, 'questions'), where('isActive', '==', true)));
      const questions = qSnap.docs.map(d => ({ ...d.data(), id: d.id }));
      
      if (questions.length === 0) {
        toast({ variant: "destructive", title: "Erreur", description: "Pas de questions disponibles." });
        setIsSubmitting(false);
        return;
      }

      if (resume && savedState) {
        const filtered = questions.filter(q => savedState.questionIds.includes(q.id));
        setExamQuestions(filtered);
        setAnswers(savedState.answers || {});
        setCurrentQuestionIndex(savedState.currentQuestionIndex || 0);
        setTimeLeft(savedState.timeLeft || 0);
        setInitialTime(savedState.initialTime || 0);
        setSelectedExamId(savedState.selectedExamId);
      } else {
        const pool = [...questions].sort(() => 0.5 - Math.random());
        const selected = pool.slice(0, isDemo ? 10 : 180);
        const duration = selected.length * 72;
        setExamQuestions(selected);
        setTimeLeft(duration);
        setInitialTime(duration);
        setCurrentQuestionIndex(0);
        setAnswers({});
        setExamResult(null);
      }
      setIsExamStarted(true);
      setShowPauseScreen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur lors du chargement" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const finishExam = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      let score = 0;
      examQuestions.forEach(q => {
        const uAns = answers[q.id] || [];
        const cAns = q.correctOptionIds || [];
        if (uAns.length === cAns.length && uAns.every(v => cAns.includes(v))) score++;
      });
      const percentage = Math.round((score / examQuestions.length) * 100);
      setExamResult({ score, total: examQuestions.length });
      
      if (!isDemo && user) {
        const newCount = (profile?.simulationsCount || 0) + 1;
        const newTotalScore = (profile?.totalScore || 0) + percentage;
        
        await setDoc(doc(db, 'users', user.uid), {
          simulationsCount: newCount,
          totalScore: newTotalScore,
          averageScore: Math.round(newTotalScore / newCount),
          totalTimeSpent: increment(initialTime - timeLeft),
          updatedAt: serverTimestamp()
        }, { merge: true });
        
        await addDoc(collection(db, 'users', user.uid, 'exam_results'), {
          examId: selectedExamId,
          score,
          total: examQuestions.length,
          percentage,
          timeSpent: initialTime - timeLeft,
          completedAt: serverTimestamp()
        });
        
        if (examStateRef) await deleteDoc(examStateRef);
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur de sauvegarde." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (isStateLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

  if (showPauseScreen) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-2xl bg-white border-none overflow-hidden rounded-[30px]">
          <CardHeader className="text-center py-10 bg-muted/20">
            <h1 className="text-6xl font-black text-slate-900 tracking-widest uppercase italic">Pause</h1>
            <p className="text-lg text-slate-500 mt-4 font-bold uppercase tracking-widest italic">Simulation Suspendue</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 p-10 bg-white">
            <Button className="h-16 text-2xl font-black bg-primary hover:bg-primary/90 rounded-xl uppercase tracking-widest shadow-xl transition-transform hover:scale-[1.02]" onClick={() => setShowPauseScreen(false)}>
              CONTINUER
            </Button>
            <Button variant="outline" className="h-16 text-2xl font-black text-primary border-primary hover:bg-primary/5 rounded-xl uppercase tracking-widest border-2 shadow-sm transition-transform hover:scale-[1.02]" onClick={() => { saveProgress(); setIsExamStarted(false); setShowPauseScreen(false); }}>
              ARRETER ET SAUVEGARDER
            </Button>
            <Button variant="outline" className="h-16 text-2xl font-black text-red-500 border-red-500 hover:bg-red-50 rounded-xl uppercase tracking-widest border-2 shadow-sm transition-transform hover:scale-[1.02]" onClick={() => { if(confirm("Arrêter sans sauvegarder ?")) { setIsExamStarted(false); setSelectedExamId(null); setShowPauseScreen(false); } }}>
              ARRETER ET ANNULER
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (examResult) {
    const percentage = Math.round((examResult.score / examResult.total) * 100);
    const appreciation = PERFORMANCE_ZONES.find(z => percentage >= z.range[0] && percentage < z.range[1]) || PERFORMANCE_ZONES[0];
    return (
      <div className="max-w-4xl mx-auto py-8 space-y-6 animate-fade-in">
        <Card className="shadow-xl overflow-hidden bg-white border-none rounded-[40px]">
          <CardHeader className="border-b bg-muted/30 py-6">
            <CardTitle className="text-center font-black text-xl uppercase tracking-widest text-primary italic">Rapport de Performance</CardTitle>
          </CardHeader>
          <CardContent className="py-20 px-10">
            <div className="relative w-full max-w-2xl mx-auto">
              <div className="flex w-full text-[10px] font-black text-slate-500 uppercase mb-4 tracking-widest">
                <div className="w-[65%] text-center italic">Falling</div>
                <div className="w-[35%] text-center border-l-2 border-slate-300 italic">Passing</div>
              </div>
              
              <div className="relative flex w-full h-12 rounded-full overflow-hidden border-2 shadow-inner bg-slate-100">
                {PERFORMANCE_ZONES.map((zone, idx) => (
                  <div key={idx} className={cn(zone.color, "border-r border-white/50 flex items-center justify-center relative")} style={{ width: zone.width }}>
                  </div>
                ))}
              </div>
              
              <div className="absolute top-0 bottom-0 transition-all duration-1000 z-30" style={{ left: `${percentage}%`, transform: 'translateX(-50%)' }}>
                 <div className="absolute -top-10 flex flex-col items-center w-24 left-1/2 -translate-x-1/2">
                    <span className="text-xs font-black text-black mb-1 tracking-widest italic">YOU</span>
                    <div className="w-1 h-4 bg-black rounded-full" />
                 </div>
              </div>
            </div>

            <div className="text-center space-y-4 pt-16">
              <p className="text-7xl leading-none font-black text-primary tracking-tighter italic">{percentage}%</p>
              <p className="text-xl font-black text-muted-foreground uppercase tracking-widest italic">{examResult.score} / {examResult.total} POINTS</p>
              <p className="text-lg font-black text-primary uppercase mt-2 italic">{appreciation.label}</p>
            </div>
          </CardContent>
          <CardFooter className="flex gap-4 p-8 border-t bg-muted/10">
            <Button variant="outline" className="flex-1 font-black h-16 text-lg rounded-2xl border-2 uppercase tracking-widest hover:bg-slate-50" onClick={() => { setIsReviewMode(true); setCurrentQuestionIndex(0); }}>REVOIR MES ERREURS</Button>
            <Button className="flex-1 font-black h-16 text-lg rounded-2xl bg-primary text-white shadow-xl uppercase tracking-widest hover:scale-[1.02] transition-transform" onClick={() => { setExamResult(null); setIsExamStarted(false); setSelectedExamId(null); }}>RETOUR DASHBOARD</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (isReviewMode) {
    const q = examQuestions[currentQuestionIndex];
    const uAns = answers[q.id] || [];
    const isCorrect = uAns.length === (q.correctOptionIds?.length || 0) && uAns.every(v => q.correctOptionIds?.includes(v));
    return (
      <div className="max-w-4xl mx-auto space-y-6 py-8">
        <Button variant="ghost" onClick={() => setIsReviewMode(false)} className="font-black text-primary uppercase tracking-widest mb-2 hover:bg-primary/5 h-12 px-6 rounded-xl border-2">
          <ChevronLeft className="mr-2 h-5 w-5" /> Retour
        </Button>
        <Card className={cn("border-t-8 shadow-xl rounded-[30px] overflow-hidden", isCorrect ? 'border-t-emerald-500' : 'border-t-red-500')}>
          <CardHeader className="bg-muted/5 p-8">
            <div className="flex justify-between items-center mb-6">
              <Badge variant={isCorrect ? "default" : "destructive"} className="px-4 py-1 text-sm font-black tracking-widest uppercase rounded-full shadow-sm">
                {isCorrect ? "CORRECT" : "ERREUR"}
              </Badge>
              <span className="text-sm font-black text-muted-foreground bg-white border-2 px-4 py-2 rounded-xl shadow-sm italic">
                {currentQuestionIndex + 1} / {examQuestions.length}
              </span>
            </div>
            <CardTitle className="text-2xl leading-relaxed font-black text-slate-800 italic">{q.statement}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-8">
            <div className="grid gap-4">
              {q.options.map((opt: any, idx: number) => {
                const isSelected = uAns.includes(opt.id);
                const isCorrectOpt = q.correctOptionIds?.includes(opt.id);
                return (
                  <div key={opt.id} className={cn("p-4 rounded-2xl border-2 flex items-center gap-4 transition-all", isCorrectOpt ? 'border-emerald-500 bg-emerald-50 shadow-sm' : isSelected ? 'border-red-400 bg-red-50' : 'border-muted bg-white')}>
                    <div className={cn("h-10 w-10 rounded-full flex items-center justify-center font-black text-sm shrink-0", isCorrectOpt ? 'bg-emerald-500 text-white' : isSelected ? 'bg-red-500 text-white' : 'bg-muted text-muted-foreground')}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <div className="flex-1 font-black text-base text-slate-700 italic">{opt.text}</div>
                  </div>
                );
              })}
            </div>
            <div className="p-6 bg-primary/5 rounded-2xl border-l-8 border-l-primary mt-8 shadow-inner">
              <h4 className="font-black mb-4 text-primary flex items-center gap-2 text-sm uppercase tracking-widest italic">
                <Info className="h-5 w-5" /> MINDSET OFFICIEL
              </h4>
              <p className="whitespace-pre-wrap text-base leading-relaxed text-slate-700 font-bold italic">{q.explanation || "Explication non disponible."}</p>
            </div>
          </CardContent>
          <CardFooter className="justify-between p-8 border-t bg-muted/5">
            <Button variant="outline" size="sm" className="font-black px-6 h-10 rounded-xl uppercase border-2 text-sm" onClick={() => setCurrentQuestionIndex(p => Math.max(0, p - 1))} disabled={currentQuestionIndex === 0}>PRÉCÉDENT</Button>
            <Button variant="outline" size="sm" className="font-black px-6 h-10 rounded-xl uppercase border-2 text-sm" onClick={() => setCurrentQuestionIndex(p => Math.min(examQuestions.length - 1, p + 1))} disabled={currentQuestionIndex === examQuestions.length - 1}>SUIVANT</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!isExamStarted) {
    return (
      <div className="max-w-5xl mx-auto py-8 space-y-10">
        <div className="text-center space-y-2">
          <h1 className="text-5xl leading-none font-black text-primary uppercase italic tracking-tighter">Simulateur PMP®</h1>
          <p className="text-xl text-slate-500 font-black uppercase tracking-widest italic">Excellence & Performance</p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5].map(num => (
            <Card key={num} className={cn("cursor-pointer border-t-8 transition-all hover:scale-[1.02] hover:shadow-lg rounded-[24px] overflow-hidden", selectedExamId === `exam${num}` ? 'border-t-primary bg-primary/5 ring-4 ring-primary/10 shadow-lg' : 'border-t-muted shadow-md')} onClick={() => setSelectedExamId(`exam${num}`)}>
              <CardHeader className="p-8">
                <CardTitle className="text-xl font-black uppercase tracking-tight italic">Examen {num}</CardTitle>
                <div className="h-1 w-12 bg-primary/20 rounded-full my-4" />
                <p className="text-slate-600 font-bold leading-relaxed text-sm uppercase tracking-tight italic">Simulation complète.</p>
              </CardHeader>
              <CardFooter className="p-8 pt-0">
                <Button variant={selectedExamId === `exam${num}` ? "default" : "outline"} className="w-full h-12 font-black text-base rounded-xl uppercase tracking-widest shadow-sm border-2 transition-all bg-primary text-white">
                  {selectedExamId === `exam${num}` ? "SÉLECTIONNÉ" : "SÉLECTIONNER"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        
        <div className="flex flex-col gap-6 items-center pt-8">
          {savedState && (
            <Button variant="outline" className="w-full max-w-xl h-16 border-4 border-primary text-primary font-black text-xl rounded-2xl hover:bg-primary/5 shadow-lg uppercase tracking-widest animate-pulse italic" onClick={() => startExam(true)}>
              REPRENDRE LA SESSION
            </Button>
          )}
          <Button size="lg" className="w-full max-w-xl h-20 text-3xl font-black bg-primary text-white uppercase shadow-xl rounded-2xl hover:scale-[1.01] transition-transform tracking-widest italic" disabled={!selectedExamId || isSubmitting} onClick={() => startExam(false)}>
            {isSubmitting ? <Loader2 className="animate-spin mr-4 h-8 w-8" /> : <PlayCircle className="mr-4 h-8 w-8" />} LANCER
          </Button>
        </div>
      </div>
    );
  }

  const q = examQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / examQuestions.length) * 100;
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-40 py-8 animate-fade-in">
      <div className="sticky top-0 z-[60] bg-background/95 backdrop-blur-3xl py-6 border-b-4 shadow-lg px-8 rounded-b-[30px] border-primary/10">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-xl font-mono px-4 py-2 bg-white border-2 shadow-sm rounded-xl italic font-black">
              Q-{currentQuestionIndex + 1} / {examQuestions.length}
            </Badge>
            <Button variant="ghost" size="icon" className="h-12 w-12 hover:bg-muted/80 rounded-xl border-2" onClick={() => setShowPauseScreen(true)}>
              <Pause className="h-6 w-6 text-slate-800" />
            </Button>
          </div>
          <div className="text-3xl font-black text-primary bg-primary/5 border-2 border-primary/20 px-6 py-2 rounded-2xl shadow-inner tabular-nums italic">
            {formatTime(timeLeft)}
          </div>
          <Button variant="destructive" size="lg" className="font-black h-12 px-8 uppercase shadow-md rounded-xl text-lg tracking-widest hover:scale-[1.02] transition-transform italic border-2" onClick={() => { if(confirm("Terminer ?")) finishExam(); }}>
            TERMINER
          </Button>
        </div>
        <Progress value={progress} className="h-4 rounded-full bg-slate-100 border-2 shadow-inner" />
      </div>

      <Card className="shadow-xl border-t-[12px] border-t-primary bg-white p-10 min-h-[400px] rounded-[40px] overflow-hidden">
        <CardHeader className="pb-8">
          <CardTitle className="text-2xl leading-[1.4] font-black text-slate-900 tracking-tight italic">
            {q?.statement}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            {q?.options.map((opt: any, idx: number) => {
              const isSelected = answers[q.id]?.includes(opt.id);
              return (
                <div key={opt.id} onClick={() => {
                  const current = answers[q.id] || [];
                  const newAns = q.isMultipleCorrect ? (isSelected ? current.filter(id => id !== opt.id) : [...current, opt.id]) : [opt.id];
                  const updated = { ...answers, [q.id]: newAns };
                  setAnswers(updated);
                  saveProgress(undefined, updated);
                }} className={cn("p-6 rounded-[24px] border-4 cursor-pointer transition-all flex items-start gap-6 shadow-sm", isSelected ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/40 bg-slate-50/50')}>
                  <div className={cn("h-10 w-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 shadow-sm", isSelected ? 'bg-primary text-white scale-110' : 'bg-white text-primary border-2')}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <div className={cn("flex-1 text-lg pt-1 leading-relaxed", isSelected ? 'font-black text-slate-900 italic' : 'text-slate-700 font-bold')}>
                    {opt.text}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/95 backdrop-blur-3xl border-t-4 z-[70] shadow-2xl">
        <div className="max-w-4xl mx-auto flex justify-between gap-6">
          <Button variant="outline" className="flex-1 h-16 font-black text-xl rounded-2xl uppercase border-2 hover:bg-slate-50 tracking-widest italic" onClick={() => { const i = Math.max(0, currentQuestionIndex - 1); setCurrentQuestionIndex(i); saveProgress(i); }} disabled={currentQuestionIndex === 0}>
            <ChevronLeft className="mr-4 h-8 w-8" /> PRÉCÉDENT
          </Button>
          <Button className="flex-1 h-16 font-black text-xl rounded-2xl shadow-xl uppercase bg-primary text-white hover:scale-[1.01] transition-transform tracking-widest italic" onClick={() => { const i = Math.min(examQuestions.length - 1, currentQuestionIndex + 1); setCurrentQuestionIndex(i); saveProgress(i); }} disabled={currentQuestionIndex === examQuestions.length - 1}>
            SUIVANT <ChevronRight className="mr-4 h-8 w-8" />
          </Button>
        </div>
      </div>
    </div>
  );
}
