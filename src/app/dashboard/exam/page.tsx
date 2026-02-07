
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
        const duration = selected.length * 72; // 1.2 min per question
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

  if (isStateLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  if (showPauseScreen) {
    return (
      <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-3xl bg-white border-none overflow-hidden rounded-[40px]">
          <CardHeader className="text-center py-20 bg-muted/20">
            <h1 className="text-8xl font-black text-slate-800 tracking-[0.2em] uppercase italic">Pause</h1>
            <p className="text-xl text-slate-500 mt-6 font-bold uppercase tracking-widest italic">Simulation PMP® Suspendue</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 p-20 bg-white">
            <Button className="h-24 text-3xl font-black bg-primary hover:bg-primary/90 rounded-3xl uppercase tracking-[0.1em] shadow-2xl" onClick={() => setShowPauseScreen(false)}>CONTINUER</Button>
            <Button variant="outline" className="h-24 text-3xl font-black text-primary border-primary hover:bg-primary/5 rounded-3xl uppercase tracking-[0.1em] border-4 shadow-xl" onClick={() => { saveProgress(); setIsExamStarted(false); setShowPauseScreen(false); }}>ARRETER ET SAUVEGARDER</Button>
            <Button variant="outline" className="h-24 text-3xl font-black text-red-500 border-red-500 hover:bg-red-50 rounded-3xl uppercase tracking-[0.1em] border-4 shadow-xl" onClick={() => { if(confirm("Arrêter sans sauvegarder ?")) { setIsExamStarted(false); setSelectedExamId(null); setShowPauseScreen(false); } }}>ARRETER ET ANNULER</Button>
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
        <Card className="shadow-2xl overflow-hidden bg-white border-none rounded-[50px]">
          <CardHeader className="border-b bg-muted/30 py-10">
            <CardTitle className="text-center font-black text-3xl uppercase tracking-widest text-primary italic">Rapport de Performance PMP®</CardTitle>
          </CardHeader>
          <CardContent className="py-32 px-12">
            <div className="relative w-full max-w-3xl mx-auto">
              <div className="flex w-full text-[12px] font-black text-slate-500 uppercase mb-6 tracking-[0.3em]">
                <div className="w-[65%] text-center italic">Falling</div>
                <div className="w-[35%] text-center border-l-4 border-slate-300 italic">Passing</div>
              </div>
              
              <div className="relative flex w-full h-24 rounded-3xl overflow-hidden border-4 shadow-inner bg-slate-100">
                {PERFORMANCE_ZONES.map((zone, idx) => (
                  <div key={idx} className={`${zone.color} border-r-4 border-white/50 flex items-center justify-center relative`} style={{ width: zone.width }}>
                    <span className="text-[10px] font-black text-white uppercase text-center px-2 leading-tight tracking-tighter drop-shadow-md z-10">{zone.label}</span>
                  </div>
                ))}
              </div>
              
              {/* Marker "YOU" with bars */}
              <div className="absolute top-0 bottom-0 transition-all duration-1000 z-30" style={{ left: `${percentage}%`, transform: 'translateX(-50%)' }}>
                 <div className="absolute -top-24 flex flex-col items-center w-32 left-1/2 -translate-x-1/2">
                    <span className="text-[20px] font-black text-black mb-1 tracking-widest italic">YOU</span>
                    <div className="w-[6px] h-14 bg-black rounded-full" />
                 </div>
                 <div className="absolute -bottom-36 flex flex-col items-center w-80 left-1/2 -translate-x-1/2">
                    <div className="w-[6px] h-14 bg-black mb-4 rounded-full" />
                    <span className="text-[32px] font-black text-primary uppercase tracking-tighter text-center italic leading-none drop-shadow-sm">
                      {appreciation.label}
                    </span>
                 </div>
              </div>
            </div>

            <div className="text-center space-y-6 pt-56">
              <p className="text-[160px] leading-none font-black text-primary tracking-tighter drop-shadow-2xl italic">{percentage}%</p>
              <p className="text-3xl font-black text-muted-foreground uppercase tracking-[0.4em] italic">{examResult.score} / {examResult.total} POINTS</p>
            </div>
          </CardContent>
          <CardFooter className="flex gap-8 p-12 border-t bg-muted/10">
            <Button variant="outline" className="flex-1 font-black h-24 text-2xl rounded-[32px] border-4 uppercase tracking-widest hover:bg-slate-50" onClick={() => { setIsReviewMode(true); setCurrentQuestionIndex(0); }}>REVOIR MES ERREURS</Button>
            <Button className="flex-1 font-black h-24 text-2xl rounded-[32px] bg-primary text-white shadow-2xl uppercase tracking-widest hover:scale-[1.02] transition-transform" onClick={() => { setExamResult(null); setIsExamStarted(false); setSelectedExamId(null); }}>RETOUR DASHBOARD</Button>
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
        <Button variant="ghost" onClick={() => setIsReviewMode(false)} className="font-black text-primary uppercase tracking-widest mb-4 hover:bg-primary/5 h-14 px-8 rounded-2xl border-2">
          <ChevronLeft className="mr-2 h-6 w-6" /> Retour aux résultats
        </Button>
        <Card className={`border-t-[20px] shadow-3xl rounded-[50px] overflow-hidden ${isCorrect ? 'border-t-emerald-500' : 'border-t-red-500'}`}>
          <CardHeader className="bg-muted/5 p-16">
            <div className="flex justify-between items-center mb-12">
              <Badge variant={isCorrect ? "default" : "destructive"} className="px-10 py-4 text-xl font-black tracking-widest uppercase rounded-full shadow-2xl">
                {isCorrect ? "CORRECT" : "ERREUR"}
              </Badge>
              <span className="text-xl font-black text-muted-foreground bg-white border-4 px-8 py-4 rounded-[24px] shadow-sm italic">
                QUESTION {currentQuestionIndex + 1} / {examQuestions.length}
              </span>
            </div>
            <CardTitle className="text-4xl leading-relaxed font-black text-slate-800 italic">{q.statement}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-10 p-16">
            <div className="grid gap-8">
              {q.options.map((opt: any, idx: number) => {
                const isSelected = uAns.includes(opt.id);
                const isCorrectOpt = q.correctOptionIds?.includes(opt.id);
                return (
                  <div key={opt.id} className={`p-10 rounded-[40px] border-4 flex items-center gap-10 transition-all ${isCorrectOpt ? 'border-emerald-500 bg-emerald-50 shadow-xl scale-[1.02]' : isSelected ? 'border-red-400 bg-red-50' : 'border-muted bg-white'}`}>
                    <div className={`h-16 w-16 rounded-full flex items-center justify-center font-black text-2xl shrink-0 ${isCorrectOpt ? 'bg-emerald-500 text-white' : isSelected ? 'bg-red-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <div className="flex-1 font-black text-2xl text-slate-700 italic">{opt.text}</div>
                  </div>
                );
              })}
            </div>
            <div className="p-16 bg-primary/5 rounded-[50px] border-l-[20px] border-l-primary mt-20 shadow-inner">
              <h4 className="font-black mb-10 text-primary flex items-center gap-6 text-2xl uppercase tracking-widest italic">
                <Info className="h-10 w-10" /> MINDSET OFFICIEL PMI®
              </h4>
              <p className="whitespace-pre-wrap text-2xl leading-relaxed text-slate-700 font-bold italic">{q.explanation || "Explication non disponible."}</p>
            </div>
          </CardContent>
          <CardFooter className="justify-between p-16 border-t bg-muted/5">
            <Button variant="outline" size="lg" className="font-black px-14 h-20 rounded-[28px] uppercase border-4 text-2xl" onClick={() => setCurrentQuestionIndex(p => Math.max(0, p - 1))} disabled={currentQuestionIndex === 0}>PRÉCÉDENT</Button>
            <Button variant="outline" size="lg" className="font-black px-14 h-20 rounded-[28px] uppercase border-4 text-2xl" onClick={() => setCurrentQuestionIndex(p => Math.min(examQuestions.length - 1, p + 1))} disabled={currentQuestionIndex === examQuestions.length - 1}>SUIVANT</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!isExamStarted) {
    return (
      <div className="max-w-7xl mx-auto py-12 space-y-16">
        <div className="text-center space-y-6">
          <h1 className="text-[100px] leading-none font-black text-primary uppercase italic tracking-tighter drop-shadow-2xl">Simulateur PMP®</h1>
          <p className="text-3xl text-slate-500 font-black uppercase tracking-[0.4em] italic">Entraînement Intensif Haute Fidélité</p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
          {[1,2,3,4,5].map(num => (
            <Card key={num} className={`cursor-pointer border-t-[20px] transition-all hover:scale-[1.03] hover:shadow-3xl rounded-[40px] overflow-hidden ${selectedExamId === `exam${num}` ? 'border-t-primary bg-primary/5 ring-[12px] ring-primary/10 shadow-3xl' : 'border-t-muted shadow-xl'}`} onClick={() => setSelectedExamId(`exam${num}`)}>
              <CardHeader className="p-12">
                <CardTitle className="text-4xl font-black uppercase tracking-tight italic">Examen {num}</CardTitle>
                <div className="h-2 w-20 bg-primary/20 rounded-full my-6" />
                <p className="text-slate-600 font-bold leading-relaxed text-xl uppercase tracking-tight italic">Simulation complète de 180 questions mode réel.</p>
              </CardHeader>
              <CardFooter className="p-12 pt-0">
                <Button variant={selectedExamId === `exam${num}` ? "default" : "outline"} className="w-full h-20 font-black text-2xl rounded-[24px] uppercase tracking-widest shadow-xl border-4 transition-all">
                  {selectedExamId === `exam${num}` ? "SÉLECTIONNÉ" : "SÉLECTIONNER"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        
        <div className="flex flex-col gap-10 items-center pt-16">
          {savedState && (
            <Button variant="outline" className="w-full max-w-3xl h-28 border-[8px] border-primary text-primary font-black text-4xl rounded-[50px] hover:bg-primary/5 shadow-3xl uppercase tracking-widest animate-pulse italic" onClick={() => startExam(true)}>
              REPRENDRE LA SESSION
            </Button>
          )}
          <Button size="lg" className="w-full max-w-3xl h-36 text-6xl font-black bg-primary text-white uppercase shadow-[0_30px_90px_-20px_rgba(var(--primary),0.5)] rounded-[50px] hover:scale-[1.01] transition-transform tracking-[0.1em] italic" disabled={!selectedExamId || isSubmitting} onClick={() => startExam(false)}>
            {isSubmitting ? <Loader2 className="animate-spin mr-10 h-24 w-24" /> : <PlayCircle className="mr-10 h-24 w-24" />} LANCER
          </Button>
        </div>
      </div>
    );
  }

  const q = examQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / examQuestions.length) * 100;
  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-64 py-12 animate-fade-in">
      <div className="sticky top-0 z-[60] bg-background/90 backdrop-blur-3xl py-12 border-b-[6px] shadow-2xl px-16 rounded-b-[60px] border-primary/10">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-8">
            <Badge variant="outline" className="text-5xl font-mono px-12 py-6 bg-white border-[6px] shadow-xl rounded-[32px] italic font-black">
              Q-{currentQuestionIndex + 1} / {examQuestions.length}
            </Badge>
            <Button variant="ghost" size="icon" className="h-24 w-24 hover:bg-muted/80 rounded-[32px] border-4 shadow-sm" onClick={() => setShowPauseScreen(true)}>
              <Pause className="h-12 w-12 text-slate-800" />
            </Button>
          </div>
          <div className="text-6xl font-black text-primary bg-primary/5 border-[6px] border-primary/20 px-16 py-6 rounded-[40px] shadow-inner tabular-nums italic">
            {formatTime(timeLeft)}
          </div>
          <Button variant="destructive" size="lg" className="font-black h-24 px-20 uppercase shadow-3xl rounded-[40px] text-3xl tracking-widest hover:scale-[1.02] transition-transform italic border-4" onClick={() => { if(confirm("Terminer et soumettre l'examen ?")) finishExam(); }}>
            TERMINER
          </Button>
        </div>
        <Progress value={progress} className="h-8 rounded-full bg-slate-100 border-[6px] shadow-inner" />
      </div>

      <Card className="shadow-3xl border-t-[24px] border-t-primary bg-white p-20 min-h-[700px] rounded-[70px] overflow-hidden">
        <CardHeader className="pb-24">
          <CardTitle className="text-5xl leading-[1.5] font-black text-slate-900 tracking-tight italic">
            {q?.statement}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-12">
          <div className="grid gap-10">
            {q?.options.map((opt: any, idx: number) => {
              const isSelected = answers[q.id]?.includes(opt.id);
              return (
                <div key={opt.id} onClick={() => {
                  const current = answers[q.id] || [];
                  const newAns = q.isMultipleCorrect ? (isSelected ? current.filter(id => id !== opt.id) : [...current, opt.id]) : [opt.id];
                  const updated = { ...answers, [q.id]: newAns };
                  setAnswers(updated);
                  saveProgress(undefined, updated);
                }} className={`p-12 rounded-[50px] border-[8px] cursor-pointer transition-all flex items-start gap-12 shadow-md ${isSelected ? 'border-primary bg-primary/5 ring-[16px] ring-primary/5' : 'border-muted hover:border-primary/40 bg-slate-50/50'}`}>
                  <div className={`h-20 w-20 rounded-full flex items-center justify-center font-black text-4xl shrink-0 shadow-2xl ${isSelected ? 'bg-primary text-white scale-110' : 'bg-white text-primary border-4'}`}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <div className={`flex-1 text-3xl pt-2 leading-relaxed ${isSelected ? 'font-black text-slate-900 italic' : 'text-slate-700 font-bold'}`}>
                    {opt.text}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 p-16 bg-white/95 backdrop-blur-3xl border-t-[10px] z-[70] shadow-[0_-30px_100px_-20px_rgba(0,0,0,0.2)]">
        <div className="max-w-5xl mx-auto flex justify-between gap-16">
          <Button variant="outline" className="flex-1 h-28 font-black text-4xl rounded-[50px] uppercase border-[8px] hover:bg-slate-50 tracking-widest italic" onClick={() => { const i = Math.max(0, currentQuestionIndex - 1); setCurrentQuestionIndex(i); saveProgress(i); }} disabled={currentQuestionIndex === 0}>
            <ChevronLeft className="mr-8 h-12 w-12" /> PRÉCÉDENT
          </Button>
          <Button className="flex-1 h-28 font-black text-4xl rounded-[50px] shadow-3xl uppercase bg-primary text-white hover:scale-[1.01] transition-transform tracking-widest italic" onClick={() => { const i = Math.min(examQuestions.length - 1, currentQuestionIndex + 1); setCurrentQuestionIndex(i); saveProgress(i); }} disabled={currentQuestionIndex === examQuestions.length - 1}>
            SUIVANT <ChevronRight className="mr-8 h-12 w-12" />
          </Button>
        </div>
      </div>
    </div>
  );
}
