
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, setDoc, deleteDoc, serverTimestamp, getDocs, addDoc, increment } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Clock, ChevronRight, ChevronLeft, Loader2, PlayCircle, Info, Pause } from 'lucide-react';
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
        toast({ variant: "destructive", title: "Erreur", description: "Pas de questions disponibles dans cet examen." });
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
        const duration = selected.length * 72; // 1.2 min par question
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
      toast({ variant: "destructive", title: "Erreur" });
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
      toast({ variant: "destructive", title: "Erreur lors de la sauvegarde du score." });
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
      <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-2xl bg-white border-none overflow-hidden rounded-3xl">
          <CardHeader className="text-center py-16 bg-muted/20">
            <h1 className="text-8xl font-light text-slate-800 tracking-[0.2em] uppercase">Pause</h1>
            <p className="text-xl text-slate-500 mt-6 font-medium">Simulation PMP® suspendue</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 p-16 bg-white">
            <Button className="h-20 text-2xl font-black bg-[#635BFF] hover:bg-[#5249e0] rounded-2xl uppercase tracking-[0.1em]" onClick={() => setShowPauseScreen(false)}>CONTINUER</Button>
            <Button variant="outline" className="h-20 text-2xl font-black text-[#635BFF] border-[#635BFF] hover:bg-[#635BFF]/5 rounded-2xl uppercase tracking-[0.1em]" onClick={() => { saveProgress(); setIsExamStarted(false); setShowPauseScreen(false); }}>ARRETER ET SAUVEGARDER</Button>
            <Button variant="outline" className="h-20 text-2xl font-black text-red-500 border-red-500 hover:bg-red-50 rounded-2xl uppercase tracking-[0.1em]" onClick={() => { if(confirm("Souhaitez-vous vraiment arrêter et annuler cette session ?")) { setIsExamStarted(false); setSelectedExamId(null); setShowPauseScreen(false); } }}>ARRETER ET ANNULER</Button>
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
        <Card className="shadow-2xl overflow-hidden bg-white border-none rounded-3xl">
          <CardHeader className="border-b bg-muted/30 py-8"><CardTitle className="text-center font-black text-2xl uppercase tracking-widest text-primary italic">Rapport de Performance PMP®</CardTitle></CardHeader>
          <CardContent className="py-24">
            <div className="relative w-full max-w-3xl mx-auto px-4 mt-20">
              <div className="flex w-full text-[12px] font-black text-slate-400 uppercase mb-4 tracking-[0.2em]">
                <div className="w-[65%] text-center">Falling</div>
                <div className="w-[35%] text-center border-l-2 border-slate-300">Passing</div>
              </div>
              <div className="relative flex w-full h-24 rounded-2xl overflow-hidden border-2 shadow-inner bg-slate-100">
                {PERFORMANCE_ZONES.map((zone, idx) => (
                  <div key={idx} className={`${zone.color} border-r-2 border-white/40 flex items-center justify-center relative`} style={{ width: zone.width }}>
                    <span className="text-[11px] font-black text-white uppercase text-center px-1 leading-tight tracking-tighter drop-shadow-sm">{zone.label}</span>
                  </div>
                ))}
              </div>
              {/* Marker YOU */}
              <div className="absolute top-0 bottom-0 transition-all duration-1000 z-20" style={{ left: `${percentage}%`, transform: 'translateX(-50%)' }}>
                 <div className="absolute -top-20 flex flex-col items-center w-32 left-1/2 -translate-x-1/2">
                    <span className="text-[16px] font-black text-black mb-1 tracking-widest">YOU</span>
                    <div className="w-[3px] h-14 bg-black" />
                 </div>
                 <div className="absolute -bottom-28 flex flex-col items-center w-64 left-1/2 -translate-x-1/2">
                    <div className="w-[3px] h-14 bg-black mb-2" />
                    <span className="text-[26px] font-black text-[#006699] uppercase tracking-tight text-center drop-shadow-sm">{appreciation.label}</span>
                 </div>
              </div>
            </div>
            <div className="text-center space-y-4 pt-56">
              <p className="text-8xl font-black text-primary tracking-tighter drop-shadow-md">{percentage}%</p>
              <p className="text-2xl font-bold text-muted-foreground uppercase tracking-widest">{examResult.score} / {examResult.total} POINTS OBTENUS</p>
            </div>
          </CardContent>
          <CardFooter className="flex gap-6 p-10 border-t bg-muted/10">
            <Button variant="outline" className="flex-1 font-black h-16 text-xl rounded-2xl border-2 uppercase tracking-widest" onClick={() => { setIsReviewMode(true); setCurrentQuestionIndex(0); }}>REVOIR MES ERREURS</Button>
            <Button className="flex-1 font-black h-16 text-xl rounded-2xl bg-primary text-white shadow-xl uppercase tracking-widest" onClick={() => { setExamResult(null); setIsExamStarted(false); setSelectedExamId(null); }}>RETOUR DASHBOARD</Button>
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
      <div className="max-w-4xl mx-auto space-y-6 py-10">
        <Button variant="ghost" onClick={() => setIsReviewMode(false)} className="font-black text-primary uppercase tracking-widest mb-4 hover:bg-primary/5">
          <ChevronLeft className="mr-2" /> Retour aux résultats
        </Button>
        <Card className={`border-t-[12px] shadow-2xl rounded-3xl overflow-hidden ${isCorrect ? 'border-t-emerald-500' : 'border-t-red-500'}`}>
          <CardHeader className="bg-muted/5 p-10">
            <div className="flex justify-between items-center mb-6">
              <Badge variant={isCorrect ? "default" : "destructive"} className="px-6 py-2 text-sm font-black tracking-widest uppercase rounded-full">
                {isCorrect ? "CORRECT" : "ERREUR"}
              </Badge>
              <span className="text-sm font-black text-muted-foreground bg-white border px-4 py-2 rounded-full shadow-sm">
                QUESTION {currentQuestionIndex + 1} / {examQuestions.length}
              </span>
            </div>
            <CardTitle className="text-2xl leading-relaxed font-bold">{q.statement}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-10">
            <div className="grid gap-4">
              {q.options.map((opt: any, idx: number) => {
                const isSelected = uAns.includes(opt.id);
                const isCorrectOpt = q.correctOptionIds?.includes(opt.id);
                return (
                  <div key={opt.id} className={`p-6 rounded-2xl border-2 flex items-center gap-6 transition-all ${isCorrectOpt ? 'border-emerald-500 bg-emerald-50' : isSelected ? 'border-red-400 bg-red-50' : 'border-muted bg-white'}`}>
                    <div className={`h-11 w-11 rounded-full flex items-center justify-center font-black text-lg shrink-0 ${isCorrectOpt ? 'bg-emerald-500 text-white' : isSelected ? 'bg-red-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <div className="flex-1 font-semibold text-lg">{opt.text}</div>
                  </div>
                );
              })}
            </div>
            <div className="p-10 bg-primary/5 rounded-3xl border-l-[12px] border-l-primary mt-12 shadow-sm">
              <h4 className="font-black mb-6 text-primary flex items-center gap-3 text-lg uppercase tracking-widest">
                <Info className="h-6 w-6" /> EXPLICATION OFFICIELLE PMI
              </h4>
              <p className="whitespace-pre-wrap text-lg leading-relaxed text-slate-700 italic">{q.explanation || "Aucune explication détaillée n'a été fournie pour cette question."}</p>
            </div>
          </CardContent>
          <CardFooter className="justify-between p-10 border-t bg-muted/5">
            <Button variant="outline" size="lg" className="font-black px-10 rounded-2xl uppercase border-2" onClick={() => setCurrentQuestionIndex(p => Math.max(0, p - 1))} disabled={currentQuestionIndex === 0}>PRÉCÉDENT</Button>
            <Button variant="outline" size="lg" className="font-black px-10 rounded-2xl uppercase border-2" onClick={() => setCurrentQuestionIndex(p => Math.min(examQuestions.length - 1, p + 1))} disabled={currentQuestionIndex === examQuestions.length - 1}>SUIVANT</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!isExamStarted) {
    const EXAMS_LIST = [
      { id: 'exam1', title: 'Examen 1', desc: 'Simulation complète de 180 questions (Mindset PMP)' },
      { id: 'exam2', title: 'Examen 2', desc: 'Approches Agile et Hybride (Process & People)' },
      { id: 'exam3', title: 'Examen 3', desc: 'Domaines People & Business Environment' },
      { id: 'exam4', title: 'Examen 4', desc: 'Full Simulation PMP® Mode Officiel' },
      { id: 'exam5', title: 'Examen 5', desc: 'Questions critiques de niveau expert' },
    ];
    return (
      <div className="max-w-6xl mx-auto py-12 space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-6xl font-black text-primary uppercase italic tracking-tighter drop-shadow-sm">Simulateur PMP®</h1>
          <p className="text-xl text-muted-foreground font-medium">Sélectionnez une simulation pour commencer votre entraînement.</p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {EXAMS_LIST.map(exam => (
            <Card key={exam.id} className={`cursor-pointer border-t-[10px] transition-all hover:scale-[1.02] hover:shadow-2xl rounded-2xl ${selectedExamId === exam.id ? 'border-t-primary bg-primary/5 shadow-xl ring-2 ring-primary/20' : 'border-t-muted shadow-lg'}`} onClick={() => setSelectedExamId(exam.id)}>
              <CardHeader className="p-8">
                <CardTitle className="text-2xl font-black uppercase tracking-tight">{exam.title}</CardTitle>
                <p className="text-muted-foreground mt-4 font-medium leading-relaxed">{exam.desc}</p>
              </CardHeader>
              <CardFooter className="p-8 pt-0">
                <Button variant={selectedExamId === exam.id ? "default" : "outline"} className="w-full h-14 font-black text-lg rounded-xl uppercase tracking-widest">
                  {selectedExamId === exam.id ? "SÉLECTIONNÉ" : "SÉLECTIONNER"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        
        <div className="flex flex-col gap-6 items-center pt-8">
          {savedState && (
            <Button variant="outline" className="w-full max-w-2xl h-24 border-4 border-primary text-primary font-black text-2xl rounded-3xl hover:bg-primary/5 shadow-xl uppercase tracking-widest animate-pulse" onClick={() => startExam(true)}>
              REPRENDRE LA SESSION EN COURS
            </Button>
          )}
          <Button size="lg" className="w-full max-w-2xl h-28 text-4xl font-black bg-primary text-white uppercase shadow-2xl rounded-3xl hover:scale-[1.01] transition-transform tracking-widest" disabled={!selectedExamId || isSubmitting} onClick={() => startExam(false)}>
            {isSubmitting ? <Loader2 className="animate-spin mr-6 h-12 w-12" /> : <PlayCircle className="mr-6 h-12 w-12" />} LANCER L'EXAMEN
          </Button>
        </div>
      </div>
    );
  }

  const q = examQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / examQuestions.length) * 100;
  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-40 py-10 animate-fade-in">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl py-8 border-b-2 shadow-sm px-8 rounded-b-3xl">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-3xl font-mono px-8 py-3 bg-white border-2 shadow-sm rounded-2xl">
              Q-{currentQuestionIndex + 1} / {examQuestions.length}
            </Badge>
            <Button variant="ghost" size="icon" className="h-16 w-16 hover:bg-muted/80 rounded-2xl" onClick={() => setShowPauseScreen(true)}>
              <Pause className="h-8 w-8 text-slate-700" />
            </Button>
          </div>
          <div className="text-3xl font-black text-primary bg-primary/5 border-2 border-primary/20 px-10 py-3 rounded-2xl shadow-inner tabular-nums">
            {formatTime(timeLeft)}
          </div>
          <Button variant="destructive" size="lg" className="font-black h-16 px-14 uppercase shadow-xl rounded-2xl text-xl tracking-widest hover:scale-[1.02] transition-transform" onClick={() => { if(confirm("Êtes-vous sûr de vouloir soumettre l'examen maintenant ?")) finishExam(); }}>
            SOUMETTRE
          </Button>
        </div>
        <Progress value={progress} className="h-5 rounded-full bg-slate-100 border-2" />
      </div>

      <Card className="shadow-2xl border-t-[12px] border-t-primary bg-white p-14 min-h-[500px] rounded-[40px] overflow-hidden">
        <CardHeader className="pb-16"><CardTitle className="text-3xl leading-[1.6] font-bold text-slate-800">{q?.statement}</CardTitle></CardHeader>
        <CardContent className="space-y-8">
          <div className="grid gap-6">
            {q?.options.map((opt: any, idx: number) => {
              const isSelected = answers[q.id]?.includes(opt.id);
              return (
                <div key={opt.id} onClick={() => {
                  const current = answers[q.id] || [];
                  const newAns = q.isMultipleCorrect ? (isSelected ? current.filter(id => id !== opt.id) : [...current, opt.id]) : [opt.id];
                  const updated = { ...answers, [q.id]: newAns };
                  setAnswers(updated);
                  saveProgress(undefined, updated);
                }} className={`p-8 rounded-[32px] border-4 cursor-pointer transition-all flex items-start gap-8 ${isSelected ? 'border-primary bg-primary/5 ring-4 ring-primary/10' : 'border-muted hover:border-primary/40 bg-slate-50/30'}`}>
                  <div className={`h-14 w-14 rounded-full flex items-center justify-center font-black text-2xl shrink-0 shadow-md ${isSelected ? 'bg-primary text-white scale-110' : 'bg-white text-primary border-2'}`}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <div className={`flex-1 text-2xl pt-2 leading-relaxed ${isSelected ? 'font-black text-slate-900' : 'text-slate-700 font-semibold'}`}>{opt.text}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 p-12 bg-white/95 backdrop-blur-2xl border-t-4 z-40 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
        <div className="max-w-4xl mx-auto flex justify-between gap-10">
          <Button variant="outline" className="flex-1 h-20 font-black text-2xl rounded-3xl uppercase border-4 hover:bg-slate-50 tracking-widest" onClick={() => { const i = Math.max(0, currentQuestionIndex - 1); setCurrentQuestionIndex(i); saveProgress(i); }} disabled={currentQuestionIndex === 0}>
            <ChevronLeft className="mr-4 h-8 w-8" /> PRÉCÉDENT
          </Button>
          <Button className="flex-1 h-20 font-black text-2xl rounded-3xl shadow-2xl uppercase bg-primary text-white hover:scale-[1.01] transition-transform tracking-widest" onClick={() => { const i = Math.min(examQuestions.length - 1, currentQuestionIndex + 1); setCurrentQuestionIndex(i); saveProgress(i); }} disabled={currentQuestionIndex === examQuestions.length - 1}>
            SUIVANT <ChevronRight className="ml-4 h-8 w-8" />
          </Button>
        </div>
      </div>
    </div>
  );
}
