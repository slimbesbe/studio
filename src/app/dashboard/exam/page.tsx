
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
        <Card className="w-full max-w-2xl shadow-3xl bg-white border-none overflow-hidden rounded-[50px]">
          <CardHeader className="text-center py-20 bg-muted/20">
            <h1 className="text-9xl font-black text-slate-900 tracking-[0.2em] uppercase italic">Pause</h1>
            <p className="text-2xl text-slate-500 mt-6 font-bold uppercase tracking-[0.4em] italic">Simulation PMP® Suspendue</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-8 p-16 bg-white">
            <Button className="h-28 text-4xl font-black bg-primary hover:bg-primary/90 rounded-[35px] uppercase tracking-widest shadow-2xl transition-transform hover:scale-[1.02]" onClick={() => setShowPauseScreen(false)}>
              CONTINUER
            </Button>
            <Button variant="outline" className="h-28 text-4xl font-black text-primary border-primary hover:bg-primary/5 rounded-[35px] uppercase tracking-widest border-4 shadow-xl transition-transform hover:scale-[1.02]" onClick={() => { saveProgress(); setIsExamStarted(false); setShowPauseScreen(false); }}>
              ARRETER ET SAUVEGARDER
            </Button>
            <Button variant="outline" className="h-28 text-4xl font-black text-red-500 border-red-500 hover:bg-red-50 rounded-[35px] uppercase tracking-widest border-4 shadow-xl transition-transform hover:scale-[1.02]" onClick={() => { if(confirm("Arrêter sans sauvegarder ?")) { setIsExamStarted(false); setSelectedExamId(null); setShowPauseScreen(false); } }}>
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
      <div className="max-w-4xl mx-auto py-12 space-y-8 animate-fade-in">
        <Card className="shadow-2xl overflow-hidden bg-white border-none rounded-[60px]">
          <CardHeader className="border-b bg-muted/30 py-10">
            <CardTitle className="text-center font-black text-3xl uppercase tracking-widest text-primary italic">Rapport de Performance PMP® Officiel</CardTitle>
          </CardHeader>
          <CardContent className="py-40 px-16">
            <div className="relative w-full max-w-3xl mx-auto">
              <div className="flex w-full text-[12px] font-black text-slate-500 uppercase mb-8 tracking-[0.3em]">
                <div className="w-[65%] text-center italic">Falling</div>
                <div className="w-[35%] text-center border-l-4 border-slate-300 italic">Passing</div>
              </div>
              
              <div className="relative flex w-full h-28 rounded-[35px] overflow-hidden border-4 shadow-inner bg-slate-100">
                {PERFORMANCE_ZONES.map((zone, idx) => (
                  <div key={idx} className={cn(zone.color, "border-r-4 border-white/50 flex items-center justify-center relative")} style={{ width: zone.width }}>
                    <span className="text-[11px] font-black text-white uppercase text-center px-2 leading-tight tracking-tighter drop-shadow-md z-10">{zone.label}</span>
                  </div>
                ))}
              </div>
              
              <div className="absolute top-0 bottom-0 transition-all duration-1000 z-30" style={{ left: `${percentage}%`, transform: 'translateX(-50%)' }}>
                 <div className="absolute -top-24 flex flex-col items-center w-32 left-1/2 -translate-x-1/2">
                    <span className="text-[22px] font-black text-black mb-1 tracking-widest italic">YOU</span>
                    <div className="w-2 h-16 bg-black rounded-full" />
                 </div>
                 <div className="absolute -bottom-48 flex flex-col items-center w-[400px] left-1/2 -translate-x-1/2">
                    <div className="w-2 h-16 bg-black mb-4 rounded-full" />
                    <span className="text-[42px] font-black text-primary uppercase tracking-tighter text-center italic leading-none drop-shadow-sm">
                      {appreciation.label}
                    </span>
                 </div>
              </div>
            </div>

            <div className="text-center space-y-6 pt-64">
              <p className="text-[180px] leading-none font-black text-primary tracking-tighter drop-shadow-2xl italic">{percentage}%</p>
              <p className="text-4xl font-black text-muted-foreground uppercase tracking-[0.4em] italic">{examResult.score} / {examResult.total} POINTS OBTENUS</p>
            </div>
          </CardContent>
          <CardFooter className="flex gap-8 p-16 border-t bg-muted/10">
            <Button variant="outline" className="flex-1 font-black h-24 text-2xl rounded-[35px] border-4 uppercase tracking-widest hover:bg-slate-50" onClick={() => { setIsReviewMode(true); setCurrentQuestionIndex(0); }}>REVOIR MES ERREURS</Button>
            <Button className="flex-1 font-black h-24 text-2xl rounded-[35px] bg-primary text-white shadow-2xl uppercase tracking-widest hover:scale-[1.02] transition-transform" onClick={() => { setExamResult(null); setIsExamStarted(false); setSelectedExamId(null); }}>RETOUR DASHBOARD</Button>
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
      <div className="max-w-4xl mx-auto space-y-8 py-12">
        <Button variant="ghost" onClick={() => setIsReviewMode(false)} className="font-black text-primary uppercase tracking-widest mb-4 hover:bg-primary/5 h-16 px-10 rounded-2xl border-2">
          <ChevronLeft className="mr-2 h-8 w-8" /> Retour aux résultats
        </Button>
        <Card className={cn("border-t-[24px] shadow-3xl rounded-[60px] overflow-hidden", isCorrect ? 'border-t-emerald-500' : 'border-t-red-500')}>
          <CardHeader className="bg-muted/5 p-16">
            <div className="flex justify-between items-center mb-12">
              <Badge variant={isCorrect ? "default" : "destructive"} className="px-12 py-5 text-2xl font-black tracking-widest uppercase rounded-full shadow-2xl">
                {isCorrect ? "RÉPONSE CORRECTE" : "ERREUR DÉTECTÉE"}
              </Badge>
              <span className="text-2xl font-black text-muted-foreground bg-white border-4 px-10 py-5 rounded-[30px] shadow-sm italic">
                {currentQuestionIndex + 1} / {examQuestions.length}
              </span>
            </div>
            <CardTitle className="text-5xl leading-relaxed font-black text-slate-800 italic">{q.statement}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-12 p-16">
            <div className="grid gap-10">
              {q.options.map((opt: any, idx: number) => {
                const isSelected = uAns.includes(opt.id);
                const isCorrectOpt = q.correctOptionIds?.includes(opt.id);
                return (
                  <div key={opt.id} className={cn("p-12 rounded-[45px] border-[6px] flex items-center gap-12 transition-all", isCorrectOpt ? 'border-emerald-500 bg-emerald-50 shadow-xl scale-[1.02]' : isSelected ? 'border-red-400 bg-red-50' : 'border-muted bg-white')}>
                    <div className={cn("h-20 w-20 rounded-full flex items-center justify-center font-black text-3xl shrink-0", isCorrectOpt ? 'bg-emerald-500 text-white' : isSelected ? 'bg-red-500 text-white' : 'bg-muted text-muted-foreground')}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <div className="flex-1 font-black text-3xl text-slate-700 italic">{opt.text}</div>
                  </div>
                );
              })}
            </div>
            <div className="p-16 bg-primary/5 rounded-[60px] border-l-[24px] border-l-primary mt-20 shadow-inner">
              <h4 className="font-black mb-12 text-primary flex items-center gap-8 text-3xl uppercase tracking-widest italic">
                <Info className="h-12 w-12" /> MINDSET OFFICIEL PMI®
              </h4>
              <p className="whitespace-pre-wrap text-3xl leading-relaxed text-slate-700 font-bold italic">{q.explanation || "Explication non disponible pour cette question."}</p>
            </div>
          </CardContent>
          <CardFooter className="justify-between p-16 border-t bg-muted/5">
            <Button variant="outline" size="lg" className="font-black px-16 h-24 rounded-[35px] uppercase border-4 text-3xl" onClick={() => setCurrentQuestionIndex(p => Math.max(0, p - 1))} disabled={currentQuestionIndex === 0}>PRÉCÉDENT</Button>
            <Button variant="outline" size="lg" className="font-black px-16 h-24 rounded-[35px] uppercase border-4 text-3xl" onClick={() => setCurrentQuestionIndex(p => Math.min(examQuestions.length - 1, p + 1))} disabled={currentQuestionIndex === examQuestions.length - 1}>SUIVANT</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!isExamStarted) {
    return (
      <div className="max-w-7xl mx-auto py-12 space-y-16">
        <div className="text-center space-y-6">
          <h1 className="text-[110px] leading-none font-black text-primary uppercase italic tracking-tighter drop-shadow-2xl">Simulateur PMP®</h1>
          <p className="text-4xl text-slate-500 font-black uppercase tracking-[0.5em] italic">Excellence & Performance Haute Fidélité</p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
          {[1,2,3,4,5].map(num => (
            <Card key={num} className={cn("cursor-pointer border-t-[24px] transition-all hover:scale-[1.03] hover:shadow-3xl rounded-[50px] overflow-hidden", selectedExamId === `exam${num}` ? 'border-t-primary bg-primary/5 ring-[16px] ring-primary/10 shadow-3xl' : 'border-t-muted shadow-xl')} onClick={() => setSelectedExamId(`exam${num}`)}>
              <CardHeader className="p-16">
                <CardTitle className="text-5xl font-black uppercase tracking-tight italic">Examen {num}</CardTitle>
                <div className="h-3 w-24 bg-primary/20 rounded-full my-8" />
                <p className="text-slate-600 font-bold leading-relaxed text-2xl uppercase tracking-tight italic">Simulation complète de 180 questions mode réel.</p>
              </CardHeader>
              <CardFooter className="p-16 pt-0">
                <Button variant={selectedExamId === `exam${num}` ? "default" : "outline"} className="w-full h-24 font-black text-3xl rounded-[30px] uppercase tracking-widest shadow-xl border-4 transition-all bg-primary text-white">
                  {selectedExamId === `exam${num}` ? "SÉLECTIONNÉ" : "SÉLECTIONNER"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        
        <div className="flex flex-col gap-12 items-center pt-16">
          {savedState && (
            <Button variant="outline" className="w-full max-w-4xl h-32 border-[10px] border-primary text-primary font-black text-5xl rounded-[60px] hover:bg-primary/5 shadow-3xl uppercase tracking-widest animate-pulse italic" onClick={() => startExam(true)}>
              REPRENDRE LA SESSION EN COURS
            </Button>
          )}
          <Button size="lg" className="w-full max-w-4xl h-40 text-7xl font-black bg-primary text-white uppercase shadow-[0_40px_100px_-20px_rgba(var(--primary),0.5)] rounded-[60px] hover:scale-[1.01] transition-transform tracking-[0.1em] italic" disabled={!selectedExamId || isSubmitting} onClick={() => startExam(false)}>
            {isSubmitting ? <Loader2 className="animate-spin mr-12 h-28 w-28" /> : <PlayCircle className="mr-12 h-28 w-28" />} LANCER LA SIMULATION
          </Button>
        </div>
      </div>
    );
  }

  const q = examQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / examQuestions.length) * 100;
  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-64 py-12 animate-fade-in">
      <div className="sticky top-0 z-[60] bg-background/95 backdrop-blur-3xl py-14 border-b-[8px] shadow-2xl px-20 rounded-b-[70px] border-primary/10">
        <div className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-10">
            <Badge variant="outline" className="text-6xl font-mono px-16 py-8 bg-white border-[8px] shadow-xl rounded-[40px] italic font-black">
              Q-{currentQuestionIndex + 1} / {examQuestions.length}
            </Badge>
            <Button variant="ghost" size="icon" className="h-28 w-28 hover:bg-muted/80 rounded-[40px] border-4 shadow-sm" onClick={() => setShowPauseScreen(true)}>
              <Pause className="h-14 w-14 text-slate-800" />
            </Button>
          </div>
          <div className="text-7xl font-black text-primary bg-primary/5 border-[8px] border-primary/20 px-20 py-8 rounded-[50px] shadow-inner tabular-nums italic">
            {formatTime(timeLeft)}
          </div>
          <Button variant="destructive" size="lg" className="font-black h-28 px-24 uppercase shadow-3xl rounded-[50px] text-4xl tracking-widest hover:scale-[1.02] transition-transform italic border-4" onClick={() => { if(confirm("Terminer et soumettre l'examen ?")) finishExam(); }}>
            TERMINER
          </Button>
        </div>
        <Progress value={progress} className="h-10 rounded-full bg-slate-100 border-[8px] shadow-inner" />
      </div>

      <Card className="shadow-3xl border-t-[32px] border-t-primary bg-white p-24 min-h-[800px] rounded-[80px] overflow-hidden">
        <CardHeader className="pb-32">
          <CardTitle className="text-6xl leading-[1.4] font-black text-slate-900 tracking-tight italic">
            {q?.statement}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-16">
          <div className="grid gap-12">
            {q?.options.map((opt: any, idx: number) => {
              const isSelected = answers[q.id]?.includes(opt.id);
              return (
                <div key={opt.id} onClick={() => {
                  const current = answers[q.id] || [];
                  const newAns = q.isMultipleCorrect ? (isSelected ? current.filter(id => id !== opt.id) : [...current, opt.id]) : [opt.id];
                  const updated = { ...answers, [q.id]: newAns };
                  setAnswers(updated);
                  saveProgress(undefined, updated);
                }} className={cn("p-16 rounded-[60px] border-[10px] cursor-pointer transition-all flex items-start gap-16 shadow-lg", isSelected ? 'border-primary bg-primary/5 ring-[20px] ring-primary/5' : 'border-muted hover:border-primary/40 bg-slate-50/50')}>
                  <div className={cn("h-24 w-24 rounded-full flex items-center justify-center font-black text-5xl shrink-0 shadow-2xl", isSelected ? 'bg-primary text-white scale-110' : 'bg-white text-primary border-4')}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <div className={cn("flex-1 text-4xl pt-4 leading-relaxed", isSelected ? 'font-black text-slate-900 italic' : 'text-slate-700 font-bold')}>
                    {opt.text}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 p-16 bg-white/95 backdrop-blur-3xl border-t-[12px] z-[70] shadow-[0_-40px_120px_-20px_rgba(0,0,0,0.3)]">
        <div className="max-w-6xl mx-auto flex justify-between gap-20">
          <Button variant="outline" className="flex-1 h-32 font-black text-5xl rounded-[60px] uppercase border-[10px] hover:bg-slate-50 tracking-widest italic" onClick={() => { const i = Math.max(0, currentQuestionIndex - 1); setCurrentQuestionIndex(i); saveProgress(i); }} disabled={currentQuestionIndex === 0}>
            <ChevronLeft className="mr-10 h-16 w-16" /> PRÉCÉDENT
          </Button>
          <Button className="flex-1 h-32 font-black text-5xl rounded-[60px] shadow-3xl uppercase bg-primary text-white hover:scale-[1.01] transition-transform tracking-widest italic" onClick={() => { const i = Math.min(examQuestions.length - 1, currentQuestionIndex + 1); setCurrentQuestionIndex(i); saveProgress(i); }} disabled={currentQuestionIndex === examQuestions.length - 1}>
            SUIVANT <ChevronRight className="mr-10 h-16 w-16" />
          </Button>
        </div>
      </div>
    </div>
  );
}
